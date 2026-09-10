import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import certificates from '../../src/core/certificates.cjs';
import envFiles from '../../src/core/httpsConfig.cjs';
import transport from '../../src/core/transport.cjs';

export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function absoluteDirectory(value) {
  if (!value || !path.isAbsolute(value) || /[\x00-\x1f%'"]/.test(value)) throw new Error('Use an absolute data directory without control characters or %');
  const resolved = path.resolve(value);
  if (resolved === path.parse(resolved).root) throw new Error('The filesystem root cannot be used as the data directory');
  for (let p = resolved; ; p = path.dirname(p)) {
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw new Error('Linked data directories are not supported');
    if (p === path.dirname(p)) break;
  }
  return resolved;
}
export function readServiceConfig(dataDirectory) {
  const dataDir = absoluteDirectory(dataDirectory);
  const envFile = path.join(dataDir, '.env');
  if (!fs.existsSync(envFile) || fs.lstatSync(envFile).isSymbolicLink() || !fs.statSync(envFile).isFile()) throw new Error('Configure the service first: ' + envFile);
  const env = envFiles.readEnv(envFile);
  const port = Number(env.PORT || 7901), controlPort = Number(env.CONTROL_PORT || 7902);
  if (![port, controlPort].every(p => Number.isInteger(p) && p > 0 && p < 65536) || port === controlPort) throw new Error('Main and control ports must be distinct integers from 1 to 65535');
  if (env.NODE_ENV !== 'production') throw new Error('Service mode requires NODE_ENV=production');
  if (!/^(true|1)$/i.test(env.HTTPS_ENABLED || '')) throw new Error('Service mode requires HTTPS_ENABLED=true');
  if ((env.AIDOT_DATA_DIR && path.resolve(env.AIDOT_DATA_DIR) !== dataDir) || (env.AIDOT_ENV_FILE && path.resolve(env.AIDOT_ENV_FILE) !== envFile)) throw new Error('The service data directory disagrees with .env');
  if (!env.AUTH_ACCESS_SECRET || env.AUTH_ACCESS_SECRET.length < 32) throw new Error('Configure a random AUTH_ACCESS_SECRET with at least 32 characters');
  const hostname = transport.hostname(env.HTTPS_SERVER_NAME || 'localhost');
  return { dataDir, envFile, env, port, controlPort, hostname, url: transport.urlFor('https', hostname, port) };
}
export async function configure({ dataDir, hosts = 'localhost,127.0.0.1,::1', port = 7901, controlPort = 7902, bind = '127.0.0.1', database = 'sqlite' }) {
  dataDir = absoluteDirectory(dataDir);
  const relative = path.relative(appRoot, dataDir);
  if (!relative || (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))) throw new Error('Keep service data outside the application directory');
  if (!['sqlite', 'mariadb'].includes(database)) throw new Error('Use --database sqlite or mariadb');
  if (![Number(port), Number(controlPort)].every(p => Number.isInteger(p) && p > 0 && p < 65536) || Number(port) === Number(controlPort)) throw new Error('Use distinct valid ports');
  transport.hostname(bind);
  certificates.normalizeHosts(hosts);
  if (fs.existsSync(dataDir) && fs.readdirSync(dataDir).length) throw new Error('Initialization requires an empty data directory; existing settings and data are preserved');
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  envFiles.protectPath(dataDir, true);
  for (const rel of ['log', 'workspace/controller', 'workspace/service', 'workspace/sql', 'workspace/scenarios']) fs.mkdirSync(path.join(dataDir, rel), { recursive: true, mode: 0o700 });
  const generated = await certificates.generateCertificate({ baseDir: dataDir, hosts });
  const env = {
    NODE_ENV: 'production', PORT: String(port), HOST: bind, CONTROL_PORT: String(controlPort), CONTROL_HOST: '127.0.0.1',
    CONTROL_ENABLED: 'true', AIDOT_DATA_DIR: dataDir, APP_WORKSPACE: path.join(dataDir, 'workspace'), LOG_DIR: path.join(dataDir, 'log'),
    DB_TYPE: database, DB_FILE: path.join(dataDir, 'app.db'), DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_USER: 'aidot', DB_PASSWORD: '',
    DB_DATABASE: 'aidot_express', DB_FALLBACK_TO_SQLITE: 'false', DB_SAMPLES: 'false',
    AUTH_ACCESS_SECRET: randomBytes(48).toString('hex'), AUTH_COOKIE_SECURE: 'true', AUTH_COOKIE_SAMESITE: 'lax',
    AUTH_SIGNUP_OPEN: 'false', ADMIN_SIGNUP_OPEN: 'false', ADMIN_INITIAL_USERNAME: 'admin', ADMIN_INITIAL_PASSWORD: '',
    CORS_ORIGIN: '', TRUST_PROXY: 'false', ALLOWED_HOSTS: [...new Set([...generated.hosts.map(h => isIP(h) === 6 ? '[' + h + ']' : h), 'localhost', '127.0.0.1', '[::1]'])].join(','),
    HA_ENABLED: 'false', HA_MODE: 'standalone', MCI_ENABLED: 'false', SECURE_ENABLED: 'false'
  };
  const envFile = path.join(dataDir, '.env');
  // JSON string syntax needs escaped backslashes decoded; dotenv single quotes preserve Windows paths.
  const quote = v => {
    if (/[\r\n\0']/.test(String(v))) throw new Error('Configuration values cannot contain newlines or single quotes');
    return "'" + v + "'";
  };
  fs.writeFileSync(envFile, Object.entries(env).map(([k,v]) => k + '=' + quote(v)).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  envFiles.protectPath(envFile);
  envFiles.saveTlsSettings(envFile, generated.settings);
  return { dataDir, envFile, url: transport.urlFor('https', generated.settings.serverName, port), caFile: generated.settings.caFile, database };
}
export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    'data-dir': { type: 'string' }, hosts: { type: 'string' }, port: { type: 'string' }, 'control-port': { type: 'string' },
    bind: { type: 'string' }, database: { type: 'string' }, check: { type: 'boolean' }
  } });
  if (values.check) {
    const cfg = readServiceConfig(values['data-dir']);
    const tls = transport.prepareTls(transport.tlsFromEnv(cfg.env), cfg.dataDir);
    console.log(JSON.stringify({ envFile: cfg.envFile, url: cfg.url, certificate: tls.certificate }, null, 2));
  } else {
    console.log(JSON.stringify(await configure({ dataDir: values['data-dir'], hosts: values.hosts, port: values.port, controlPort: values['control-port'], bind: values.bind, database: values.database }), null, 2));
    console.log('Trust only ca.crt on client devices. Edit .env for your database and network. Start the server, then read initial-admin-credentials.json locally and change the initial password.');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('Service configuration: ' + e.message); process.exitCode = 1; });
