import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { X509Certificate, generateKeyPairSync } from 'node:crypto';
import transport from '../src/core/transport.cjs';
import certificates from '../src/core/certificates.cjs';
import envFile from '../src/core/httpsConfig.cjs';
import { requireHttps } from '../src/core/requireHttps.js';
import { sameOriginApiUrl, controlApiBase } from '../admin-client/src/utils/apiUrl.js';
import { forbiddenLocalPath } from '../scripts/publish/policy.mjs';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-tls-test-'));
let generated, prepared, server, port;
before(async () => {
  generated = await certificates.generateCertificate({ baseDir: directory, hosts: 'localhost,127.0.0.1,::1,api.example.test', days: 2 });
  prepared = transport.prepareTls(generated.settings, directory);
  server = transport.createListener((_req, res) => { res.end('healthy'); }, prepared);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); });
function request(factory) {
  return new Promise((resolve, reject) => {
    const req = factory(res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.setTimeout(3000, () => req.destroy(new Error('timeout'))); req.end();
  });
}

test('private CA signs a serverAuth certificate with DNS and IP SANs', () => {
  const leaf = new X509Certificate(fs.readFileSync(generated.settings.certFile));
  const ca = new X509Certificate(fs.readFileSync(generated.settings.caFile));
  assert.equal(ca.ca, true); assert.equal(leaf.ca, false); assert.equal(leaf.verify(ca.publicKey), true);
  for (const name of generated.hosts) assert.equal(transport.certificateMatches(leaf, name), true);
  assert.ok(leaf.keyUsage.includes('1.3.6.1.5.5.7.3.1'));
  assert.equal(fs.existsSync(path.join(path.dirname(generated.settings.keyFile), 'ca.key')), false);
});
test('internal HTTPS probe verifies the private CA and the configured SAN on loopback', async () => {
  assert.equal(await request(cb => transport.localRequest(prepared, { port, path: '/' }, cb)), 200);
  const customName = transport.prepareTls({ ...generated.settings, serverName: 'api.example.test' });
  assert.equal(await request(cb => transport.localRequest(customName, { port, path: '/' }, cb)), 200);
});
test('untrusted certificates and wrong hostnames fail verification', async () => {
  await assert.rejects(request(cb => https.request({ host: '127.0.0.1', port, agent: false }, cb)));
  await assert.rejects(request(cb => https.request({ host: '127.0.0.1', port, ca: fs.readFileSync(generated.settings.caFile), servername: 'wrong.example.test', agent: false }, cb)));
});
test('TLS versions below 1.2 are rejected', async () => {
  await assert.rejects(request(cb => https.request({ host: '127.0.0.1', port, ca: prepared.clientCa, minVersion: 'TLSv1', maxVersion: 'TLSv1.1' }, cb)));
});
test('missing files, mismatched keys and non-SAN server names fail configuration', () => {
  assert.throws(() => transport.prepareTls({ enabled: true }), /HTTPS/);
  assert.throws(() => transport.prepareTls({ ...generated.settings, serverName: 'wrong.example.test' }), /SAN/);
  const keyFile = path.join(directory, 'wrong.key');
  fs.writeFileSync(keyFile, generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }));
  assert.throws(() => transport.prepareTls({ ...generated.settings, keyFile }), /does not match/);
});
test('expired and not-yet-valid certificates are rejected', () => {
  const cert = new X509Certificate(fs.readFileSync(generated.settings.certFile));
  assert.throws(() => transport.assertCertificateTime(cert, Date.parse(cert.validTo)), /expired/);
  assert.throws(() => transport.assertCertificateTime(cert, Date.parse(cert.validFrom) - 1), /not valid/);
});
test('Electron certificate exception is limited to the configured fingerprint and hostname', () => {
  const pem = fs.readFileSync(generated.settings.certFile, 'utf8');
  assert.equal(transport.acceptsConfiguredCertificate(prepared, 'localhost', pem), true);
  assert.equal(transport.acceptsConfiguredCertificate(prepared, 'api.example.test', pem), false);
  assert.equal(transport.acceptsConfiguredCertificate(prepared, 'localhost', fs.readFileSync(generated.settings.caFile)), false);
  assert.equal(transport.acceptsConfiguredCertificate({ ...prepared, certificate: { fingerprint256: 'wrong' } }, 'localhost', pem), false);
});
test('HTTPS settings preserve unrelated values, deduplicate keys, back up and round-trip Windows paths', () => {
  const file = path.join(directory, '.env');
  const original = '# keep comment\r\nDB_PASSWORD=unchanged\r\nHTTPS_ENABLED=false\r\nHTTPS_ENABLED=false\r\n';
  fs.writeFileSync(file, original);
  const settings = { ...generated.settings, keyFile: 'C:\\new folder\\server.key', passphrase: 'quote" and \\n' };
  const saved = envFile.saveTlsSettings(file, settings);
  assert.equal(fs.readFileSync(saved.backup, 'utf8'), original);
  assert.equal(envFile.readEnv(file).DB_PASSWORD, 'unchanged');
  assert.deepEqual(envFile.readTlsSettings(file), settings);
  assert.equal(fs.readFileSync(file, 'utf8').match(/^HTTPS_ENABLED=/gm).length, 1);
  assert.equal(envFile.saveTlsSettings(file, settings).changed, false);
  const before = fs.readFileSync(file);
  assert.throws(() => envFile.saveTlsSettings(file, { ...settings, certFile: 'bad\nAUTH_SIGNUP_OPEN=true' }), /control characters/);
  assert.deepEqual(fs.readFileSync(file), before);
});
test('dotenv UTF-16 input is decoded and written as UTF-8 without losing existing configuration', () => {
  const file = path.join(directory, 'unicode.env');
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('EXISTING=kept\r\n', 'utf16le')]));
  envFile.saveTlsSettings(file, generated.settings);
  assert.equal(envFile.readEnv(file).EXISTING, 'kept');
});
test('certificate generation validates hosts and lifetime', async () => {
  for (const value of ['https://example.com', 'example.com:443', '0.0.0.0', '::', '../key', 'bad..host']) assert.throws(() => certificates.normalizeHosts(value));
  await assert.rejects(certificates.generateCertificate({ days: 366, baseDir: directory }), /lifetime/);
  assert.equal(transport.urlFor('https', '::1', 7901), 'https://[::1]:7901/');
});
test('API tests follow HTTPS and refuse external credentials or downgrades', () => {
  assert.equal(sameOriginApiUrl('/api/test', 'https://localhost:7901'), 'https://localhost:7901/api/test');
  for (const value of ['http://localhost:7901/api/test', '//evil.test/api/test', 'https://user:pass@localhost:7901/api']) assert.throws(() => sameOriginApiUrl(value, 'https://localhost:7901'));
  assert.equal(controlApiBase({ protocol: 'https', controlPort: 8444 }, 'https://[::1]:8443'), 'https://[::1]:8444');
  assert.equal(controlApiBase({ protocol: 'https', controlPort: 7902 }, 'https://localhost:7901', 'http://localhost:7902'), 'https://localhost:7902');
  assert.throws(() => controlApiBase({ protocol: 'https' }, 'https://localhost:7901', 'http://other.test:7902'));
});
test('production remote HTTP requires TLS while local setup and trusted HTTPS are available', () => {
  function result(req, env = 'production') {
    let outcome; requireHttps({ env })(req, { status(code) { outcome = code; return this; }, json() {} }, () => { outcome = 'next'; }); return outcome;
  }
  const remote = { secure: false, ip: '192.0.2.2', socket: { remoteAddress: '192.0.2.2' } };
  assert.equal(result(remote), 426); assert.equal(result({ ...remote, secure: true }), 'next');
  assert.equal(result(remote, 'development'), 'next');
  assert.equal(result({ secure: false, ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } }), 'next');
  assert.equal(result({ ...remote, socket: { remoteAddress: '127.0.0.1' } }), 426);
});
test('certificates and private keys stay outside Public and Electron distribution inputs', () => {
  for (const name of ['certs/server.crt', 'src/certs/server.key', 'public/uploads/ca.crt', 'lib/local.pem', '.env.https-backup-1']) assert.equal(forbiddenLocalPath(name), true, name);
});
test('four requested metadata/template files are entirely English', () => {
  for (const name of ['package.json', '.env.example', '.env.secure.example', '.env.enterprise.example']) {
    const file = new URL(`../${name}`, import.meta.url);
    if (fs.existsSync(file)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /[\uac00-\ud7a3]/, name);
  }
});
