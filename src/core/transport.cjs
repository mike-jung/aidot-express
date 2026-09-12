'use strict';

// Shared by the Node listeners, supervisor probes, Vite and Electron.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const tls = require('node:tls');
const net = require('node:net');
const { X509Certificate, createPrivateKey } = require('node:crypto');

const ENV_KEYS = Object.freeze({ enabled: 'HTTPS_ENABLED', keyFile: 'HTTPS_KEY_FILE', certFile: 'HTTPS_CERT_FILE', caFile: 'HTTPS_CA_FILE', passphrase: 'HTTPS_KEY_PASSPHRASE', serverName: 'HTTPS_SERVER_NAME' });
function tlsFromEnv(env = {}, defaults = {}) {
  const out = { enabled: false, keyFile: '', certFile: '', caFile: '', passphrase: '', serverName: '', ...defaults };
  for (const [key, variable] of Object.entries(ENV_KEYS)) {
    if (env[variable] === undefined) continue;
    const value = String(env[variable]);
    if (key === 'enabled') {
      if (!/^(?:true|false|1|0)$/i.test(value)) throw new Error('HTTPS_ENABLED must be true or false');
      out.enabled = /^(?:true|1)$/i.test(value);
    } else out[key] = value;
  }
  return out;
}
function hostname(value) {
  const name = String(value || '').trim().replace(/^\[|\]$/g, '');
  if (!name || /[\s/@?#\\\x00-\x1f]/.test(name) || (!net.isIP(name) && !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(name))) throw new Error('Use a hostname or IP address without a scheme, path or port');
  if (!net.isIP(name) && name.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) throw new Error('Invalid DNS hostname');
  return net.isIP(name) === 6 ? new URL(`http://[${name}]`).hostname.slice(1, -1) : name.toLowerCase();
}
function urlFor(protocol, host, port, pathname = '/') {
  host = hostname(host);
  return `${protocol}://${net.isIP(host) === 6 ? `[${host}]` : host}:${Number(port)}${pathname}`;
}
function certificateMatches(cert, host) {
  host = hostname(host);
  return net.isIP(host) ? !!cert.checkIP(host) : !!cert.checkHost(host, { subject: 'never' });
}
function certificateInfo(cert) {
  return { subject: cert.subject, issuer: cert.issuer, subjectAltName: cert.subjectAltName || '', validFrom: new Date(cert.validFrom).toISOString(), validTo: new Date(cert.validTo).toISOString(), fingerprint256: cert.fingerprint256 };
}
function readCertificateFile(file, variable) {
  if (!file || /[\x00-\x1f\x7f]/.test(file)) throw new Error(`${variable}: a valid file path is required`);
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('must be a PEM file smaller than 1 MiB');
    return fs.readFileSync(file);
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'file not found (ENOENT)'
      : ['EACCES', 'EPERM'].includes(error.code) ? `file is not readable (${error.code})`
      : error.code || error.message;
    throw new Error(`${variable}: ${reason}: ${JSON.stringify(file)}`);
  }
}
function assertCertificateTime(cert, now = Date.now()) {
  if (now < Date.parse(cert.validFrom) || now >= Date.parse(cert.validTo)) throw new Error('HTTPS certificate is expired or not valid yet');
}
function prepareTls(settings = {}, baseDir = process.cwd()) {
  const enabled = settings.enabled === true;
  if (!enabled) return { enabled: false, protocol: 'http', hostname: '127.0.0.1', settings: { ...settings, enabled: false }, certificate: null };
  const resolved = { ...settings, enabled: true };
  for (const key of ['keyFile', 'certFile', 'caFile']) {
    resolved[key] = settings[key] ? path.resolve(baseDir, settings[key]) : '';
  }
  try {
    // Report every missing configured file, without printing key/passphrase contents.
    const files = {}, problems = [];
    for (const field of ['keyFile', 'certFile', 'caFile']) {
      if (field === 'caFile' && !resolved[field]) continue;
      try { files[field] = readCertificateFile(resolved[field], ENV_KEYS[field]); }
      catch (error) { problems.push(error.message); }
    }
    if (problems.length) throw new Error(problems.join('\n'));
    const { keyFile: key, certFile: cert, caFile: ca } = files;
    const leaf = new X509Certificate(cert);
    assertCertificateTime(leaf);
    if (!leaf.subjectAltName) throw new Error('HTTPS certificate needs a Subject Alternative Name (SAN)');
    const privateKey = createPrivateKey({ key, passphrase: settings.passphrase || undefined });
    if (!leaf.checkPrivateKey(privateKey)) throw new Error('HTTPS private key does not match its certificate');
    let serverName = settings.serverName ? hostname(settings.serverName) : '';
    if (!serverName) {
      serverName = ['localhost', '127.0.0.1', '::1'].find(name => certificateMatches(leaf, name))
        || /(?:^|,\s*)DNS:([a-z0-9][a-z0-9.-]*)(?:,|$)/i.exec(leaf.subjectAltName)?.[1];
    }
    if (!serverName || !certificateMatches(leaf, serverName)) throw new Error('HTTPS_SERVER_NAME must match a DNS name or IP in the certificate SAN');
    resolved.serverName = serverName;
    if (ca) new X509Certificate(ca);
    // Validate the PEM chain/key before either listener starts. Never fall back to HTTP.
    const options = { key, cert, passphrase: settings.passphrase || undefined, minVersion: 'TLSv1.2' };
    tls.createSecureContext(options);
    return { enabled: true, protocol: 'https', hostname: serverName, settings: resolved, options,
      clientCa: ca ? [...tls.rootCertificates, ca] : leaf.subject === leaf.issuer ? [...tls.rootCertificates, cert] : undefined,
      certificate: certificateInfo(leaf) };
  } catch (error) {
    const failure = new Error(`HTTPS configuration is invalid:\n${error.message}\nCertificate path base: ${JSON.stringify(path.resolve(baseDir))}\nRestore the configured certificate files or correct HTTPS_KEY_FILE / HTTPS_CERT_FILE / HTTPS_CA_FILE in the active .env. See docs/HTTPS.md.`);
    failure.code = 'AIDOT_HTTPS_CONFIG';
    throw failure;
  }
}
function createListener(app, prepared) {
  return prepared.enabled ? https.createServer(prepared.options, app) : http.createServer(app);
}
function localRequest(prepared, options, callback) {
  const transport = prepared?.enabled ? https : http;
  const secure = prepared?.enabled ? { ca: prepared.clientCa, servername: net.isIP(prepared.hostname) ? '' : prepared.hostname,
    // TCP stays on loopback; certificate identity uses the configured SAN hostname.
    checkServerIdentity: (_host, cert) => tls.checkServerIdentity(prepared.hostname, cert), rejectUnauthorized: true } : {};
  return transport.request({ host: '127.0.0.1', method: 'GET', agent: false, ...options, ...secure }, callback);
}
function certificateHosts(prepared) {
  if (!prepared?.enabled) return ['localhost', '127.0.0.1', '::1'];
  const names = [prepared.hostname];
  for (const match of prepared.certificate.subjectAltName.matchAll(/(?:^|,\s*)(?:DNS|IP Address):([^,]+)/g)) {
    try { names.push(hostname(match[1])); } catch {}
  }
  return [...new Set(names)];
}
function acceptsConfiguredCertificate(prepared, requestedHost, pem, allowedHosts = [prepared?.hostname]) {
  if (!prepared?.enabled) return false;
  try {
    if (!allowedHosts.some(host => hostname(host) === hostname(requestedHost))) return false;
    const cert = new X509Certificate(pem);
    assertCertificateTime(cert);
    return cert.fingerprint256 === prepared.certificate.fingerprint256 && certificateMatches(cert, requestedHost);
  } catch { return false; }
}

module.exports = { ENV_KEYS, tlsFromEnv, hostname, urlFor, certificateMatches, certificateInfo, certificateHosts, assertCertificateTime, prepareTls, createListener, localRequest, acceptsConfiguredCertificate };
