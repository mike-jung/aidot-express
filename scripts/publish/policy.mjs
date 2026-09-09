import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scanText } from './pii-scan.mjs';

export function globRegex(pattern) {
  let text = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') { text += '(?:.*/)?'; i += 2; }
      else { text += '.*'; i++; }
    } else if (c === '*') text += '[^/]*';
    else if (c === '?') text += '[^/]';
    else if (c === '{') {
      const end = pattern.indexOf('}', i);
      if (end < 0) throw new Error(`Invalid pattern: ${pattern}`);
      text += '(?:' + pattern.slice(i + 1, end).split(',').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')'; i = end;
    } else if (c === '[') {
      const end = pattern.indexOf(']', i);
      if (end < 0) throw new Error(`Invalid pattern: ${pattern}`);
      text += pattern.slice(i, end + 1); i = end;
    } else text += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${text}$`);
}

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist-electron', 'dist-release', 'log', 'data', '.cache', '.tmp', '.build', 'dist-public', '.patch-backups']);
export function walkFiles(root, prefix = '') {
  const out = [];
  for (const item of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      if (!SKIP_DIRS.has(item.name)) out.push(...walkFiles(root, rel));
    } else out.push(rel);
  }
  return out.sort();
}

export function forbiddenLocalPath(rel) {
  return /(^|\/)(?:\.env(?:\..*)?|\.npmrc|\.git|node_modules|data|log|logs|\.cache|\.tmp)(\/|$)/i.test(rel) && !/\.env(?:\.[a-z]+)?\.example$/.test(rel)
    || /(?:\.__full(?:\/|$)|\.(?:pem|key|p12|pfx|sqlite|sqlite3|db|zip|exe|appimage)$|(?:^|\/)(?:id_rsa|id_ed25519)$)/i.test(rel);
}

export function readPolicy(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'scripts/publish/public-filter.json'), 'utf8'));
}

/** Return source/destination pairs, applying stubs before any keep exception. */
export function publicEntries(root, policy = readPolicy(root)) {
  const deny = policy.deny.map(globRegex);
  const keep = (policy.keep || []).map(globRegex);
  const scopes = Object.entries(policy.allowOnly || {}).filter(([k]) => !k.startsWith('_'))
    .map(([scope, patterns]) => [globRegex(scope), patterns.map(globRegex)]);
  const entries = [];
  for (const rel of walkFiles(root)) {
    if (forbiddenLocalPath(rel) || rel.startsWith('admin-client/dist/') || rel.startsWith('stubs/')) continue;
    const stubbed = (policy.stubs?.dirs || []).some((d) => rel.startsWith(`${d}/`)) || (policy.stubs?.files || []).includes(rel);
    let source = rel;
    if (stubbed) {
      source = `stubs/${rel}`;
      if (!fs.existsSync(path.join(root, source))) continue;
    } else if (!keep.some((re) => re.test(rel))) {
      const scope = scopes.find(([re]) => re.test(rel));
      if (scope ? !scope[1].some((re) => re.test(rel)) : deny.some((re) => re.test(rel))) continue;
    }
    const abs = path.join(root, source);
    if (fs.lstatSync(abs).isSymbolicLink()) throw new Error(`Public output cannot contain symlinks: ${rel}`);
    entries.push({ source, destination: rel });
  }
  return entries;
}

export function verifyPublicAssets(root, version) {
  const dir = path.join(root, 'admin-client', 'dist-public');
  const marker = JSON.parse(fs.readFileSync(path.join(dir, 'aidot-edition.json'), 'utf8'));
  if (marker.edition !== 'public' || marker.version !== version) throw new Error('Rebuild the public console for this version');
  const entries = walkFiles(dir);
  if (entries.some((f) => /(?:HaPage|BackupPage|SecureColumnsPage|MciController|MciTemplate|MciAbbreviations)/i.test(f))) throw new Error('Enterprise view found in public assets');
  return entries.map((f) => ({ source: `admin-client/dist-public/${f}`, destination: `admin-client/dist/${f}` }));
}

export function scanEntries(root, entries, policy = readPolicy(root)) {
  const exempt = (policy.scanExempt || []).map(globRegex);
  const patterns = Object.entries(policy.scan || {}).filter(([key]) => !key.startsWith('_')).map(([key, value]) => [key, new RegExp(value)]);
  const problems = [];
  for (const { source, destination } of entries) {
    const abs = path.join(root, source);
    if (fs.lstatSync(abs).isSymbolicLink()) throw new Error(`Public symlink: ${destination}`);
    const bytes = fs.readFileSync(abs);
    if (/\.(json|csv|tsv|sql)$/i.test(destination) && !/package(-lock)?\.json$/.test(destination) && bytes.length > policy.maxDataFileBytes) problems.push(`${destination}: oversized data file`);
    if (exempt.some((re) => re.test(destination)) || /\.(png|jpe?g|gif|ico|woff2?|ttf|pdf|pptx)$/i.test(destination)) continue;
    const text = bytes.toString('utf8');
    const secret = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b/.test(text);
    if (secret) problems.push(`${destination}: embedded credential`);
    for (const hit of scanText(text)) { problems.push(`${destination}:${hit.line}: ${hit.label}`); break; }
    for (const [key, re] of patterns) if (re.test(text)) { problems.push(`${destination}: ${key}`); break; }
  }
  if (problems.length) throw new Error(`Public content scan failed:\n${problems.join('\n')}`);
}

export function entryManifest(root, entries) {
  return entries.map(({ source, destination }) => ({ path: destination, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, source))).digest('hex') }));
}
