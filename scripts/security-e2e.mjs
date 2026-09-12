#!/usr/bin/env node
/** Isolated HTTP/security integration. No existing application data is modified. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import net from 'node:net';
import certificates from '../src/core/certificates.cjs';
import transport from '../src/core/transport.cjs';
import settingsFile from '../src/core/httpsConfig.cjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback;
const root = path.resolve(option('--project', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const port = Number(option('--port', '17911'));
const type = option('--database', 'sqlite');
if (!['sqlite', 'mariadb'].includes(type)) throw new Error('Use sqlite or a disposable MariaDB instance');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-security-e2e-'));
const serviceMode = argv.includes('--service');
const useHttps = argv.includes('--https');
if (serviceMode && !useHttps) throw new Error('Service integration requires --https');
const certificate = useHttps ? await certificates.generateCertificate({ baseDir: temporary }) : null;
const prepared = transport.prepareTls(certificate?.settings || {});
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const edition = pkg.aidotEdition || 'full';
let initial = argv.includes('--default-password') ? 'admin1234' : `Initial-${crypto.randomBytes(12).toString('hex')}`;
const changed = `Changed-${crypto.randomBytes(12).toString('hex')}`;
const schema = `aidot_test_${crypto.randomBytes(6).toString('hex')}`;
const values = {
  NODE_ENV: argv.includes('--bootstrap-file') || useHttps ? 'production' : 'development',
  HTTPS_ENABLED: 'false', ...(serviceMode ? { AIDOT_DATA_DIR: temporary } : { ELECTRON_USER_DATA: temporary }), HOST: '127.0.0.1', PORT: port, CONTROL_PORT: port + 1,
  CONTROL_HOST: '127.0.0.1', CONTROL_ENABLED: 'true', SUPERVISOR_WATCHDOG: 'false',
  DB_TYPE: type, DB_FILE: path.join(temporary, 'test.sqlite'), DB_DATABASE: schema,
  DB_HOST: '127.0.0.1', DB_PORT: process.env.TEST_DB_PORT || 13306,
  DB_USER: process.env.TEST_DB_USER || 'root', DB_PASSWORD: process.env.TEST_DB_PASSWORD || '',
  DB_APP_SCHEMA: '', DB_SAMPLE_SCHEMA: '', DB_SAMPLE_SCHEMA_SEPARATE: 'false', DB_AUTO_CREATE_DATABASE: 'true', DB_SAMPLES: 'false',
  APP_WORKSPACE: path.join(temporary, 'workspace'), LOG_DIR: path.join(temporary, 'log'),
  AUTH_ACCESS_SECRET: crypto.randomBytes(48).toString('hex'), AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_SAMESITE: 'lax', AUTH_SIGNUP_OPEN: 'true', ADMIN_SIGNUP_OPEN: 'false',
  ADMIN_INITIAL_USERNAME: 'admin', ADMIN_INITIAL_PASSWORD: argv.includes('--bootstrap-file') ? '' : initial,
  CORS_ORIGIN: '', TRUST_PROXY: 'false', RATE_LIMIT_ENABLED: 'true',
  RATE_LIMIT_MAX: 5000, AUTH_RATE_LIMIT_MAX: 1000, BODY_LIMIT: '1mb',
  HA_ENABLED: 'false', HA_MODE: 'standalone', MCI_ENABLED: 'false',
  EAI_ENABLED: edition === 'public' ? 'true' : 'false', SECURE_ENABLED: 'false',
  FEATURE_BACKUP: 'true', FEATURE_HA: 'true', FEATURE_SECURE_COLUMNS: 'true',
};
if (Object.values(values).some((value) => /[\r\n\0]/.test(String(value)))) throw new Error('Multiline test configuration is not supported');
const envFile = path.join(temporary, '.env');
fs.writeFileSync(envFile, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(String(value))}`).join('\n'));
if (useHttps) settingsFile.saveTlsSettings(envFile, certificate.settings);
const output = fs.openSync(path.join(temporary, 'server.log'), 'w');
const child = spawn(process.execPath, serviceMode ? ['scripts/server/run.mjs', '--data-dir', temporary] : ['--import', './src/loader/register.mjs', 'src/supervisor.js'], {
  cwd: root, env: { ...process.env, AIDOT_ENV_FILE: envFile }, stdio: ['ignore', output, output, 'ipc'],
});
fs.closeSync(output);
const base = `${prepared.protocol}://127.0.0.1:${port}`;
const control = `${prepared.protocol}://127.0.0.1:${port + 1}`;
const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(route, { method = 'GET', token, cookie, body, headers = {}, controlApi = false } = {}) {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const response = await new Promise((resolve, reject) => {
    const req = transport.localRequest(prepared, {
      port: controlApi ? port + 1 : port, path: route, method, timeout: 15000,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}),
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}), ...headers },
    }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: new Headers(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])), text: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('Request timed out'))); req.end(payload);
  });
  let data; try { data = JSON.parse(response.text); } catch { data = null; }
  return { status: response.status, body: data, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers, bytes: response.text.length };

}
async function expectStatus(label, route, expected, options = {}) {
  const response = await request(route, options);
  assert.equal(response.status, expected, `${label}: ${route}`);
  results.push({ check: label, status: 'passed' });
  return response;
}
async function login(username = 'admin', password = changed) {
  const response = await expectStatus('login', '/api/admin/auth/login', 200, { method: 'POST', body: { username, password } });
  assert.ok(response.body?.data?.accessToken && response.cookie);
  if (useHttps) assert.match(response.headers.get('set-cookie'), /; Secure/i, 'HTTPS authentication cookies must be Secure');
  return { token: response.body.data.accessToken, cookie: response.cookie, user: response.body.data.user };
}
async function ready() {
  for (let i = 0; i < 160; i++) {
    if (child.exitCode !== null) throw new Error(`Server exited; inspect ${temporary}/server.log`);
    try { if ((await request('/health/live')).status === 200) return; } catch {}
    await sleep(200);
  }
  throw new Error(`Server startup timed out; inspect ${temporary}/server.log`);
}
try {
  await ready();
  if (argv.includes('--bootstrap-file')) {
    initial = JSON.parse(fs.readFileSync(path.join(temporary, 'initial-admin-credentials.json'), 'utf8')).password;
    assert.ok(initial.length >= 20);
    assert.equal(fs.readFileSync(path.join(temporary, 'server.log'), 'utf8').includes(initial), false, 'initial password is not logged');
    results.push({ check: 'production bootstrap credentials are local and absent from logs', status: 'passed' });
  }
  await expectStatus('compiled console is served', '/', 200);
  const marker = await expectStatus('edition marker is served', '/aidot-edition.json', 200);
  assert.equal(marker.body?.edition, edition);
  assert.equal(marker.body?.version, pkg.version, 'compiled console version matches the server');
  await expectStatus('anonymous administration denied', '/api/admin/users/paged', 401);
  await expectStatus('cross-origin login rejected', '/api/admin/auth/login', 403, { method: 'POST', headers: { Origin: 'https://attacker.invalid' }, body: { username: 'admin', password: initial } });
  const bootstrap = await login('admin', initial);
  assert.equal(bootstrap.user.mustChangePassword, true);
  await expectStatus('bootstrap identity is readable', '/api/admin/auth/me', 200, bootstrap);
  await expectStatus('initial password permits authorized console operation', '/api/admin/users/paged', 200, bootstrap);
  await expectStatus('initial password permits authorized control status', '/api/control/status', 200, { ...bootstrap, controlApi: true });
  await expectStatus('initial password permits monitoring', '/api/admin/metrics/current', 200, bootstrap);
  await expectStatus('initial password permits SSE ticket', '/api/admin/sse/ticket', 200, { ...bootstrap, method: 'POST' });
  const beforeInitialRestart = await request('/api/control/status', { ...bootstrap, controlApi: true });
  const previousPid = beforeInitialRestart.body.data.pid;
  await expectStatus('initial password permits worker restart', '/api/control/restart', 200, { ...bootstrap, controlApi: true, method: 'POST' });
  await ready();
  const afterInitialRestart = await expectStatus('initial password permits control after worker restart', '/api/control/status', 200, { ...bootstrap, controlApi: true });
  assert.ok(previousPid && afterInitialRestart.body.data.pid && previousPid !== afterInitialRestart.body.data.pid, 'worker process actually changed');
  await expectStatus('initial password session survives worker restart', '/api/admin/auth/me', 200, bootstrap);
  const restartedBootstrap = await login('admin', initial);
  assert.equal(restartedBootstrap.user.mustChangePassword, true, 'restart retains the advisory warning');
  await expectStatus('initial password permits monitoring after worker restart', '/api/admin/metrics/current', 200, bootstrap);
  await expectStatus('initial password permits SSE ticket after worker restart', '/api/admin/sse/ticket', 200, { ...bootstrap, method: 'POST' });
  await expectStatus('initial password change', '/api/admin/users/me/password', 200, { ...bootstrap, method: 'PUT', body: { currentPassword: initial, newPassword: changed } });
  await expectStatus('old access token rejected after password change', '/api/admin/auth/me', 401, bootstrap);
  await expectStatus('old refresh token rejected after password change', '/api/admin/auth/refresh', 401, { ...bootstrap, method: 'POST' });
  let admin = await login();
  assert.equal(admin.user.mustChangePassword, false);
  await expectStatus('Windows framework workspace path denied', '/api/admin/config/workspace', 400, { ...admin, method: 'PUT', body: { dir: 'src\\controller' } });
  await expectStatus('workspace environment injection denied', '/api/admin/config/workspace', 400, { ...admin, method: 'PUT', body: { dir: 'workspace\nAUTH_SIGNUP_OPEN=true' } });
  await expectStatus('administrator can read account list', '/api/admin/users/paged', 200, admin);
  await expectStatus('separate control process verifies current account', '/api/control/status', 200, { ...admin, controlApi: true });
  await expectStatus('cross-origin control action denied', '/api/control/stop', 403, { ...admin, controlApi: true, method: 'POST', headers: { Origin: 'https://attacker.invalid' } });
  const created = await expectStatus('create limited console account', '/api/admin/users', 200, { ...admin, method: 'POST', body: { name: 'Security fixture', username: 'reviewer', email: 'reviewer@example.invalid', password: changed, role: 'user' } });
  const id = created.body.data.id;
  assert.ok(id);
  const limited = await login('reviewer');
  await expectStatus('limited account cannot change HTTPS settings', '/api/admin/config/https', 403, { ...limited, method: 'PUT', body: { enabled: false } });
  await expectStatus('limited account cannot generate certificates', '/api/admin/config/https/certificate', 403, { ...limited, method: 'POST', body: {} });
  await expectStatus('limited account cannot administer users', '/api/admin/users/paged', 403, limited);
  await expectStatus('limited account cannot execute SQL', '/api/admin/sqls/test', 403, { ...limited, method: 'POST', body: { sqlBody: 'SELECT 1' } });
  await expectStatus('limited account cannot control process', '/api/control/status', 403, { ...limited, controlApi: true });
  await expectStatus('disable account', `/api/admin/users/${id}`, 200, { ...admin, method: 'PUT', body: { name: 'Security fixture', email: 'reviewer@example.invalid', role: 'user', status: 'disabled' } });
  await expectStatus('disabled account access denied immediately', '/api/admin/auth/me', 401, limited);
  await expectStatus('disabled account refresh denied', '/api/admin/auth/refresh', 401, { ...limited, method: 'POST' });
  const rotation = await login();
  const rotated = await Promise.all(Array.from({ length: 12 }, () => request('/api/admin/auth/refresh', { method: 'POST', cookie: rotation.cookie })));
  assert.equal(rotated.filter((item) => item.status === 200).length, 1, 'one refresh successor');
  assert.equal(rotated.filter((item) => item.status === 401).length, 11, 'eleven replay rejections');
  results.push({ check: '12 concurrent refresh requests yield one successor', status: 'passed' });
  await expectStatus('replay commits successor-family revocation', '/api/admin/auth/refresh', 401, { method: 'POST', cookie: rotated.find((item) => item.status === 200).cookie });
  admin = await login();
  const features = await expectStatus('feature policy', '/api/admin/system/features', 200, admin);
  if (edition === 'public') {
    for (const key of ['backup', 'secureColumns', 'ha']) assert.equal(features.body.data[key], false);
    await expectStatus('public edition cannot enable Enterprise features', '/api/admin/system/features', 403, { ...admin, method: 'PUT', body: { ha: true } });
    await expectStatus('public edition cannot enable EAI', '/api/admin/config/eai', 403, { ...admin, method: 'PUT', body: { enabled: true } });
    for (const route of ['/api/admin/ha/status', '/api/admin/backup/download', '/api/admin/secure/policies', '/api/admin/mci/controllers']) {
      await expectStatus('Enterprise API absent', route, 404, admin);
    }
  }
  await expectStatus('application signup', '/api/auth/signup', 201, { method: 'POST', body: { requestCode: 'signup-test', name: 'User fixture', username: 'appuser', email: 'appuser@example.invalid', password: changed } });
  const userLogin = await expectStatus('application login', '/api/auth/login', 200, { method: 'POST', body: { requestCode: 'login-test', username: 'appuser', password: changed } });
  const appUser = { token: userLogin.body.data.accessToken, cookie: userLogin.cookie };
  await expectStatus('application identity', '/api/auth/me', 200, appUser);
  await expectStatus('application realm cannot use console', '/api/admin/auth/me', 403, appUser);
  const userRefresh = await Promise.all(Array.from({ length: 12 }, () => request('/api/auth/refresh', { method: 'POST', cookie: appUser.cookie })));
  assert.equal(userRefresh.filter((item) => item.status === 200).length, 1);
  assert.equal(userRefresh.filter((item) => item.status === 401).length, 11);
  results.push({ check: 'application realm: 12 concurrent refresh requests', status: 'passed' });
  await expectStatus('application replay family revoked', '/api/auth/refresh', 401, { method: 'POST', cookie: userRefresh.find((item) => item.status === 200).cookie });
  await expectStatus('application global logout', '/api/auth/logout-all', 200, { ...appUser, method: 'POST' });
  await expectStatus('application access revoked', '/api/auth/me', 401, appUser);
  const parallel = await Promise.all(Array.from({ length: 60 }, () => request('/api/admin/auth/me', admin)));
  assert.ok(parallel.every((item) => item.status === 200), 'authenticated concurrent requests');
  results.push({ check: '60 concurrent account-state checks', status: 'passed' });
  await expectStatus('persistent global logout', '/api/admin/auth/logout-all', 200, { ...admin, method: 'POST' });
  await expectStatus('global logout denies main process', '/api/admin/auth/me', 401, admin);
  await expectStatus('global logout denies control process', '/api/control/status', 401, { ...admin, controlApi: true });
  if (argv.includes('--bootstrap-file')) assert.equal(fs.existsSync(path.join(temporary, 'initial-admin-credentials.json')), false, 'initial credential removed after password change');
  const current = await login();
  if (useHttps) {
    const state = await expectStatus('HTTPS settings are available', '/api/admin/config/https', 200, current);
    assert.equal(state.body.data.active.protocol, 'https');
    assert.equal(state.body.data.restartRequired, false);
    assert.equal(Object.hasOwn(state.body.data.configured, 'passphrase'), false);
    await expectStatus('Control accepts HTTPS console origin', '/api/control/status', 200, { ...current, controlApi: true, headers: { Origin: base } });
    const before = fs.readFileSync(envFile);
    await expectStatus('invalid HTTPS key is rejected before writing', '/api/admin/config/https', 400, { ...current, method: 'PUT', body: { enabled: true, keyFile: 'missing.key' } });
    assert.deepEqual(fs.readFileSync(envFile), before);
    const ca = await expectStatus('only public CA material can be downloaded', '/api/admin/config/https/ca', 200, current);
    assert.match(ca.body.data.pem, /BEGIN CERTIFICATE/); assert.doesNotMatch(ca.body.data.pem, /PRIVATE KEY/);
    await expectStatus('invalid SAN input is rejected', '/api/admin/config/https/certificate', 400, { ...current, method: 'POST', body: { hosts: 'https://example.test' } });
    await expectStatus(serviceMode ? 'Service cannot disable HTTPS' : 'HTTPS change is saved for complete restart', '/api/admin/config/https', serviceMode ? 400 : 200, { ...current, method: 'PUT', body: { enabled: false } });
    const pending = await request('/api/admin/config/https', current);
    assert.equal(pending.body.data.restartRequired, !serviceMode); assert.equal(pending.body.data.active.enabled, true);
  }
  await expectStatus('restart main process', '/api/control/restart', 200, { ...current, controlApi: true, method: 'POST' });
  await ready();
  await expectStatus('revocation survives restart', '/api/admin/auth/me', 401, admin);
  await expectStatus('current session survives orderly restart', '/api/admin/auth/me', 200, current);
  if (useHttps) {
    const active = await expectStatus('worker restart preserves HTTPS on both listeners', '/api/admin/config/transport', 200, current);
    assert.equal(active.body.data.protocol, 'https');
  }
  const crashed = argv.includes('--crash-supervisor');
  const exited = new Promise((resolve) => child.once('exit', resolve));
  if (crashed) child.kill('SIGKILL');
  else child.send({ type: 'aidot:shutdown' });
  await Promise.race([exited, sleep(12000)]);
  assert.ok(child.exitCode !== null || child.signalCode !== null, 'supervisor exits');
  if (!crashed) assert.equal(child.exitCode, 0, 'graceful supervisor exit');
  const portClosed = (value) => new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: value });
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', (error) => resolve(error.code === 'ECONNREFUSED'));
    socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
  });
  let closed = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if ((await Promise.all([portClosed(port), portClosed(port + 1)])).every(Boolean)) { closed = true; break; }
    await sleep(100);
  }
  assert.ok(closed, 'main and control listeners close without orphaned servers');
  // A killed supervisor cannot forward the child's final stdout into this log.
  if (!crashed) assert.match(fs.readFileSync(path.join(temporary, 'server.log'), 'utf8'), /PARENT_REQUEST/);
  results.push({ check: crashed ? 'supervisor crash closes orphaned main server' : 'IPC shutdown closes main and control servers', status: 'passed' });
  console.log(JSON.stringify({ edition, protocol: prepared.protocol, database: type, version: pkg.version, checks: results.length, results }, null, 2));
} catch (error) {
  console.error(`${error.message}\nDiagnostic log: ${temporary}/server.log`);
  process.exitCode = 1;
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    if (child.connected) child.send({ type: 'aidot:shutdown' }, () => {});
    else child.kill('SIGTERM');
    await Promise.race([exited, sleep(12000)]);
  }
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  if (type === 'mariadb') {
    try {
    const { createRequire } = await import('node:module');
    const mariadb = createRequire(path.join(root, 'package.json'))('mariadb');
    const connection = await mariadb.createConnection({ host: '127.0.0.1', port: Number(values.DB_PORT), user: values.DB_USER, password: values.DB_PASSWORD });
    try { await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``); } finally { await connection.end(); }
    } catch { console.error('Temporary MariaDB schema cleanup requires attention: ' + schema); process.exitCode = 1; }
  }
  if (!process.exitCode) fs.rmSync(temporary, { recursive: true, force: true });
}
