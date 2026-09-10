#!/usr/bin/env node
/** Publish Full source with verified private visibility and preserved Git history. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { forbiddenLocalPath } from './publish/policy.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const split0 = (text) => text.split('\0').filter(Boolean);

export function parseArgs(args) {
  const options = { dryRun: false, linkHistory: false, help: false };
  const message = [];
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--link-history') options.linkHistory = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}. Use --help.`);
    else message.push(arg);
  }
  options.message = message.join(' ') || `chore: update (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`;
  return options;
}

export function readPublishEnv(target = root, inherited = process.env) {
  const values = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(target, name);
    if (fs.existsSync(file)) Object.assign(values, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  return { ...values, ...inherited };
}

function normalizeRepo(value) {
  const repo = (value || '').trim().replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repo) || ['.', '..'].includes(repo.split('/')[1])) return null;
  return repo;
}

export function publicationConfig(env) {
  const repo = normalizeRepo(env.GITHUB_REPO);
  if (!repo) throw new Error('Set GITHUB_REPO=owner/private-repository in .env, .env.local or the environment.');
  if (repo.toLowerCase() === normalizeRepo(env.PUBLIC_REPO)?.toLowerCase()) throw new Error('GITHUB_REPO must differ from PUBLIC_REPO.');
  const branch = env.GITHUB_BRANCH || 'main';
  if (branch.startsWith('-') || branch === 'HEAD' || /[\s\x00-\x1f]/.test(branch)) throw new Error('Invalid GITHUB_BRANCH.');
  return { repo, branch };
}

export function gitFailureHint(detail) {
  if (/non-fast-forward|fetch first|\[rejected\].*\(stale info\)/i.test(detail)) return '원격 브랜치가 더 진행되었거나 이력이 갈라졌습니다. npm run push를 다시 실행해 최신 이력을 통합하세요. 강제 push는 하지 않습니다.';
  if (/GH006|GH013|protected branch|repository rule|pre-receive hook declined/i.test(detail)) return '저장소의 브랜치 보호/검사 규칙이 거절했습니다. 해당 규칙에 따라 PR 또는 검사를 진행하세요.';
  if (/authentication failed|invalid username|could not read Username|HTTP (401|403)|error: (401|403)|permission.*denied|write access.*not granted/i.test(detail)) return '인증 또는 쓰기 권한을 확인하세요. GITHUB_TOKEN/GH_TOKEN의 저장소 접근과 Contents: Read and write 권한이 필요합니다.';
  if (/could not resolve|failed to connect|timed out|SSL certificate|connection.*(reset|closed)/i.test(detail)) return '네트워크, 프록시 및 인증서 연결을 확인한 후 다시 실행하세요.';
  return '위 Git 오류를 확인하세요. 생성된 로컬 커밋은 보존되어 있습니다.';
}

export function createGitRunner(target, env = process.env) {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN || '';
  const helper = '!f(){ echo "username=x"; echo "password=$GIT_TOKEN"; }; f';
  const auth = token ? ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`] : [];
  const childEnv = { ...process.env, GIT_TOKEN: token, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE']) delete childEnv[key];
  // Existing repository hooks remain enabled for commits, merges and pushes.
  return (args, { allowed = [0], input, index } = {}) => {
    const result = spawnSync('git', [...auth, ...args], {
      cwd: target, env: index ? { ...childEnv, GIT_INDEX_FILE: index } : childEnv,
      input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000, windowsHide: true,
    });
    if (result.error || !allowed.includes(result.status)) {
      let detail = `${result.stdout || ''}\n${result.stderr || ''}\n${result.error?.message || ''}`.trim();
      for (const secret of [env.GITHUB_TOKEN, env.GH_TOKEN].filter(Boolean)) detail = detail.split(secret).join('[REDACTED]');
      detail = detail.replace(/https:\/\/[^\s/]+@github\.com/gi, 'https://[REDACTED]@github.com');
      throw new Error(`Git ${args[0]} failed (exit ${result.status ?? 'unavailable'}):\n${detail.slice(-4000)}\n${gitFailureHint(detail)}`);
    }
    return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
  };
}

export async function verifyPrivateRepository(repo, token, fetchImpl = fetch) {
  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required to verify private repository access.');
  const response = await fetchImpl(`https://api.github.com/repos/${repo}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Private repository verification failed (HTTP ${response.status}). Check repository identity and token access.`);
  const repository = await response.json();
  if (repository.private !== true) throw new Error('Full source push requires a repository verified as private.');
  if (repository.permissions?.push !== true) throw new Error('The token does not have push access to this private repository.');
}

function originRepository(url) {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^\s]+?)\/?$/i.exec(url);
  return match ? normalizeRepo(match[1])?.toLowerCase() : null;
}

function inspectRepository(target, git, repo, branch) {
  git(['check-ref-format', '--branch', branch]);
  if (!fs.existsSync(path.join(target, '.git'))) {
    if (git(['rev-parse', '--show-toplevel'], { allowed: [0, 128] }).status === 0) throw new Error('The project is inside another Git repository. Use a separate extraction folder.');
    return { initialized: false, head: null };
  }
  const current = git(['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowed: [0, 1] });
  if (current.status !== 0 || current.stdout.trim() !== branch) throw new Error(`Current branch must be ${branch}. Review or switch branches before publishing.`);
  for (const state of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer']) {
    const name = git(['rev-parse', '--git-path', state]).stdout.trim();
    if (fs.existsSync(path.resolve(target, name))) throw new Error(`An unfinished Git operation exists (${state}). Complete or abort it before npm run push.`);
  }
  if (git(['ls-files', '-u', '-z']).stdout) throw new Error('Resolve the existing index conflicts before npm run push.');
  const origin = git(['remote', 'get-url', 'origin'], { allowed: [0, 2] });
  if (origin.status === 0 && originRepository(origin.stdout.trim()) !== repo.toLowerCase()) throw new Error('Existing origin differs from GITHUB_REPO or contains an unsafe URL. Review it; it will not be overwritten.');
  const head = git(['rev-parse', '--verify', 'HEAD'], { allowed: [0, 128] });
  return { initialized: true, head: head.status === 0 ? head.stdout.trim() : null, hasOrigin: origin.status === 0 };
}

function assertSafeTree(git, tree) {
  const entries = split0(git(['ls-tree', '-r', '-z', tree]).stdout);
  for (const entry of entries) {
    const file = entry.slice(entry.indexOf('\t') + 1);
    if (forbiddenLocalPath(file)) throw new Error(`Publication blocked: excluded local file in candidate tree: ${file}`);
    if (/^(120000|160000) /.test(entry)) throw new Error(`Publication blocked: symlink or submodule requires separate review: ${file}`);
  }
}

function assertSafeHistory(git, head, remote) {
  const range = remote ? [head, `^${remote}`] : [head];
  const files = split0(git(['log', '-m', '--root', '--no-renames', '--format=', '--name-only', '-z', '--diff-filter=AM', ...range, '--']).stdout);
  const bad = [...new Set(files.filter(forbiddenLocalPath))];
  if (bad.length) throw new Error(`Publication blocked: excluded local files exist in outgoing commits, even if deleted later:\n${bad.join('\n')}\nReview those unpublished commits before retrying.`);
}

function candidateTree(target, git, parent, overlay) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-full-index-'));
  const index = path.join(temp, 'index');
  try {
    const current = path.resolve(target, git(['rev-parse', '--git-path', 'index']).stdout.trim());
    if (!overlay && fs.existsSync(current)) fs.copyFileSync(current, index);
    else git(parent ? ['read-tree', parent] : ['read-tree', '--empty'], { index });
    git(overlay ? ['add', '--ignore-removal', '--', '.'] : ['add', '-A', '--', '.'], { index });
    const tree = git(['write-tree'], { index }).stdout.trim();
    assertSafeTree(git, tree);
    return tree;
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

function backupHead(git, head, log) {
  if (!head) return;
  const ref = `refs/aidot-backups/push-${Date.now()}-${randomUUID().slice(0, 8)}`;
  git(['update-ref', ref, head]);
  log(`Local recovery ref: ${ref}`);
}

function bootstrap(target, git, tree, remote, branch) {
  // A ZIP has no deletion history. Keep remote-only files on the first overlay.
  // Do not overwrite local ignored files or follow a local directory symlink.
  const missing = [];
  for (const file of split0(git(['ls-tree', '-r', '--name-only', '-z', tree]).stdout)) {
    const parts = file.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const p = path.join(target, ...parts.slice(0, i));
      let stat;
      try { stat = fs.lstatSync(p); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (stat?.isSymbolicLink() || (stat && i < parts.length && !stat.isDirectory())) throw new Error(`Cannot safely restore remote path: ${file}`);
      if (i === parts.length) {
        if (stat && !stat.isFile()) throw new Error(`Local path conflicts with remote file: ${file}`);
        if (!stat) missing.push(file);
      }
    }
  }
  git(['read-tree', tree]);
  // No force flag: checkout-index fills only paths verified absent above.
  if (missing.length) git(['checkout-index', '-z', '--stdin'], { input: missing.join('\0') + '\0' });
  if (remote) git(['update-ref', `refs/heads/${branch}`, remote, '']);
}

/** Core transport is injected by regression tests; the CLI always verifies GitHub privacy. */
export function publishFull({ target = root, repo, branch = 'main', env = process.env,
  message = 'chore: update', linkHistory = false, git = createGitRunner(target, env), log = console.log }) {
  const state = inspectRepository(target, git, repo, branch);
  const cleanUrl = `https://github.com/${repo}.git`;
  // Read all heads to distinguish a typo from a completely empty repository.
  const heads = git(['ls-remote', '--heads', cleanUrl]).stdout.trim().split('\n').filter(Boolean);
  const found = heads.find((line) => line.split(/\s+/)[1] === `refs/heads/${branch}`);
  if (!found && heads.length) throw new Error(`Remote branch ${branch} is missing in a populated repository. Check GITHUB_BRANCH.`);
  if (!state.initialized) git(['init', '--quiet', `--initial-branch=${branch}`]);
  if (!state.hasOrigin) git(['remote', 'add', 'origin', cleanUrl]);
  if (env.GIT_USER_NAME) git(['config', 'user.name', env.GIT_USER_NAME]);
  if (env.GIT_USER_EMAIL) git(['config', 'user.email', env.GIT_USER_EMAIL]);
  let remote = null;
  if (found) {
    git(['fetch', '--no-tags', cleanUrl, `refs/heads/${branch}`]);
    remote = git(['rev-parse', '--verify', 'FETCH_HEAD']).stdout.trim();
    git(['update-ref', `refs/remotes/origin/${branch}`, remote]);
  }
  let head = state.head;
  if (head) assertSafeHistory(git, head, remote);
  const related = !head || !remote || git(['merge-base', head, remote], { allowed: [0, 1] }).status === 0;
  if (!related && !linkHistory) throw new Error('로컬과 원격은 공통 조상이 없는 별도 이력입니다. 두 트리를 검토한 후 npm run push -- --link-history로 연결하세요. 파일과 커밋은 보존되어 있습니다.');
  const tree = candidateTree(target, git, head || remote, !head);
  backupHead(git, head, log);
  if (!head) {
    bootstrap(target, git, tree, remote, branch);
    head = remote;
  } else git(['read-tree', tree]);
  if (!head || git(['diff', '--cached', '--quiet'], { allowed: [0, 1] }).status !== 0) {
    log(git(['commit', '-m', message]).stdout.trim());
    head = git(['rev-parse', 'HEAD']).stdout.trim();
  }
  if (remote && git(['merge-base', '--is-ancestor', remote, head], { allowed: [0, 1] }).status !== 0) {
    const mergeArgs = ['merge-tree', '--write-tree', '--name-only', '-z'];
    if (!related) mergeArgs.push('--allow-unrelated-histories');
    const preview = git([...mergeArgs, head, remote], { allowed: [0, 1] });
    if (preview.status !== 0) {
      const records = preview.stdout.split('\0');
      const end = records.indexOf('', 1);
      const conflicts = records.slice(1, end < 0 ? undefined : end);
      throw new Error(`Merge conflict; no merge was started. Local commit ${head.slice(0, 12)} is preserved.\n${conflicts.join('\n')}\nReview with git diff HEAD FETCH_HEAD. Then git merge${related ? '' : ' --allow-unrelated-histories'} FETCH_HEAD, resolve conflicts, git add, git commit, and rerun npm run push.`);
    }
    assertSafeTree(git, preview.stdout.split('\0')[0]);
    const args = ['merge', '--no-edit'];
    if (!related) args.push('--allow-unrelated-histories');
    log(git([...args, remote]).stdout.trim());
    head = git(['rev-parse', 'HEAD']).stdout.trim();
  }
  assertSafeTree(git, head);
  assertSafeHistory(git, head, remote);
  if (git(['status', '--porcelain']).stdout.trim()) throw new Error('Files changed during publication (possibly a hook). Review and rerun npm run push.');
  const ahead = Number(git(['rev-list', '--count', ...(remote ? [`${remote}..${head}`] : [head])]).stdout.trim());
  if (!ahead) {
    git(['branch', `--set-upstream-to=origin/${branch}`, branch]);
    log('Nothing changed and nothing to push. Remote history is up to date.');
    return { status: 'unchanged', head, remote, ahead };
  }
  log(`Publishing ${ahead} local commit(s) after fetching the current remote branch.`);
  // Normal push detects a concurrent remote advance. Never use --force.
  log(git(['push', '--porcelain', cleanUrl, `HEAD:refs/heads/${branch}`]).stdout.trim());
  git(['update-ref', `refs/remotes/origin/${branch}`, head]);
  git(['branch', `--set-upstream-to=origin/${branch}`, branch]);
  return { status: 'pushed', head, remote, ahead };
}

export async function main(args = process.argv.slice(2), { target = root, env = readPublishEnv(target), fetchImpl = fetch, log = console.log } = {}) {
  const options = parseArgs(args);
  if (options.help) { log('npm run push -- [commit message] [--dry-run] [--link-history]\nFull source only. Existing Git history is fetched and preserved before a normal push.'); return; }
  const { repo, branch } = publicationConfig(env);
  if (JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).aidotEdition !== 'full') throw new Error('npm run push requires Full source. Use npm run sync:public from the Full project for Public publication.');
  if (env.GITHUB_PASSWORD || env.GITHUB_PASSWD) log('GITHUB_PASSWORD is not used. Set GITHUB_TOKEN or GH_TOKEN.');
  const git = createGitRunner(target, env);
  if (options.dryRun) {
    const state = inspectRepository(target, git, repo, branch);
    log(`Dry run: ${repo}, branch ${branch}. No fetch, commit, index or remote changes. Private access and remote freshness are not checked.`);
    log(state.initialized ? git(['--no-optional-locks', 'status', '--short']).stdout.trim() || 'No working changes.' : 'New extraction: existing remote history will be used as the parent.');
    return { status: 'dry-run' };
  }
  await verifyPrivateRepository(repo, env.GITHUB_TOKEN || env.GH_TOKEN, fetchImpl);
  const result = publishFull({ target, repo, branch, env, git, log, ...options });
  log(`${result.status}: https://github.com/${repo}/tree/${branch} (${result.head.slice(0, 12)})`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`✗ ${error.message}`); process.exitCode = 1; });
}
