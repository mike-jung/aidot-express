#!/usr/bin/env node
/** Create an edition-specific installer without modifying the source tree. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publicEntries, verifyPublicAssets, scanEntries, walkFiles, forbiddenLocalPath, entryManifest } from './publish/policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const supported = new Set(['--full', '--linux', '--dir', '--ia32', '--x64', '--clean', '--wsl', '--docker', '--targz', '--plan']);
if (args.some((arg) => !supported.has(arg))) throw new Error('Unsupported build option');
const full = args.includes('--full');
const edition = full ? 'full' : 'public';
const target = args.includes('--linux') ? 'linux' : 'win';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (full && pkg.aidotEdition === 'public') throw new Error('Full edition sources are not present');
const runtimePath = (rel) => !rel.startsWith('electron/build/') && (rel === 'package.json' || rel === '.env.example'
  || /^(electron|src|lib|public|docs|mci-server)\//.test(rel));
let entries;
if (full) {
  entries = walkFiles(root).filter((rel) => !forbiddenLocalPath(rel) && runtimePath(rel)
    && !/\.(?:map|test\.mjs)$/.test(rel) && !/^(docs\/(?:answers|tutorial-src|tutorial-i18n)|mci-server\/samples)\//.test(rel))
    .map((rel) => ({ source: rel, destination: rel }));
  const dir = path.join(root, 'admin-client/dist');
  const marker = JSON.parse(fs.readFileSync(path.join(dir, 'aidot-edition.json'), 'utf8'));
  if (marker.edition !== 'full' || marker.version !== pkg.version) throw new Error('Run npm run build:admin:full first');
  entries.push(...walkFiles(dir).map((rel) => ({ source: `admin-client/dist/${rel}`, destination: `admin-client/dist/${rel}` })));
} else {
  const all = publicEntries(root);
  scanEntries(root, all);
  const assets = verifyPublicAssets(root, pkg.version);
  scanEntries(root, assets);
  entries = [...all.filter((entry) => runtimePath(entry.destination)), ...assets];
}
for (const entry of entries) if (fs.lstatSync(path.join(root, entry.source)).isSymbolicLink()) throw new Error(`Symlink in package: ${entry.destination}`);
const unchanged = entries.filter((entry) => entry.source === entry.destination).map((entry) => entry.source);
const remapped = entries.filter((entry) => entry.source !== entry.destination);
const groups = new Map();
for (const entry of remapped) {
  if (path.posix.basename(entry.source) !== path.posix.basename(entry.destination)) throw new Error('Remapped filenames must match');
  const from = path.posix.dirname(entry.source), to = path.posix.dirname(entry.destination);
  const key = JSON.stringify([from, to]);
  if (!groups.has(key)) groups.set(key, { from, to, filter: [] });
  groups.get(key).filter.push(path.posix.basename(entry.source));
}
const build = structuredClone(pkg.build);
if (args.includes('--dir') && !args.includes('--plan')) {
  const parent = path.resolve(root, build.directories?.output || 'dist-electron');
  fs.mkdirSync(parent, { recursive: true });
  build.directories = { ...build.directories, output: fs.mkdtempSync(path.join(parent, `${edition}-package-`)) };
}
// Explicit FileSets avoid glob-order ambiguity and never create .__full backups.
// Main application FileSets are directory based; single-file sources are skipped by appFileCopier.
build.files = [{ from: '.', to: '.', filter: unchanged }, ...groups.values()];
build.extraMetadata = { ...build.extraMetadata, aidotEdition: edition };
// The generated config is authoritative: do not merge broad package.json file globs back in.
build.extends = null;
build.win = { ...build.win, artifactName: `\${productName}-Setup-\${version}${full ? '-full' : ''}-\${arch}.\${ext}` };
build.linux = { ...build.linux, artifactName: `\${productName}-\${version}${full ? '-full' : ''}.\${ext}` };
const outConfig = path.join(root, `.electron-builder.${edition}.json`);
const extraEntries = (build.extraResources || []).map((entry) => {
  if (typeof entry !== 'object' || !/^electron\/build\/[a-z0-9_.-]+\.(?:ico|png|svg)$/i.test(entry.from) || entry.to !== entry.from) throw new Error('Only explicit installer icon resources are supported');
  return { source: entry.from, destination: entry.to };
});
fs.writeFileSync(path.join(root, `.electron-builder.${edition}.files.json`), JSON.stringify({ edition, version: pkg.version, files: entryManifest(root, entries), extraResources: entryManifest(root, extraEntries) }, null, 2));
fs.writeFileSync(outConfig, JSON.stringify(build, null, 2));
console.log(`${edition} ${target}: ${entries.length} runtime files, sources unchanged`);
if (!args.includes('--plan')) {
  if (target === 'linux' && !args.includes('--dir')) {
    execFileSync(process.execPath, ['scripts/build-linux.mjs', ...args.filter((arg) => ['--wsl', '--docker', '--targz'].includes(arg)), '--config', outConfig], { cwd: root, stdio: 'inherit' });
  } else {
    const cli = path.join(root, 'node_modules/electron-builder/out/cli/cli.js');
    execFileSync(process.execPath, [cli, `--${target}`, args.includes('--ia32') ? '--ia32' : '--x64', ...(args.includes('--dir') ? ['--dir'] : []), '--publish', 'never', '--config', outConfig], { cwd: root, stdio: 'inherit' });
  }
}
