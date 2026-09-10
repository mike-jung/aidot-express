import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { installedDependenciesMatch, hasInstalledDevDependencies, npmCommand } from '../scripts/startup-dependencies.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot deps & space '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, data) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data)); };
  const pkg = { dependencies: { runtime: '^1.0.0' }, devDependencies: { builder: '^2.0.0' } };
  const meta = (version, rest = {}) => ({ version, resolved: `https://registry.example/${version}.tgz`, integrity: `sha512-${version}`, ...rest });
  const lock = { lockfileVersion: 3, packages: { '': pkg, 'node_modules/runtime': meta('1.0.0'),
    'node_modules/transitive': meta('3.0.0'), 'node_modules/builder': meta('2.0.0', { dev: true }),
    'node_modules/platform-addon': meta('1.0.0', { optional: true }) } };
  write('package.json', pkg); write('package-lock.json', lock);
  const installed = { lockfileVersion: 3, packages: {} };
  for (const [location, info] of Object.entries(lock.packages)) {
    if (!location || info.optional || info.dev) continue;
    write(`${location}/package.json`, { version: info.version }); installed.packages[location] = info;
  }
  write('node_modules/.package-lock.json', installed);
  return { root, write, pkg, lock, installed };
}

test('runtime-only npm tree works without startup caches; optional platform packages can be absent', t => {
  const f = fixture(t);
  assert.equal(installedDependenciesMatch(f.root), true);
  assert.equal(installedDependenciesMatch(f.root, { includeDev: true }), false);
  assert.equal(hasInstalledDevDependencies(f.root), false);
  assert.equal(fs.existsSync(path.join(f.root, '.cache')), false);
});
test('complete npm ci tree is accepted without removing installed development tools', t => {
  const f = fixture(t);
  const meta = f.lock.packages['node_modules/builder'];
  f.write('node_modules/builder/package.json', { version: meta.version });
  f.installed.packages['node_modules/builder'] = meta;
  f.write('node_modules/.package-lock.json', f.installed);
  assert.equal(installedDependenciesMatch(f.root), true);
  assert.equal(installedDependenciesMatch(f.root, { includeDev: true }), true);
  assert.equal(hasInstalledDevDependencies(f.root), true);
  assert.equal(fs.existsSync(path.join(f.root, 'node_modules/builder/package.json')), true);
});
test('a shared runtime and development dependency does not imply a development installation', t => {
  const f = fixture(t);
  f.pkg.devDependencies.runtime = '^1.0.0';
  f.write('package.json', f.pkg); f.write('package-lock.json', f.lock);
  assert.equal(installedDependenciesMatch(f.root), true);
  assert.equal(hasInstalledDevDependencies(f.root), false);
});
for (const damage of ['missing-transitive', 'wrong-version', 'wrong-integrity', 'wrong-source', 'changed-manifest', 'missing-npm-lock']) {
  test(`dependency validation detects ${damage} despite a populated node_modules`, t => {
    const f = fixture(t);
    if (damage === 'missing-transitive') fs.rmSync(path.join(f.root, 'node_modules/transitive'), { recursive: true });
    if (damage === 'wrong-version') f.write('node_modules/transitive/package.json', { version: '0.0.1' });
    if (damage === 'wrong-integrity' || damage === 'wrong-source') {
      f.installed.packages['node_modules/transitive'][damage === 'wrong-integrity' ? 'integrity' : 'resolved'] = 'changed';
      f.write('node_modules/.package-lock.json', f.installed);
    }
    if (damage === 'changed-manifest') f.write('package.json', { ...f.pkg, dependencies: { runtime: '^2.0.0' } });
    if (damage === 'missing-npm-lock') fs.rmSync(path.join(f.root, 'node_modules/.package-lock.json'));
    assert.equal(installedDependenciesMatch(f.root), false);
  });
}
test('npm CLI receives literal arguments through paths with spaces and shell metacharacters', t => {
  const f = fixture(t);
  const cli = path.join(f.root, 'npm-cli.cjs');
  fs.writeFileSync(cli, 'process.stdout.write(JSON.stringify(process.argv.slice(2)))');
  const args = ['run', 'build', '--', 'space value', '& echo unexpected', '$(echo bad)', '%PATH%'];
  const command = npmCommand(args, { env: { npm_execpath: cli } });
  const result = spawnSync(command.command, command.args, { shell: command.shell, encoding: 'utf8', cwd: f.root });
  assert.equal(command.shell, false); assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), args);
  assert.doesNotMatch(result.stderr, /DEP0190/);
});
test('npm CLI can be found next to Node when the wrapper is launched directly', t => {
  const f = fixture(t);
  const cli = path.join(f.root, 'node_modules/npm/bin/npm-cli.js');
  fs.mkdirSync(path.dirname(cli), { recursive: true }); fs.writeFileSync(cli, '');
  assert.equal(npmCommand(['--version'], { env: {}, execPath: path.join(f.root, 'node.exe') }).args[0], cli);
});
