#!/usr/bin/env node
/** Publish the reviewed Public snapshot; never rewrite the Full working tree. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { exportPublic, root } from './export-public.mjs';
import { publicEntries, verifyPublicAssets, scanEntries, forbiddenLocalPath } from './policy.mjs';

export function parseArgs(args) {
  const options = { push: false, dryRun: false, help: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--push') options.push = true;
    else if (args[i] === '--dry-run') options.dryRun = true;
    else if (['--help', '-h'].includes(args[i])) options.help = true;
    else if (args[i] === '--output') {
      if (!args[i + 1] || args[i + 1].startsWith('--') || options.output) throw new Error('--output requires one empty destination directory');
      options.output = args[++i];
    } else throw new Error(`Unknown option: ${args[i]}. Use --help.`);
  }
  return options;
}

export function readPublishEnv(sourceRoot = root, inherited = process.env) {
  const local = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(sourceRoot, name);
    if (fs.existsSync(file)) Object.assign(local, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  return { ...local, ...inherited };
}

export function publicationConfig(env) {
  const normalize = (value) => {
    const repo = (value || '').trim().replace(/\.git$/i, '');
    if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repo) || ['.', '..'].includes(repo.split('/')[1])) return null;
    return repo;
  };
  const repo = normalize(env.PUBLIC_REPO);
  const fullRepo = normalize(env.GITHUB_REPO);
  if (!repo) throw new Error('Set PUBLIC_REPO=owner/public-repository in .env, .env.local or the environment');
  if (!fullRepo) throw new Error('Set GITHUB_REPO=owner/private-repository to verify the Full/Public separation');
  if (repo.toLowerCase() === fullRepo.toLowerCase()) throw new Error('PUBLIC_REPO must differ from the Full source repository');
  return { repo, branch: env.PUBLIC_BRANCH || 'main' };
}

export function createGitRunner(target, env = process.env) {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN || '';
  const helper = '!f(){ echo "username=x"; echo "password=$GIT_TOKEN"; }; f';
  const auth = token ? ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`] : [];
  const childEnv = { ...process.env, GIT_TOKEN: token, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };
  // A parent shell's Git routing must not redirect writes into the Full repository.
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE']) delete childEnv[key];
  return (argv, { input, allowed = [0] } = {}) => {
    const result = spawnSync('git', [...auth, '-c', 'core.hooksPath=.git/aidot-no-hooks', ...argv], {
      cwd: target, env: childEnv, input, maxBuffer: 64 * 1024 * 1024, timeout: 120000,
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (result.error || !allowed.includes(result.status)) {
      let detail = (result.stderr || '').toString().slice(-3000);
      for (const secret of [env.GITHUB_TOKEN, env.GH_TOKEN].filter(Boolean)) detail = detail.split(secret).join('[REDACTED]');
      throw new Error(`Git ${argv[0]} failed (exit ${result.status ?? 'unavailable'}). ${detail.trim()}\nCheck Git access, repository/branch settings and write permission. No force push was attempted.`);
    }
    return { status: result.status, stdout: (result.stdout || Buffer.alloc(0)) };
  };
}

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function sameNames(left, right) {
  const sorted = [...right].sort();
  return left.length === right.length && [...left].sort().every((name, i) => name === sorted[i]);
}

function readSnapshot(target) {
  if (fs.lstatSync(target).isSymbolicLink() || fs.existsSync(path.join(target, '.git'))) throw new Error('Publication requires a fresh export directory without .git');
  const files = [];
  function visit(dir, prefix = '') {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = prefix + item.name;
      if (item.isSymbolicLink()) throw new Error(`Public symlink: ${name}`);
      if (item.isDirectory()) visit(path.join(dir, item.name), name + '/');
      else if (item.isFile()) files.push(name);
      else throw new Error(`Public output must contain regular files: ${name}`);
    }
  }
  visit(target);
  const manifest = JSON.parse(fs.readFileSync(path.join(target, 'PUBLIC_MANIFEST.json'), 'utf8'));
  if (manifest.edition !== 'public' || !Array.isArray(manifest.files)) throw new Error('Invalid Public manifest');
  const names = manifest.files.map((entry) => entry.path);
  for (const entry of manifest.files) {
    const name = entry.path;
    if (typeof name !== 'string' || /[\\\x00-\x1f]/.test(name) || path.posix.isAbsolute(name) || name.split('/').some((part) => !part || part === '.' || part === '..') || forbiddenLocalPath(name)) throw new Error('Unsafe Public manifest path');
    if (sha256(fs.readFileSync(path.join(target, name))) !== entry.sha256) throw new Error(`Public export hash mismatch: ${name}`);
  }
  if (new Set(names).size !== names.length || !sameNames(files, [...names, 'PUBLIC_MANIFEST.json'])) throw new Error('Public manifest does not match the complete exported file set');
  return manifest;
}

function stageSnapshot(target, manifest, git) {
  // Force-add only this isolated, verified export: the console's dist directory is ignored.
  git(['add', '--force', '--all', '--', '.']);
  const staged = git(['ls-files', '--stage', '-z']).stdout.toString().split('\0').filter(Boolean).map((line) => {
    const match = /^(100644|100755) ([a-f0-9]+) 0\t([\s\S]+)$/.exec(line);
    if (!match) throw new Error('Unexpected index entry in Public snapshot');
    return { oid: match[2], name: match[3] };
  });
  if (!sameNames(staged.map((entry) => entry.name), [...manifest.files.map((entry) => entry.path), 'PUBLIC_MANIFEST.json'])) throw new Error('Git index does not match the Public manifest');
  // Git attributes can normalize CRLF. Hash the actual staged bytes so the published
  // manifest remains verifiable on Windows, and retain those bytes in the export.
  const batch = git(['cat-file', '--batch'], { input: staged.map((entry) => entry.oid).join('\n') + '\n' }).stdout;
  const hashes = new Map();
  let offset = 0;
  for (const entry of staged) {
    const end = batch.indexOf(10, offset);
    const header = batch.subarray(offset, end).toString().split(' ');
    const size = Number(header[2]);
    if (end < 0 || header[0] !== entry.oid || header[1] !== 'blob' || !Number.isSafeInteger(size) || size < 0 || end + size + 1 >= batch.length) throw new Error('Invalid Git object response');
    const bytes = batch.subarray(end + 1, end + 1 + size);
    offset = end + size + 2;
    hashes.set(entry.name, sha256(bytes));
    if (entry.name !== 'PUBLIC_MANIFEST.json') fs.writeFileSync(path.join(target, entry.name), bytes);
  }
  for (const entry of manifest.files) entry.sha256 = hashes.get(entry.path);
  fs.writeFileSync(path.join(target, 'PUBLIC_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  git(['add', '--force', '--', 'PUBLIC_MANIFEST.json']);
}

/** git injection is used by integration tests with disposable local bare repositories. */
export function publishSnapshot({ target, repo, branch = 'main', env = process.env, git = createGitRunner(target, env) }) {
  const manifest = readSnapshot(target);
  git(['check-ref-format', '--branch', branch]);
  git(['init', '--quiet', '--template=', '--initial-branch', branch]);
  // Disable content filters from a user's global Git configuration. Text attributes
  // still normalize source line endings; no external filter processes are needed.
  fs.mkdirSync(path.join(target, '.git/info'), { recursive: true });
  fs.writeFileSync(path.join(target, '.git/info/attributes'), '* -filter -ident -working-tree-encoding\n');
  git(['remote', 'add', 'origin', `https://github.com/${repo}.git`]);
  const ref = `refs/heads/${branch}`;
  const remote = git(['ls-remote', '--exit-code', '--heads', 'origin', ref], { allowed: [0, 2] });
  const existing = remote.status === 0;
  if (existing) {
    git(['fetch', '--depth=1', '--no-tags', 'origin', ref]);
    git(['reset', '--soft', 'FETCH_HEAD']);
  } else if (git(['ls-remote', '--heads', 'origin']).stdout.length) {
    throw new Error(`Public branch ${branch} is missing in an existing repository. Set PUBLIC_BRANCH to the intended branch.`);
  }
  stageSnapshot(target, manifest, git);
  if (existing && git(['diff', '--cached', '--quiet', '--exit-code'], { allowed: [0, 1] }).status === 0) {
    return { status: 'unchanged', repo, branch, target, version: manifest.version, files: manifest.files.length };
  }
  if (env.GIT_USER_NAME) git(['config', 'user.name', env.GIT_USER_NAME]);
  if (env.GIT_USER_EMAIL) git(['config', 'user.email', env.GIT_USER_EMAIL]);
  git(['commit', '--quiet', '-m', `Release v${manifest.version}`]);
  git(['push', 'origin', `HEAD:${ref}`]);
  return { status: 'pushed', repo, branch, target, version: manifest.version, files: manifest.files.length };
}

export function main(args = process.argv.slice(2), sourceRoot = root, log = console.log) {
  const options = parseArgs(args);
  if (options.help) {
    log('npm run sync:public                 Publish Public source to GitHub\nnpm run sync:public -- --dry-run     Check the Public policy; no export or remote writes\nnpm run export:public               Export files locally; no GitHub update\nSettings: PUBLIC_REPO, GITHUB_REPO, optional PUBLIC_BRANCH (default main).\nCredentials: GITHUB_TOKEN / GH_TOKEN or the configured Git credential helper.');
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
  if (options.dryRun) {
    const entries = [...publicEntries(sourceRoot), ...verifyPublicAssets(sourceRoot, pkg.version)];
    scanEntries(sourceRoot, entries);
    log(`Public policy passed: ${entries.length} files. Dry run: no export, commit or push. Authentication is not checked.`);
    return;
  }
  const env = options.push ? readPublishEnv(sourceRoot) : {};
  const config = options.push ? publicationConfig(env) : null;
  const result = exportPublic(options.output, sourceRoot);
  log(`Public export: ${result.target} (${result.files} files, v${result.version})`);
  if (!options.push) {
    log('Export only: GitHub was not updated. To publish, run npm run sync:public (or node scripts/publish/sync-public.mjs --push).');
    return { ...result, status: 'exported' };
  }
  log(`Publishing Public source to https://github.com/${config.repo} [${config.branch}] ...`);
  try {
    const published = publishSnapshot({ target: result.target, ...config, env });
    log(published.status === 'pushed' ? `Public source pushed: https://github.com/${config.repo}/tree/${config.branch}` : `Public source is already up to date: ${config.repo} [${config.branch}]. No new commit needed.`);
    return published;
  } catch (error) {
    throw new Error(`${error.message}\nPublic sync did not complete. Export retained at: ${result.target}\nFix the reported error and rerun npm run sync:public.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error(`Public sync failed: ${error.message}`); process.exitCode = 1; }
}
