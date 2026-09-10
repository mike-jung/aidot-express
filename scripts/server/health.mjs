import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import transport from '../../src/core/transport.cjs';
import { readServiceConfig } from './config.mjs';

export async function checkHealth(dataDir, timeout = 10000) {
  const cfg = readServiceConfig(dataDir);
  const caFile = cfg.env.HTTPS_CA_FILE;
  const ca = caFile ? fs.readFileSync(path.resolve(cfg.dataDir, caFile)) : undefined;
  if (ca && (/PRIVATE KEY/.test(ca.toString()) || ca.length > 1024 * 1024)) throw new Error('The probe accepts public CA certificates only');
  const prepared = { enabled: true, hostname: cfg.hostname, clientCa: ca };
  // Never open the server private key or disable certificate/SAN verification for a health probe.
  for (const route of ['/health/ready', '/aidot-edition.json']) {
    await new Promise((resolve, reject) => {
      const req = transport.localRequest(prepared, { port: cfg.port, path: route, timeout, headers: { Host: new URL(cfg.url).host } }, res => {
        res.resume(); res.on('error', reject);
        res.on('end', () => res.statusCode === 200 ? resolve() : reject(new Error(route + ': HTTP ' + res.statusCode)));
      });
      const deadline = setTimeout(() => req.destroy(new Error('HTTPS health probe timed out')), timeout);
      req.once('close', () => clearTimeout(deadline)); req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('HTTPS health probe timed out'))); req.end();
    });
  }
  return { ready: true, url: cfg.url };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { 'data-dir': { type: 'string' }, wait: { type: 'string', default: '30' } } });
  const seconds = Number(values.wait);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 120) throw new Error('--wait must be between 0 and 120 seconds');
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    try { console.log(JSON.stringify(await checkHealth(values['data-dir'], 3000))); break; }
    catch (e) {
      if (Date.now() >= deadline) { console.error(e.message); process.exitCode = 1; break; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
