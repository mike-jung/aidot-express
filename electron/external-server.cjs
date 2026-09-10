'use strict';

// A service client needs an address and public trust material, never a server key.
const fs = require('node:fs');
const path = require('node:path');
const { X509Certificate } = require('node:crypto');
const transport = require('../src/core/transport.cjs');
const { readEnv } = require('../src/core/httpsConfig.cjs');
const { parseAttachPort } = require('./security.cjs');

function publicCa(file, baseDir) {
  if (!file) return undefined;
  if (typeof file !== 'string' || /[\x00-\x1f\x7f]/.test(file)) throw new Error('Invalid AIDOT_SERVER_CA_FILE');
  const resolved = path.resolve(baseDir, file);
  const stat = fs.statSync(resolved);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('AIDOT_SERVER_CA_FILE must be a PEM certificate bundle smaller than 1 MiB');
  const pem = fs.readFileSync(resolved, 'utf8');
  if (/PRIVATE KEY/.test(pem)) throw new Error('AIDOT_SERVER_CA_FILE must contain public certificates only, never a private key');
  const certificates = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (!certificates?.length) throw new Error('AIDOT_SERVER_CA_FILE contains no PEM certificates');
  for (const certificate of certificates) new X509Certificate(certificate);
  return certificates; // Explicit trust is limited to this bundle; otherwise use Node's normal roots.
}
function prepareConnection(env = {}, baseDir = process.cwd()) {
  const raw = env.AIDOT_SERVER_URL;
  const legacyPort = parseAttachPort(env.AIDOT_SERVER_PORT);
  if (!raw && legacyPort === null) return null;
  let enabled, hostname, port, connectHost;
  if (raw) {
    if (typeof raw !== 'string' || /[\s\\\x00-\x1f\x7f]/.test(raw)) throw new Error('AIDOT_SERVER_URL must be an exact HTTPS origin');
    let url; try { url = new URL(raw); } catch { throw new Error('Invalid AIDOT_SERVER_URL'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('AIDOT_SERVER_URL must be https://host[:port] without credentials, path, query or fragment');
    }
    enabled = true; hostname = transport.hostname(url.hostname); port = Number(url.port || 443); connectHost = hostname;
    if (port < 1 || port > 65535) throw new Error('Invalid AIDOT_SERVER_URL port');
    if (legacyPort !== null && port !== legacyPort) throw new Error('AIDOT_SERVER_URL and AIDOT_SERVER_PORT disagree');
  } else {
    enabled = transport.tlsFromEnv({ HTTPS_ENABLED: env.HTTPS_ENABLED ?? 'false' }).enabled;
    hostname = enabled ? transport.hostname(env.HTTPS_SERVER_NAME || 'localhost') : '127.0.0.1';
    port = legacyPort; connectHost = '127.0.0.1';
  }
  const caFile = env.AIDOT_SERVER_CA_FILE ?? (raw ? '' : env.HTTPS_CA_FILE);
  if (!enabled && caFile) throw new Error('A CA file requires HTTPS; configure AIDOT_SERVER_URL');
  return { enabled, protocol: enabled ? 'https' : 'http', hostname, connectHost, port,
    clientCa: enabled ? publicCa(caFile, baseDir) : undefined, certificate: null };
}
function loadConnection({ env = process.env, envFile, baseDir = process.cwd() } = {}) {
  const explicit = env.AIDOT_CLIENT_ENV_FILE;
  const file = explicit ? path.resolve(baseDir, explicit) : envFile;
  if (explicit && !fs.existsSync(file)) throw new Error('AIDOT_CLIENT_ENV_FILE does not exist');
  // Direct URL configuration never opens a server/profile .env.
  const stored = file && (explicit || !env.AIDOT_SERVER_URL) ? readEnv(file) : {};
  const connection = prepareConnection({ ...stored, ...env }, file ? path.dirname(file) : baseDir);
  if (explicit && !connection) throw new Error('AIDOT_CLIENT_ENV_FILE must specify AIDOT_SERVER_URL or AIDOT_SERVER_PORT');
  return connection;
}
function probeConnection(connection, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let done = false, req;
    const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => { req?.destroy(); finish(new Error('External service verification timed out')); }, timeoutMs);
    try {
      req = transport.localRequest(connection, { host: connection.connectHost, port: connection.port, path: '/health/live', minVersion: 'TLSv1.2' }, res => {
        try {
          if (res.statusCode !== 200) throw new Error(`External service health check returned HTTP ${res.statusCode}; redirects are not followed`);
          let certificate = null;
          if (connection.enabled) {
            if (!res.socket.authorized) throw new Error('External service TLS certificate is not authorized');
            const leaf = new X509Certificate(res.socket.getPeerCertificate().raw);
            transport.assertCertificateTime(leaf);
            if (!transport.certificateMatches(leaf, connection.hostname)) throw new Error('External service certificate SAN does not match its address');
            certificate = transport.certificateInfo(leaf);
          }
          let bytes = 0;
          res.on('data', chunk => { bytes += chunk.length; if (bytes > 16384) { req.destroy(); finish(new Error('External service health response is too large')); } });
          res.on('error', error => finish(error));
          // Only a leaf observed after successful TLS validation can become an Electron exception.
          res.on('end', () => finish(null, { ...connection, certificate }));
        } catch (error) { res.destroy(); finish(error); }
      });
      req.on('error', error => finish(error)); req.end();
    } catch (error) { finish(error); }
  });
}
module.exports = { prepareConnection, loadConnection, probeConnection };
