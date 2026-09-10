'use strict';
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { webcrypto, randomBytes, X509Certificate, createPrivateKey } = require('node:crypto');
const { hostname, prepareTls, certificateInfo } = require('./transport.cjs');
const { protectPath } = require('./httpsConfig.cjs');

function normalizeHosts(input = 'localhost,127.0.0.1,::1') {
  const values = Array.isArray(input) ? input : String(input).split(/[\s,]+/);
  const hosts = [...new Set(values.filter(Boolean).map(hostname))];
  if (!hosts.length || hosts.length > 32) throw new Error('Provide between 1 and 32 certificate hostnames/IP addresses');
  if (hosts.some(host => host === '0.0.0.0' || host === '::')) throw new Error('Use the actual client-facing hostname/IP, not a wildcard bind address');
  return hosts;
}
let generating = false;
async function generateCertificate({ hosts, days = 90, baseDir = process.cwd(), outputDir } = {}) {
  if (generating) throw Object.assign(new Error('Certificate generation is already in progress'), { status: 409 });
  hosts = normalizeHosts(hosts);
  days = Number(days);
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('Certificate lifetime must be an integer between 1 and 365 days');
  generating = true;
  let directory;
  try {
    require('reflect-metadata');
    const x509 = require('@peculiar/x509');
    const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', publicExponent: new Uint8Array([1, 0, 1]), modulusLength: 3072 };
    const caKeys = await webcrypto.subtle.generateKey(algorithm, false, ['sign', 'verify']);
    const serverKeys = await webcrypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
    const notBefore = new Date(Date.now() - 5 * 60_000);
    const notAfter = new Date(Date.now() + days * 86400_000);
    const serial = () => '01' + randomBytes(15).toString('hex');
    const ca = await x509.X509CertificateGenerator.createSelfSigned({
      serialNumber: serial(), name: `CN=aidot-express private CA ${randomBytes(5).toString('hex')}`,
      notBefore, notAfter: new Date(Date.now() + 5 * 365 * 86400_000), signingAlgorithm: algorithm, keys: caKeys,
      extensions: [new x509.BasicConstraintsExtension(true, 0, true),
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
        await x509.SubjectKeyIdentifierExtension.create(caKeys.publicKey, false, webcrypto)],
    }, webcrypto);
    const leaf = await x509.X509CertificateGenerator.create({
      serialNumber: serial(), subject: 'CN=aidot-express server', issuer: ca.subject,
      publicKey: serverKeys.publicKey, signingKey: caKeys.privateKey, signingAlgorithm: algorithm, notBefore, notAfter,
      extensions: [new x509.BasicConstraintsExtension(false, undefined, true),
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment, true),
        new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.1']),
        new x509.SubjectAlternativeNameExtension(hosts.map(value => ({ type: net.isIP(value) ? 'ip' : 'dns', value }))),
        await x509.SubjectKeyIdentifierExtension.create(serverKeys.publicKey, false, webcrypto),
        await x509.AuthorityKeyIdentifierExtension.create(caKeys.publicKey, false, webcrypto)],
    }, webcrypto);
    const parent = path.resolve(baseDir, outputDir || 'certs');
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
    directory = fs.mkdtempSync(path.join(parent, `https-${Date.now()}-`));
    protectPath(directory, true);
    const keyFile = path.join(directory, 'server.key');
    const certFile = path.join(directory, 'server.crt');
    const caFile = path.join(directory, 'ca.crt');
    const exported = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', serverKeys.privateKey));
    const key = createPrivateKey({ key: exported, format: 'der', type: 'pkcs8' }).export({ type: 'pkcs8', format: 'pem' });
    fs.writeFileSync(keyFile, key, { flag: 'wx', mode: 0o600 }); exported.fill(0);
    fs.writeFileSync(certFile, leaf.toString('pem') + '\n', { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(caFile, ca.toString('pem') + '\n', { flag: 'wx', mode: 0o600 });
    // The signing key for this one-use CA is never exported or written to disk.
    const settings = { enabled: true, keyFile, certFile, caFile, passphrase: '', serverName: hosts.includes('localhost') ? 'localhost' : hosts[0] };
    const prepared = prepareTls(settings, baseDir);
    return { settings, hosts, certificate: prepared.certificate, ca: certificateInfo(new X509Certificate(ca.toString('pem'))) };
  } catch (error) {
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  } finally { generating = false; }
}
module.exports = { normalizeHosts, generateCertificate };
