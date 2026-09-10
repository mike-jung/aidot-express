#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import certificates from '../src/core/certificates.cjs';
import settingsFile from '../src/core/httpsConfig.cjs';
import transport from '../src/core/transport.cjs';

try {
  const { values } = parseArgs({ options: {
    hosts: { type: 'string' }, days: { type: 'string' }, env: { type: 'string' }, output: { type: 'string' },
    apply: { type: 'boolean' }, check: { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('Usage: npm run https:cert -- [--hosts localhost,127.0.0.1,::1,app.example.com] [--days 90] [--env .env] [--output certs] [--apply]\n       npm run https:check -- [--env .env]\nCreates a new private CA and server certificate. Existing certificates are preserved.\n--apply updates only HTTPS settings in .env and keeps a protected backup. Restart the complete app/service.\nTrust only the generated ca.crt on clients. Never distribute server.key. See docs/HTTPS.md.');
  } else {
    const file = values.env ? path.resolve(values.env) : settingsFile.envPath();
    if (values.check) {
      const prepared = transport.prepareTls(settingsFile.readTlsSettings(file, transport.tlsFromEnv(process.env)), path.dirname(file));
      console.log(JSON.stringify({ enabled: prepared.enabled, protocol: prepared.protocol, serverName: prepared.hostname, certificate: prepared.certificate }, null, 2));
    } else {
      const result = await certificates.generateCertificate({ hosts: values.hosts, days: values.days, baseDir: path.dirname(file), outputDir: values.output });
      const update = values.apply ? settingsFile.saveTlsSettings(file, result.settings) : null;
      console.log(JSON.stringify({ ...result, update, next: 'Trust ca.crt on client devices. Restart the complete app/service after applying these settings. Never share server.key.' }, null, 2));
    }
  }
} catch (error) {
  console.error(`HTTPS: ${error.message}`);
  process.exitCode = 1;
}
