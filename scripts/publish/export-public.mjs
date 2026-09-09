import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { publicEntries, verifyPublicAssets, scanEntries, entryManifest, readPolicy } from './policy.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function exportPublic(destination, sourceRoot = root) {
  const root = sourceRoot;
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const entries = [...publicEntries(root), ...verifyPublicAssets(root, pkg.version)];
  scanEntries(root, entries);
  const target = destination ? path.resolve(destination) : fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-public-'));
  const relative = path.relative(root, target);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) throw new Error('Export outside the source tree');
  if (fs.existsSync(target) && fs.readdirSync(target).length) throw new Error('Export destination must be empty');
  fs.mkdirSync(target, { recursive: true });
  for (const { source, destination: name } of entries) {
    const output = path.join(target, name);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, source), output);
    if (source.startsWith('stubs/')) {
      const stub = path.join(target, source);
      fs.mkdirSync(path.dirname(stub), { recursive: true });
      fs.copyFileSync(path.join(root, source), stub);
    }
  }
  pkg.aidotEdition = 'public';
  const scripts = {};
  for (const [name, command] of Object.entries(pkg.scripts)) {
    if (/:full$/.test(name) || ['all', 'push', 'release:github', 'release', 'ha:tutorial'].includes(name)) continue;
    const references = [...command.matchAll(/(?:^|\s)(scripts\/[^\s]+)/g)].map((m) => m[1]);
    if (references.every((file) => fs.existsSync(path.join(target, file)))) scripts[name] = command;
  }
  pkg.scripts = scripts;
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  const adminFile = path.join(target, 'admin-client/package.json');
  const admin = JSON.parse(fs.readFileSync(adminFile, 'utf8'));
  admin.scripts.build = 'vite build --config vite.public.js --outDir dist';
  fs.writeFileSync(adminFile, JSON.stringify(admin, null, 2) + '\n');
  const manifestEntries = entries.filter((entry) => !['package.json', 'admin-client/package.json'].includes(entry.destination));
  const manifest = entryManifest(root, manifestEntries);
  for (const source of new Set(entries.filter((entry) => entry.source.startsWith('stubs/')).map((entry) => entry.source))) {
    manifest.push(...entryManifest(target, [{ source, destination: source }]));
  }
  for (const name of ['package.json', 'admin-client/package.json']) {
    manifest.push(...entryManifest(target, [{ source: name, destination: name }]));
  }
  fs.writeFileSync(path.join(target, 'PUBLIC_MANIFEST.json'), JSON.stringify({ version: pkg.version, edition: 'public', files: manifest }, null, 2) + '\n');
  return { target, files: manifest.length, edition: 'public', version: pkg.version };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--output');
  console.log(JSON.stringify(exportPublic(index >= 0 ? process.argv[index + 1] : undefined), null, 2));
}
