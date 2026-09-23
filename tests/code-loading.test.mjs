import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Container } from '../src/core/container.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);
const cases = [
  ['primitive', 'non-Error throws cannot abort the remaining controller/service loads'],
  ['controller', 'failed controller reloads keep the working router and validate the entire candidate'],
  ['service', 'failed imports and service constructors cannot replace committed DI beans'],
  ['async', 'detached import promises are attributed and contained before and after startup'],
  ['timeout', 'a stalled async import times out without allowing a late registration'],
  ['bulk', 'bulk workspace loading reports individual failures and really retries corrected files'],
  ['metadata', 'failed console edits and renames restore source and metadata without reconstructing live code'],
  ['startup', 'the real HTTP server stays available with broken controllers/services'],
];
for (const [scenario, label] of cases) {
  test(label, { timeout: 60000 }, async () => {
    const { stdout } = await run(process.execPath, [
      '--import', './src/loader/register.mjs', 'tests/fixtures/code-loading.mjs', scenario,
    ], { cwd: root, timeout: 55000, maxBuffer: 2 * 1024 * 1024 });
    assert.match(stdout, new RegExp(`PASS ${scenario}`));
  });
}

test('an unowned framework rejection still exits nonzero', { timeout: 15000 }, async () => {
  await assert.rejects(run(process.execPath, [
    '--import', './src/loader/register.mjs', 'tests/fixtures/code-loading.mjs', 'framework-fatal',
  ], { cwd: root, timeout: 10000 }), (error) => error.code === 1 && /framework fatal probe/.test(error.stderr));
});

test('concurrent DI transactions publish only their own registrations and preserve request caches', async () => {
  const container = new Container();
  const old = { value: 'old' };
  container.register('Stable', old);
  let entered, release;
  const inside = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const failed = container.transaction(async () => {
    container.register('Stable', { value: 'bad' });
    container.registerFactory('NewBadBean', () => ({}));
    entered();
    await gate;
    throw new Error('rollback');
  });
  const rejection = assert.rejects(failed, /rollback/);
  await inside;
  assert.equal(container.resolve('Stable'), old);
  await container.transaction(async () => container.register('Independent', { value: 'committed' }));
  container.registerFactory('RequestBean', () => ({}));
  const requestBean = container.resolve('RequestBean');
  release();
  await rejection;
  assert.equal(container.resolve('Stable'), old);
  assert.equal(container.resolve('Independent').value, 'committed');
  assert.equal(container.resolve('RequestBean'), requestBean);
  assert.equal(container.has('NewBadBean'), false);
  await container.transaction(async () => container.register('Stable', { value: 'new' }));
  assert.equal(container.resolve('Stable').value, 'new');
});

test('failed controller construction cannot publish a newly constructed service instance', async () => {
  const container = new Container();
  let constructions = 0;
  container.registerFactory('Dependency', () => ({ number: ++constructions }));
  await assert.rejects(container.transaction(async () => {
    assert.equal(container.resolve('Dependency').number, 1);
    throw new Error('controller construction failed');
  }));
  assert.equal(container.resolve('Dependency').number, 2);
});
