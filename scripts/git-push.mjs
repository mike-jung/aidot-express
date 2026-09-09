#!/usr/bin/env node
/**
 * scripts/git-push.mjs — 바뀐 파일을 GitHub 에 올린다. (`npm run push`)
 *
 *  ⚠ 비밀번호는 쓰지 않습니다.
 *    GitHub 는 2021-08-13 부터 **비밀번호로는 git push 를 받지 않습니다.**
 *    `.env` 에 계정/비밀번호를 적어 두어도 인증이 되지 않고, 무엇보다
 *    비밀번호가 파일에 남는 것은 위험합니다(백업·zip·화면 공유로 새어 나갑니다).
 *    대신 **Personal Access Token(PAT)** 을 씁니다 — 권한을 좁힐 수 있고 언제든 취소됩니다.
 *
 *  .env 에 넣을 것:
 *    GITHUB_TOKEN=github_pat_xxxxxxxx (github.com → Settings → Developer settings →
 *                                      Personal access tokens → Fine-grained tokens,
 *                                      이 저장소에 Contents: Read and write 권한만.
                                      fine-grained 는 github_pat_ 로, classic 은 ghp_ 로 시작한다)
 *    GITHUB_REPO=myaccount/aidot-express
 *    GITHUB_BRANCH=main               (없으면 main)
 *    GIT_USER_NAME=마이크              (커밋에 남을 이름 — 없으면 git 설정을 씁니다)
 *    GIT_USER_EMAIL=me@example.com
 *
 *  쓰는 법:
 *    npm run push                      "chore: update (2026-09-06 12:00)" 로 커밋
 *    npm run push -- "간식 API 추가"     메시지를 직접 적을 때
 *    npm run push -- --dry-run         무엇이 올라갈지만 보고 실제로는 안 올림
 */
import { forbiddenLocalPath } from './publish/policy.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const quiet = (cmd, args) => { try { return sh(cmd, args); } catch { return null; } };

/* ── .env 읽기 (dotenv 없이, 이 스크립트만의 최소 파서) ───────────────── */
function readEnv() {
  const out = {};
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...process.env };
}

const env = readEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const message = args.filter((a) => !a.startsWith('--')).join(' ')
  /* ★ 커밋 메시지는 영문으로. 저장소는 세계 어디서나 읽히고,
     GitHub 목록·릴리스 노트·blame 에 그대로 드러난다. */
  || `chore: update (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`;

/* ── 확인 ──────────────────────────────────────────────────────────── */
const token = env.GITHUB_TOKEN || env.GH_TOKEN;
const repo = env.GITHUB_REPO;
const branch = env.GITHUB_BRANCH || 'main';

if (env.GITHUB_PASSWORD || env.GITHUB_PASSWD) {
  console.error('⚠ GITHUB_PASSWORD is not used. GitHub stopped accepting password pushes in 2021.');
  console.error('  Put a Personal Access Token in GITHUB_TOKEN.');
}
if (!token) { console.error('✗ GITHUB_TOKEN is missing from .env (see the comment above).'); process.exit(1); }
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '')) { console.error('✗ Write GITHUB_REPO in .env as "account/repository".'); process.exit(1); }

// Full source must never be sent to an unverified public repository.
if (repo === env.PUBLIC_REPO) throw new Error('GITHUB_REPO must be the private Full repository');
if (dryRun) {
  console.log(`Dry run: Full source target ${repo}, branch ${branch}. A real push verifies private visibility.`);
  console.log(quiet('git', ['status', '--short']) || 'No local status available.');
  process.exit(0);
}
const repositoryResponse = await fetch(`https://api.github.com/repos/${repo}`, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  signal: AbortSignal.timeout(15000),
});
if (!repositoryResponse.ok || (await repositoryResponse.json()).private !== true) {
  throw new Error('Full source push requires a repository verified as private');
}

/* ── git 저장소 준비 ────────────────────────────────────────────────── */
if (!fs.existsSync(path.join(ROOT, '.git'))) {
  console.log('No git repository here — creating one.');
  sh('git', ['init']);
  sh('git', ['checkout', '-B', branch]);
}
if (env.GIT_USER_NAME)  quiet('git', ['config', 'user.name', env.GIT_USER_NAME]);
if (env.GIT_USER_EMAIL) quiet('git', ['config', 'user.email', env.GIT_USER_EMAIL]);

/* ⚠ 토큰이 리모트 URL 에 저장되면 .git/config 에 평문으로 남는다.
   그래서 URL 은 토큰 없이 두고, push 할 때만 토큰이 든 주소를 인자로 준다. */
const cleanUrl = `https://github.com/${repo}.git`;
/* ⚠ 토큰이 든 주소는 만들지 않는다 — 아래 gitPush 참고 */
if (quiet('git', ['remote', 'get-url', 'origin'])) sh('git', ['remote', 'set-url', 'origin', cleanUrl]);
else sh('git', ['remote', 'add', 'origin', cleanUrl]);

/**
 * ★ v1.34.5 — 토큰을 **명령줄에 두지 않는다.**
 *
 *  예전에는 `git push https://<토큰>@github.com/...` 형태로 넘겼다.
 *  평소에는 보이지 않지만, push 가 실패하면 Node 가 실패한 명령을 그대로 출력한다:
 *
 *      Error: Command failed: git push --force https://github_pat_11AD5...@github.com/...
 *
 *  그 순간 토큰이 터미널·CI 로그·화면 공유에 남는다. 실제로 그렇게 새어 나갔다.
 *
 *  → 이제 자격 증명은 **환경변수로만** 넘기고, git 이 그것을 읽도록
 *    임시 credential helper 를 붙인다. 명령줄에는 평범한 주소만 남는다.
 */
function gitPush(args) {
  const url = `https://github.com/${repo}.git`;
  /* helper 는 표준 출력으로 username/password 를 알려 주는 것이면 된다.
     여기서는 환경변수를 그대로 되읽는 한 줄짜리 셸을 쓴다. */
  const helper = '!f(){ echo "username=x"; echo "password=$GIT_TOKEN"; }; f';
  try {
    /* ★ v1.34.6 — 먼저 `credential.helper=` (빈 값)으로 **목록을 비운다.**
       -c 로 helper 를 주면 기존 것에 **덧붙을 뿐** 대체하지 않는다.
       Windows Git 은 전역에 manager 를 설정해 두는데, 그쪽이 먼저 답하면
       예전에 저장해 둔(이미 폐기된) 토큰이 쓰여 이렇게 실패한다:
         remote: Invalid username or token.
       빈 값은 목록을 초기화하라는 뜻이라, 그다음 우리 것만 남는다. */
    execFileSync('git', ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`,
      'push', ...args, url, `HEAD:${branch}`], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, GIT_TOKEN: token, GIT_TERMINAL_PROMPT: '0' },
    });
    return true;
  } catch (e) {
    /* 오류 메시지에 토큰이 섞이지 않도록 우리가 직접 만든다 */
    console.error(`\n✗ push failed (exit ${e.status ?? '?'})`);
    console.error('  · "Invalid username or token" usually means an old token is cached in Windows Credential Manager.');
    console.error('    Control Panel → Credential Manager → Windows Credentials → remove git:https://github.com');
    return false;
  }
}

/* ── 무엇이 올라가는지 먼저 보여 준다 ───────────────────────────────── */
sh('git', ['add', '-A']);
const staged = quiet('git', ['diff', '--cached', '--name-status']) || '';

/* ★ v1.34.4 — 스테이징된 것이 없다고 끝내면 안 된다.
   push 가 실패한 뒤 다시 돌리면 **커밋은 이미 되어 있고 push 만 남은** 상태다.
   예전에는 그때도 "바뀐 것이 없습니다" 로 끝나, 올라가지 않았는데도 할 일이 없다고 말했다.
   (토큰이 만료돼 push 만 실패한 경우가 정확히 이랬다)
   → 아직 올리지 않은 커밋이 있으면 그것을 올린다. */
function unpushedCount() {
  const head = quiet('git', ['rev-parse', 'HEAD']);
  if (!head) return 0;                                  // 커밋이 하나도 없다
  const remote = quiet('git', ['rev-parse', `origin/${branch}`]);
  if (!remote) return -1;                               // 원격을 아직 모른다 → 전부 새것
  const out = quiet('git', ['rev-list', '--count', `origin/${branch}..HEAD`]);
  return Number(out || 0);
}

if (!staged) {
  const n = unpushedCount();
  if (n === 0) { console.log('Nothing changed and nothing to push.'); process.exit(0); }
  const head = quiet('git', ['log', '--oneline', '-1']) || '';
  console.log(n < 0
    ? `\n바뀐 파일은 없습니다. 이 저장소에 아직 아무것도 올린 적이 없어 커밋 전체를 올립니다.\n  최신 커밋: ${head}`
    : `\n바뀐 파일은 없지만 올리지 않은 커밋이 ${n}개 있습니다 — 그것만 올립니다.\n  최신 커밋: ${head}`);
  if (dryRun) { console.log('--dry-run — stopping here.'); process.exit(0); }
  if (!gitPush([])) {
    console.error('  Check the token permission (Contents: Read and write) and the repository name.');
    process.exit(1);
  }
  console.log(`\nPushed → https://github.com/${repo}/tree/${branch}`);
  process.exit(0);
}

const lines = staged.split('\n');
console.log(`\n${lines.length} files to push:`);
for (const l of lines.slice(0, 30)) console.log('  ', l);
if (lines.length > 30) console.log(`   … and ${lines.length - 30} more`);

/* .env 가 섞여 들어가면 즉시 멈춘다 — 비밀이 공개 저장소로 나가는 사고를 막는다 */
/* 파일 이름이 정확히 `.env` 이거나 `.env.local` 류일 때만 막는다.
   `.env.example` 은 올려도 되는 파일이라 걸리면 안 된다(실제로 걸렸었다). */
const isSecretEnv = (line) => {
  const file = line.split(/\t/).pop() || '';
  if (line.startsWith('D\t')) return false;
  return forbiddenLocalPath(file);
};
if (lines.some(isSecretEnv)) {
  console.error('\n✗ .env is in the commit. Add it to .gitignore and run again.');
  sh('git', ['reset']);
  process.exit(1);
}

if (dryRun) { console.log('\n--dry-run — stopping here.'); sh('git', ['reset']); process.exit(0); }

/* ── 커밋 & 올리기 ──────────────────────────────────────────────────── */
sh('git', ['commit', '-m', message]);
console.log(`\nCommit: ${message}`);
if (!gitPush([])) {
  console.error('  Check the token permission (Contents: Read and write) and the repository name.');
  process.exit(1);
}
console.log(`\nPushed → https://github.com/${repo}/tree/${branch}`);
