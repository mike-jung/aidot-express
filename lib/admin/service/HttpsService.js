import fs from 'node:fs';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { Service } from '../../../src/core/decorators.js';
import config, { activeTransport, tlsBaseDir, loadedEnvFiles } from '../../../src/config/index.js';
import transport from '../../../src/core/transport.cjs';
import settingsFile from '../../../src/core/httpsConfig.cjs';
import certificates from '../../../src/core/certificates.cjs';

const envFile = loadedEnvFiles[0] || settingsFile.envPath(tlsBaseDir);
const baseDir = path.dirname(envFile);
const publicSettings = ({ passphrase, ...rest }) => ({ ...rest, hasPassphrase: !!passphrase });

@Service('HttpsService')
export default class HttpsService {
  metadata() {
    return { enabled: activeTransport.enabled, protocol: activeTransport.protocol,
      port: config.server.port, controlPort: config.control?.enabled ? config.control.port : null,
      hostname: activeTransport.hostname, certificate: activeTransport.certificate };
  }

  getSettings() {
    const configured = settingsFile.readTlsSettings(envFile, config.server.tls);
    let restartRequired = true;
    let validationError = null;
    try {
      const pending = transport.prepareTls(configured, baseDir);
      restartRequired = pending.enabled !== activeTransport.enabled || (pending.enabled &&
        (pending.hostname !== activeTransport.hostname || pending.certificate.fingerprint256 !== activeTransport.certificate?.fingerprint256 ||
        ['keyFile', 'certFile', 'caFile', 'passphrase'].some(key => pending.settings[key] !== activeTransport.settings[key])));
    } catch (error) { validationError = error.message; }
    return { active: this.metadata(), configured: publicSettings(configured), restartRequired, validationError, envFile };
  }

  saveSettings(input) {
    if (!input || typeof input.enabled !== 'boolean') throw Object.assign(new Error('HTTPS enabled must be a boolean'), { status: 400 });
    if (process.env.AIDOT_SERVICE_MODE === '1' && input.enabled !== true) throw Object.assign(new Error('HTTPS is required for a server service'), { status: 400 });
    const current = settingsFile.readTlsSettings(envFile, config.server.tls);
    const settings = { ...current, enabled: input.enabled };
    for (const key of ['keyFile', 'certFile', 'caFile', 'serverName', 'passphrase']) {
      if (input[key] === undefined) continue;
      if (typeof input[key] !== 'string' || input[key].length > 4096) throw Object.assign(new Error(`Invalid HTTPS ${key}`), { status: 400 });
      settings[key] = input[key];
    }
    try {
      // Validate before writing. Key material and passphrases never appear in the response.
      transport.prepareTls(settings, baseDir);
      const update = settingsFile.saveTlsSettings(envFile, settings);
      return { ...this.getSettings(), changed: update.changed };
    } catch (error) { throw Object.assign(error, { status: error.status || 400 }); }
  }

  async generate(input = {}) {
    try {
      const generated = await certificates.generateCertificate({ hosts: input.hosts, days: input.days, baseDir });
      return { ...generated, settings: publicSettings(generated.settings) };
    } catch (error) { throw Object.assign(error, { status: error.status || 400 }); }
  }

  caCertificate() {
    const settings = settingsFile.readTlsSettings(envFile, config.server.tls);
    if (!settings.caFile) throw Object.assign(new Error('No CA certificate is configured'), { status: 404 });
    const file = path.resolve(baseDir, settings.caFile);
    if (fs.statSync(file).size > 1024 * 1024) throw Object.assign(new Error('CA certificate is too large'), { status: 400 });
    // Parse and re-encode a certificate; never return arbitrary file contents or key blocks.
    const certificate = new X509Certificate(fs.readFileSync(file));
    if (!certificate.ca) throw Object.assign(new Error('The configured certificate is not a CA'), { status: 400 });
    return { pem: certificate.toString(), certificate: transport.certificateInfo(certificate) };
  }
}
