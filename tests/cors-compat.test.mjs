import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { normalizeCorsOrigins } from '../src/core/corsConfig.js';
import { originPolicy } from '../src/core/originPolicy.js';

test('legacy wildcard normalization never expands the explicit trust list', () => {
  for (const value of ['*', ['*'], ' , * , ']) assert.deepEqual(normalizeCorsOrigins(value), { origins: [], ignoredWildcard: true });
  assert.deepEqual(normalizeCorsOrigins('*,https://TRUSTED.example:443, https://trusted.example'), { origins: ['https://trusted.example'], ignoredWildcard: true });
  for (const value of ['', undefined, null, false]) assert.deepEqual(normalizeCorsOrigins(value), { origins: [], ignoredWildcard: false });
  for (const value of [true, 'true', 'null', 'https://*.example', 'https://u:p@example.com', 'https://example.com/path', 'https://example.com?q=1', 'ftp://example.com', ['*', true]]) assert.throws(() => normalizeCorsOrigins(value));
});

for (const value of ['*', ['*', 'https://trusted.example']]) test(`legacy ${JSON.stringify(value)} preserves same-origin and denies hostile writes and preflight`, async t => {
  let writes = 0;
  const app = express();
  app.use(originPolicy({ server: { allowedHosts: ['127.0.0.1'] }, cors: { origin: value, credentials: true } }));
  app.post('/write', (_req, res) => { writes++; res.json({ ok: true }); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const origin of ['https://evil.example', 'null', 'https://trusted.example.evil.test']) {
    for (const method of ['POST', 'OPTIONS']) {
      const result = await fetch(base + '/write', { method, headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } });
      assert.equal(result.status, 403); assert.equal(result.headers.get('access-control-allow-origin'), null);
    }
  }
  assert.equal((await fetch(base + '/write', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal(writes, 0);
  for (const method of ['POST', 'OPTIONS']) {
    const result = await fetch(base + '/write', { method, headers: { Origin: base, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(result.status, method === 'POST' ? 200 : 204);
    assert.equal(result.headers.get('access-control-allow-origin'), base);
    assert.equal(result.headers.get('access-control-allow-credentials'), 'true');
  }
  const trusted = await fetch(base + '/write', { method: 'POST', headers: { Origin: 'https://trusted.example' } });
  assert.equal(trusted.status, Array.isArray(value) ? 200 : 403);
  assert.equal(writes, Array.isArray(value) ? 2 : 1);
});

test('actual config import accepts a legacy .env without changing it, including production', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-cors-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, '.env');
  const contents = 'CORS_ORIGIN=*\n'; fs.writeFileSync(file, contents);
  const root = fileURLToPath(new URL('..', import.meta.url));
  for (const nodeEnv of ['development', 'production']) {
    const env = { ...process.env, AIDOT_ENV_FILE: file, NODE_ENV: nodeEnv, AUTH_ACCESS_SECRET: 'a'.repeat(64), AUTH_COOKIE_SAMESITE: 'lax', AUTH_COOKIE_SECURE: 'true' };
    delete env.CORS_ORIGIN;
    const result = spawnSync(process.execPath, ['--import', './src/loader/register.mjs', '--input-type=module', '-e', "import config from './src/config/index.js'; if(config.cors.origin.length)process.exit(2);"], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /Legacy CORS_ORIGIN=\* ignored/);
    assert.equal(fs.readFileSync(file, 'utf8'), contents);
  }
});
