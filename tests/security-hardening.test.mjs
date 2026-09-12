import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import express from 'express';
import Database from 'better-sqlite3';
import { hasPollutionKey, pollutionGuard } from '../src/core/security.js';
import { originPolicy, canonicalOrigin } from '../src/core/originPolicy.js';
import { validateServerLimits, configureHttpServer } from '../src/core/httpLimits.js';
import { uploadHeaders } from '../src/core/uploadHeaders.js';
import { redactUrl } from '../src/core/logRedaction.js';
import { assertCurrentAccount } from '../src/core/accountState.js';
import { rotateToken, retryRefreshConflict } from '../src/core/refreshRotation.js';
import { createRefreshToken } from '../src/core/tokens.js';
import { sqliteExecute, sqliteTransaction } from '../src/database/sqlite-adapter.js';
import { registerSqliteFunctions } from '../src/database/sqlite-dialect.js';
import sqlRegistry from '../src/core/sqlLoader.js';
import { validateArchiveEntries, assertRestorePath } from '../src/core/archiveSafety.js';
import { globRegex, publicEntries, forbiddenLocalPath } from '../scripts/publish/policy.mjs';
const require = createRequire(import.meta.url);
const { sameOrigin, trustedSender, validateSetup, envLine } = require('../electron/security.cjs');
const dotenv = require('dotenv');

test('nested prototype keys and over-depth input fail closed', () => {
  assert.equal(hasPollutionKey(JSON.parse('{"__proto__":{"polluted":true}}')), true);
  assert.equal(hasPollutionKey({ normal: { constructor: { prototype: { bad: true } } } }), true);
  let input = { value: 1 };
  for (let i = 0; i < 22; i++) input = { nested: input };
  assert.equal(hasPollutionKey(input), true);
  assert.equal(hasPollutionKey({ rows: [{ name: '정상', values: [1, 2, 3] }] }), false);
  assert.equal({}.polluted, undefined);
});

test('origin rejection happens before handlers, including CSRF form requests', async (t) => {
  let calls = 0;
  const app = express();
  app.use(originPolicy({ server: { allowedHosts: ['127.0.0.1'] }, cors: { origin: ['https://trusted.example'], credentials: true } }));
  app.use(express.json());
  app.use(pollutionGuard());
  app.post('/write', (_req, res) => { calls++; res.json({ ok: true }); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const origin of ['https://evil.example', 'null', 'https://trusted.example.evil.invalid']) {
    const response = await fetch(base + '/write', { method: 'POST', headers: { Origin: origin } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  assert.equal(calls, 0);
  const http = await import('node:http');
  const invalidHost = await new Promise((resolve, reject) => {
    const request = http.request(base + '/write', { method: 'POST', headers: { Host: 'rebinding.invalid' } }, (response) => {
      response.resume(); response.once('end', () => resolve(response.statusCode));
    });
    request.on('error', reject); request.end();
  });
  assert.equal(invalidHost, 403);
  for (const origin of [base, 'https://trusted.example']) {
    const response = await fetch(base + '/write', { method: 'POST', headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  }
  assert.equal((await fetch(base + '/write', { method: 'POST' })).status, 200);
  const denied = await fetch(base + '/write', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"constructor":{"prototype":{"x":1}}}' });
  assert.equal(denied.status, 400);
  assert.equal(calls, 3);
});

test('reflective origins, paths and embedded credentials are rejected', () => {
  assert.throws(() => originPolicy({ cors: { origin: true } }));
  for (const input of ['null', 'file:///tmp/a', 'https://user:pass@trusted.example', 'https://trusted.example/path']) assert.equal(canonicalOrigin(input), null);
  assert.equal(canonicalOrigin('https://trusted.example:443'), 'https://trusted.example');
});

test('timeouts preserve streaming and malformed body limits fail startup', () => {
  const limits = { bodyLimit: '10mb', headersTimeoutMs: 15000, requestTimeoutMs: 120000, keepAliveTimeoutMs: 5000, maxRequestsPerSocket: 1000 };
  validateServerLimits(limits);
  for (const bodyLimit of ['unlimited', 'NaN', '0', '-1mb', 'Infinity']) assert.throws(() => validateServerLimits({ ...limits, bodyLimit }));
  assert.throws(() => validateServerLimits({ ...limits, headersTimeoutMs: 200000 }));
  const server = { timeout: 0 };
  configureHttpServer(server, limits);
  assert.equal(server.timeout, 0);
  assert.equal(server.headersTimeout, 15000);
});

test('encoded credentials and SSE tickets are removed from logged URLs', () => {
  const output = redactUrl('/events?%74icket=secret-one&access_token=secret-two&password=secret-three&q=normal');
  assert.doesNotMatch(output, /secret-(one|two|three)/);
  assert.match(output, /q=normal/);
});

test('IPC checks window identity, main frame, scheme, host and exact port', () => {
  const frame = { url: 'http://127.0.0.1:7901/controllers' };
  const contents = { mainFrame: frame };
  const win = { isDestroyed: () => false, webContents: contents };
  const event = { sender: contents, senderFrame: frame };
  assert.equal(trustedSender(event, win, 'http://127.0.0.1:7901/'), true);
  assert.equal(trustedSender({ ...event, sender: {} }, win, 'http://127.0.0.1:7901/'), false);
  assert.equal(trustedSender({ ...event, senderFrame: { ...frame } }, win, 'http://127.0.0.1:7901/'), false);
  for (const url of ['http://127.0.0.1:7902/', 'http://127.0.0.1.evil.invalid:7901/', 'data:text/html,hello', 'http://user@127.0.0.1:7901/']) assert.equal(sameOrigin(url, 'http://127.0.0.1:7901/'), false);
});

test('setup values cannot inject environment lines and special passwords round trip', () => {
  assert.throws(() => validateSetup({ type: 'mariadb', password: 'ok\nAUTH_SIGNUP_OPEN=true' }));
  assert.throws(() => validateSetup({ type: 'sqlite', serverPort: '70000' }));
  for (const password of ['abc#def', 'a b c', 'cash$&word', 'quote"word', "quote'word", 'C:\\new\\path']) {
    assert.equal(dotenv.parse(envLine('DB_PASSWORD', password)).DB_PASSWORD, password);
  }
});

test('persistent account version blocks old tokens independently of process memory', async () => {
  const db = new Database(':memory:');
  try {
    db.exec("CREATE TABLE admin_users (id INTEGER PRIMARY KEY, role TEXT, status TEXT, token_version INTEGER, must_change_password INTEGER); INSERT INTO admin_users VALUES (1, 'admin', 'active', 0, 0)");
    const executor = { execute: (sql, params) => sqliteExecute(db, sql, params) };
    const user = { id: 1, role: 'admin', realm: 'admin', ver: 0 };
    await assertCurrentAccount(user, { executor });
    db.exec('UPDATE admin_users SET token_version=1');
    await assert.rejects(assertCurrentAccount(user, { executor }), { status: 401 });
    await assertCurrentAccount({ ...user, ver: 1 }, { executor });
    db.exec('UPDATE admin_users SET must_change_password=1');
    for (const [method, path] of [
      ['GET', '/api/admin/metrics/current'], ['POST', '/api/admin/sse/ticket'],
      ['GET', '/api/admin/users/paged'], ['POST', '/api/admin/sqls/test'],
      ['GET', '/api/control/status'],
    ]) {
      const account = await assertCurrentAccount({ ...user, ver: 1 }, { executor, method, path });
      assert.equal(Number(account.must_change_password), 1, 'initial-password warning does not deny an authorized account');
    }
    await assertCurrentAccount({ ...user, ver: 1 }, { executor, method: 'PUT', path: '/api/admin/users/me/password' });
    db.exec("UPDATE admin_users SET status='disabled'");
    await assert.rejects(assertCurrentAccount({ ...user, ver: 1 }, { executor }), { status: 401 });
  } finally { db.close(); }
});

for (const realm of ['admin', 'user']) test(`${realm}: concurrent refresh admits only one successor and commits replay revocation`, async () => {
  const handle = new Database(':memory:');
  registerSqliteFunctions(handle);
  const table = realm === 'admin' ? 'admin_refresh_tokens' : 'refresh_tokens';
  handle.exec(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, token_hash TEXT, family_id TEXT, user_agent TEXT, ip_address TEXT, expires_at TEXT, revoked_at TEXT, replaced_by_id INTEGER, token_version INTEGER DEFAULT 0)`);
  const db = { execute: (sql, params) => sqliteExecute(handle, sql, params), transaction: (fn) => sqliteTransaction(handle, fn) };
  const file = realm === 'admin' ? 'lib/admin/database/sql/admin_auth.sql' : 'src/database/sql/auth.sql';
  const name = `rotation_test_${realm}`;
  sqlRegistry.registerFile(name, fs.readFileSync(file, 'utf8'));
  const sql = sqlRegistry.getFile(name);
  try {
    const original = createRefreshToken();
    await db.execute(sql.get('insertRefreshToken'), { user_id: 1, token_version: 0, token_hash: original.tokenHash, family_id: 'test-family', user_agent: null, ip_address: null, expires_at: original.expiresAt });
    const previous = { id: 1, family_id: 'test-family' };
    const user = { id: 1, role: 'admin', token_version: 0, username: 'fixture' };
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => rotateToken(db, sql, previous, user, {}, realm)));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.status === 401).length, 11);
    assert.equal(handle.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 2);
    assert.equal(handle.prepare(`SELECT count(*) AS n FROM ${table} WHERE revoked_at IS NULL`).get().n, 0);
  } finally { handle.close(); }
});

test('archive limits, duplicate paths and symlinks are rejected before extraction', () => {
  const entry = (entryName, size = 1, attr = 0) => ({ entryName, header: { size, attr } });
  validateArchiveEntries([entry('src/controller/A.js')]);
  for (const entries of [[entry('../escape.js')], [entry('C:/escape.js')], [entry('a.js', 17 * 1024 * 1024)], [entry('a.js', 1, 0o120777 << 16)], [entry('A.js'), entry('a.js')]]) assert.throws(() => validateArchiveEntries(entries));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-restore-'));
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-outside-'));
  try {
    fs.symlinkSync(other, path.join(root, 'linked'), 'junction');
    assert.throws(() => assertRestorePath(root, path.join(root, 'linked/file.js')));
    assertRestorePath(root, path.join(root, 'new/file.js'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(other, { recursive: true, force: true }); }
});

test('public policy treats **/ as zero or more directories and blocks shadow backups', () => {
  assert.equal(globRegex('**/.env').test('.env'), true);
  assert.equal(globRegex('**/.env').test('a/b/.env'), true);
  assert.equal(globRegex('**/Ha{Page,Controller,Service}*').test('HaPage.vue'), true);
  assert.equal(forbiddenLocalPath('src/secure.__full/crypto.js'), true);
  const entries = publicEntries(process.cwd());
  assert.equal(entries.find((entry) => entry.destination === 'src/secure/crypto.js').source, 'stubs/src/secure/crypto.js');
});


test('refresh retries only rolled-back database conflicts and never arbitrary errors', async () => {
  let calls = 0;
  const result = await retryRefreshConflict(async () => {
    calls++;
    if (calls < 3) throw Object.assign(new Error('deadlock fixture'), { errno: 1213 });
    return 'committed';
  });
  assert.equal(result, 'committed'); assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(retryRefreshConflict(async () => { calls++; throw new Error('not retryable'); }));
  assert.equal(calls, 1);
});

test('desktop and source startup replace installer secrets once and preserve strong credentials', () => {
  const { ensureEnvSecret, isPlaceholderSecret } = require('../src/core/secretPolicy.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-secrets-'));
  const file = path.join(dir, '.env');
  try {
    fs.writeFileSync(file, 'DB_PASSWORD="value#with-digits123"\nAUTH_ACCESS_SECRET=CHANGE_ME_to_a_strong_random_secret_of_at_least_32_chars_please\n');
    assert.equal(ensureEnvSecret(file), 'replaced');
    const first = dotenv.parse(fs.readFileSync(file));
    assert.equal(isPlaceholderSecret(first.AUTH_ACCESS_SECRET), false);
    assert.equal(first.DB_PASSWORD, 'value#with-digits123');
    assert.equal(ensureEnvSecret(file), null);
    assert.equal(dotenv.parse(fs.readFileSync(file)).AUTH_ACCESS_SECRET, first.AUTH_ACCESS_SECRET);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test('custom loader preserves CommonJS modules containing optional chaining', async () => {
  const { execFileSync } = await import('node:child_process');
  const { pathToFileURL } = await import('node:url');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-cjs-'));
  try {
    const file = path.join(dir, 'fixture.cjs');
    fs.writeFileSync(file, 'module.exports = { value: ({ nested: 42 })?.nested };');
    const code = `import value from ${JSON.stringify(pathToFileURL(file).href)}; if (value.value !== 42) process.exit(1);`;
    execFileSync(process.execPath, ['--import', './src/loader/register.mjs', '--input-type=module', '-e', code], { cwd: process.cwd(), stdio: 'pipe' });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test('uploaded active content is isolated at both public URL aliases', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-upload-'));
  fs.mkdirSync(path.join(directory, 'uploads'));
  fs.writeFileSync(path.join(directory, 'uploads', 'document.html'), '<script>window.fixture=true</script>');
  const app = express();
  app.use('/uploads', express.static(path.join(directory, 'uploads'), { setHeaders: uploadHeaders(directory) }));
  app.use('/public', express.static(directory, { setHeaders: uploadHeaders(directory) }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); });
  for (const route of ['/uploads/document.html', '/public/uploads/document.html']) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-disposition'), 'attachment');
    assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; sandbox");
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    await response.text();
  }
});

test('Electron attaches only to an explicitly selected valid service port', async () => {
  const { parseAttachPort } = await import('../electron/security.cjs');
  assert.equal(parseAttachPort(undefined), null);
  assert.equal(parseAttachPort(''), null);
  assert.equal(parseAttachPort('17991'), 17991);
  for (const value of ['0', '-1', '65536', '7901\n', '7901junk', '1e3', 'https://localhost']) {
    assert.throws(() => parseAttachPort(value), /explicit valid port/);
  }
});
