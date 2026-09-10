import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import editionPlugin from './edition-plugin.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import tls from 'node:tls';
import net from 'node:net';
import { createRequire } from 'node:module';
const load = createRequire(import.meta.url);

export default defineConfig(({ command }) => {
  const config = { plugins: [vue(), editionPlugin()], define: { __AIDOT_EDITION__: JSON.stringify('full') } };
  if (command !== 'serve') return config;
  const transport = load('../src/core/transport.cjs');
  const settingsFile = load('../src/core/httpsConfig.cjs');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const file = settingsFile.envPath(root);
  const env = { ...process.env, ...settingsFile.readEnv(file) };
  const prepared = transport.prepareTls(transport.tlsFromEnv(env), path.dirname(file));
  const apiTarget = process.env.VITE_API_TARGET || transport.urlFor(prepared.protocol, '127.0.0.1', env.PORT || env.SERVER_PORT || 3000);
  const controlTarget = transport.urlFor(prepared.protocol, '127.0.0.1', env.CONTROL_PORT || 7902);
  if (new URL(apiTarget).protocol === 'https:' && !prepared.enabled) throw new Error('Configure local HTTPS certificates for Vite when proxying an HTTPS API so Secure cookies work.');
  const devOrigins = transport.certificateHosts(prepared).map(host => new URL(transport.urlFor(prepared.protocol, host, 5174)).origin);
  function proxyOptions(target) {
    const url = new URL(target);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    const agent = url.protocol === 'https:' ? new https.Agent({
      ca: prepared.clientCa, rejectUnauthorized: true,
      ...(loopback ? { servername: net.isIP(prepared.hostname) ? '' : prepared.hostname,
        checkServerIdentity: (_name, cert) => tls.checkServerIdentity(prepared.hostname, cert) } : {}),
    }) : undefined;
    return { target, changeOrigin: true, secure: true, agent,
      configure(proxy) {
        proxy.on('proxyReq', (request, incoming) => {
          // Rewrite only local dev origins covered by the configured certificate.
          if (devOrigins.includes(incoming.headers.origin)) request.setHeader('Origin', url.origin);
        });
        proxy.on('error', (error, _req, res) => {
          console.error(`[vite proxy] ${target}: ${error.code || error.message}`);
          if (res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'proxy_error', message: 'Cannot connect to the configured API. Check server status and certificate trust.', code: error.code }));
          }
        });
      },
    };
  }
  console.log(`[vite] Console: ${devOrigins[0]}; API: ${apiTarget}`);
  return { ...config, server: { port: 5174, host: '127.0.0.1', strictPort: true,
    allowedHosts: transport.certificateHosts(prepared),
    https: prepared.enabled ? prepared.options : undefined,
    proxy: { '/api/control': proxyOptions(controlTarget), '/api': proxyOptions(apiTarget), '/health': proxyOptions(apiTarget) },
  } };
});
