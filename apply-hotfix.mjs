#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project') i++;
  else if (args[i] !== '--dry-run') throw new Error(`Unknown option: ${args[i]}. Use --project <directory> and optional --dry-run.`);
}
const at = args.indexOf('--project');
if (at >= 0 && (!args[at + 1] || args[at + 1].startsWith('--'))) throw new Error('--project requires a directory');
const root = path.resolve(at >= 0 ? args[at + 1] : process.cwd());
const payload = JSON.parse(fs.readFileSync(path.join(dir, 'hotfix-payload.json'), 'utf8'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function safe(name) {
  if (name.includes('\\') || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Unsafe patch path');
  const file = path.join(root, name);
  for (let part = file; ; part = path.dirname(part)) {
    if (fs.existsSync(part) && fs.lstatSync(part).isSymbolicLink()) throw new Error(`Patch path is a symlink: ${name}`);
    if (part === path.dirname(part)) break;
  }
  return file;
}
const pkg = JSON.parse(fs.readFileSync(safe('package.json'), 'utf8'));
if (pkg.version !== '1.43.2') throw new Error('This hotfix requires aidot-express 1.43.2');
const changes = [];
for (const item of payload.files) {
  const file = safe(item.path);
  const before = fs.existsSync(file) ? fs.readFileSync(file) : null;
  const after = Buffer.from(item.data, 'base64');
  if (hash(after) !== item.after) throw new Error(`Corrupt payload: ${item.path}`);
  if (before && hash(before) === item.after) continue;
  const actual = before ? hash(before) : null;
  const normalized = before ? hash(Buffer.from(before.toString('utf8').replace(/\r\n/g, '\n'))) : null;
  if (actual !== item.before && normalized !== item.before) throw new Error(`Local changes conflict with the hotfix: ${item.path}. No files were modified.`);
  changes.push({ file, name: item.path, before, after });
}
if (!changes.length) console.log('Hotfix is already applied.');
else if (args.includes('--dry-run')) console.log(JSON.stringify({ dryRun: true, project: root, files: changes.map(item => item.name) }, null, 2));
else {
  const parent = safe('.patch-backups/' + payload.id);
  fs.mkdirSync(parent, { recursive: true });
  const backup = fs.mkdtempSync(path.join(parent, 'apply-'));
  for (const item of changes) if (item.before) {
    const copy = path.join(backup, item.name);
    fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.writeFileSync(copy, item.before);
  }
  const applied = [];
  try {
    for (const item of changes) {
      fs.mkdirSync(path.dirname(item.file), { recursive: true });
      applied.push(item);
      fs.writeFileSync(item.file, item.after);
    }
    console.log(JSON.stringify({ applied: true, project: root, files: changes.map(item => item.name), backup }, null, 2));
  } catch (error) {
    for (const item of applied.reverse()) {
      if (item.before) fs.writeFileSync(item.file, item.before);
      else fs.rmSync(item.file, { force: true });
    }
    throw error;
  }
}
