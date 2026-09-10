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

/** Release tooling and assistant workspace notes never belong in Public output. */
export function internalPublicPath(rel) {
  return rel.split('/').some((name) =>
    /^(?:\.claude|\.codex|\.cursor|\.agents|\.patch-backups|\.idea|\.vscode|\.history|__pycache__|\.pytest_cache|\.nyc_output|coverage|playwright-report|test-results)$/i.test(name)
    || /^(?:AGENTS|CLAUDE|GEMINI|COPILOT)(?:[._-].*)?\.md$/i.test(name)
    || /^(?:\.DS_Store|desktop\.ini)$/i.test(name)
    || /(?:\.(?:log|tmp|bak|orig|rej)|~)$/i.test(name)
    || /^(?:apply[-_](?:patch|hotfix)|README[-_](?:patch|hotfix))(?:[-_.].*)?$/i.test(name)
    || /^(?:patch|hotfix)[-_](?:payload|manifest)(?:[-_.].*)?$/i.test(name)
    || /^(?:SOURCE|PATCH|FULL)[-_]MANIFEST(?:[-_.].*)?$/i.test(name)
    || /^verification(?:[-_].*)?\.(?:json|md|txt|log)$/i.test(name));
}

/** One path decision is shared by selection and final source publication. */
export function publicPathDecision(rel, policy) {
  if (forbiddenLocalPath(rel)) return { included: false, reason: 'local-state-or-secret' };
  if (internalPublicPath(rel)) return { included: false, reason: 'internal-release-file' };
  if (rel.startsWith('stubs/') || rel.startsWith('admin-client/dist/') || rel.startsWith('admin-client/dist-public/')) return { included: false, reason: 'generated-or-replacement-input' };
  if (rel.includes('/') && policy.sourceRoots && !policy.sourceRoots.includes(rel.split('/')[0])) return { included: false, reason: 'unreviewed-root-directory' };
  const stubbed = (policy.stubs?.dirs || []).some((d) => rel.startsWith(`${d}/`)) || (policy.stubs?.files || []).includes(rel);
  if (stubbed) return { included: true, source: `stubs/${rel}`, reason: 'reviewed-replacement' };
  if ((policy.deny || []).some((pattern) => globRegex(pattern).test(rel))) return { included: false, reason: 'edition-or-internal-deny' };
  for (const [scope, patterns] of Object.entries(policy.allowOnly || {})) {
    if (!scope.startsWith('_') && globRegex(scope).test(rel) && !patterns.some((pattern) => globRegex(pattern).test(rel))) return { included: false, reason: `not-allowlisted:${scope}` };
  }
  return { included: true, source: rel, reason: 'public-source' };
}

export function assertPublicOutputPaths(names, policy) {
  for (const name of names) {
    if (forbiddenLocalPath(name) || internalPublicPath(name)) throw new Error(`Internal or local file in Public output: ${name}`);
    if (name === 'PUBLIC_MANIFEST.json') continue;
    if (name.startsWith('admin-client/dist/')) {
      if (/(?:HaPage|BackupPage|SecureColumnsPage|MciController|MciTemplate|MciAbbreviations)/i.test(name)) throw new Error(`Enterprise asset in Public output: ${name}`);
      continue;
    }
    const destination = name.startsWith('stubs/') ? name.slice(6) : name;
    const decision = publicPathDecision(destination, policy);
    if (!decision.included || (name.startsWith('stubs/') && decision.source !== name)) throw new Error(`Path is outside the Public allowlist: ${name}`);
  }
}

/** Return the reviewed source/destination pairs, never falling back to Full bytes. */
export function publicEntries(root, policy = readPolicy(root)) {
  const entries = [];
  for (const rel of walkFiles(root)) {
    const decision = publicPathDecision(rel, policy);
    if (!decision.included) continue;
    const source = decision.source;
    if (!fs.existsSync(path.join(root, source))) {
      if ((policy.stubs?.files || []).includes(rel)) throw new Error(`Missing reviewed Public replacement: ${rel}`);
      continue;
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
