#!/usr/bin/env node
/**
 * scripts/start.mjs — `npm start` 한 번으로 전부 준비해서 서버를 띄우는 오케스트레이터.
 *
 *  순서
 *   0) Node 버전 확인 (>= 20.19)
 *   1) .env 가 없으면 .env.example 을 복사해 생성 (AUTH_ACCESS_SECRET 은 랜덤 값 자동 주입)
 *   2) 루트 의존성: package.json/package-lock.json 해시가 바뀌었거나 node_modules 가 없으면 `npm install`
 *   3) 관리자 콘솔(admin-client):
 *        - admin-client/src, index.html, vite.config.js, public 의 내용 해시가 바뀌었거나 dist 가 없으면 `vite build`
 *        - 빌드가 필요한데 admin-client/node_modules 가 없거나 package.json 이 바뀌었으면 먼저 `npm install`
 *   4) DB 마이그레이션: 서버가 기동하면서 자동 적용 (src/database/migrationRunner.js) — 별도 명령 불필요
 *   5) 서버 기동: supervisor(컨트롤 API) → 메인 서버
 *
 *  옵션 (환경변수 / 인자)
 *   --no-install   AIDOT_AUTO_INSTALL=false   의존성 자동 설치 건너뜀
 *   --no-build     AIDOT_AUTO_BUILD=false     콘솔 자동 빌드 건너뜀
 *   --force-build                             해시와 무관하게 콘솔 빌드
 *   --prepare-only                            준비 단계만 수행하고 서버는 띄우지 않음 (CI/설치 검증용)
 *   --skip-env-pause                          .env 를 새로 만든 직후에도 멈추지 않고 계속 진행
 *   --main                                    supervisor 없이 메인 서버만 기동 (기존 start:main 과 동일)
 *
 *  상태 파일: .cache/*.hash (git 에 포함하지 않음)
 */
import { ensureEnvSecret } from '../src/core/secretPolicy.cjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const flag = (name, envKey) => !args.has(`--no-${name}`) && process.env[envKey] !== 'false' && process.env[envKey] !== '0';
const AUTO_INSTALL = flag('install', 'AIDOT_AUTO_INSTALL');
const AUTO_BUILD = flag('build', 'AIDOT_AUTO_BUILD');
const FORCE_BUILD = args.has('--force-build');
const PREPARE_ONLY = args.has('--prepare-only');
const MAIN_ONLY = args.has('--main');
const cacheDir = path.join(root, '.cache');
const isWin = process.platform === 'win32';

const log = (m) => process.stdout.write(`[start] ${m}\n`);
const warn = (m) => process.stderr.write(`[start] ⚠ ${m}\n`);

function run(cmd, cmdArgs, cwd) {
  log(`$ ${cmd} ${cmdArgs.join(' ')}   (cwd=${path.relative(root, cwd) || '.'})`);
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: 'inherit', shell: isWin, env: process.env });
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} 실패 (exit=${r.status})`);
}
function hashFiles(files) {
  const h = crypto.createHash('sha256');
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    h.update(path.relative(root, f)); h.update('\0');
    h.update(fs.readFileSync(f)); h.update('\0');
  }
  return h.digest('hex');
}
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out.sort();
}
const readHash = (name) => { try { return fs.readFileSync(path.join(cacheDir, name), 'utf8').trim(); } catch { return null; } };
const writeHash = (name, v) => { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(path.join(cacheDir, name), v); };

/* 0) Node 버전 */
{
  const [maj, min] = process.versions.node.split('.').map(Number);
  if (maj < 20 || (maj === 20 && min < 19)) {
    warn(`Node.js ${process.versions.node} 감지 — 20.19 이상(권장 22 LTS 이상)이 필요합니다. https://nodejs.org`);
    process.exit(1);
  }
  log(`Node.js ${process.versions.node} OK`);
}

/* 1) .env 준비 */
{
  const envPath = process.env.AIDOT_ENV_FILE || path.join(root, '.env');
  const example = path.join(root, '.env.example');

  /**
   * ★ v1.10.38 — **이미 있는 `.env` 에도** 시크릿을 채운다.
   *
   *  예전에는 `.env` 를 새로 만들 때만 랜덤 값을 넣었다. 그래서 예제에서
   *  복사했거나 예전 판부터 쓰던 `.env` 는 시크릿이 비어 있거나 배포본
   *  기본값(`CHANGE_ME_...`)인 채로 남았다.
   *
   *  그 상태에서는 개발 모드에서 **프로세스마다 임시 시크릿을 따로 만든다.**
   *  supervisor(control API)와 메인 서버는 별개 프로세스이므로 서로 다른
   *  값을 갖게 되고, 메인이 발급한 토큰을 control 이 검증하면 **반드시**
   *  실패한다 — 대시보드의 `Invalid token` 이 정확히 이것이었다.
   *
   *  ⚠ 소스에 고정 기본값을 넣는 방법은 쓰지 않는다. 배포본을 받은 사람이
   *    모두 같은 값을 갖게 되어, 누구나 admin 토큰을 위조할 수 있다.
   *    설치본마다 **다른** 값을 만들어 `.env` 에 적어 두는 것이 맞다.
   */
  const ensureSecret = (file) => ensureEnvSecret(file);
  if (!fs.existsSync(envPath) && fs.existsSync(example) && !process.env.AIDOT_ENV_FILE) {
    const secret = crypto.randomBytes(48).toString('base64url');
    let text = fs.readFileSync(example, 'utf8');
    text = text.replace(/^AUTH_ACCESS_SECRET=.*$/m, `AUTH_ACCESS_SECRET=${secret}`);
    fs.writeFileSync(envPath, text, 'utf8');

    // ⚠ v1.7.2: 예전에는 안내 한 줄만 찍고 그대로 기동했다.
    //   .env.example 의 DB_PASSWORD 는 자리표시자이므로 MariaDB 접속이 100% 실패하고,
    //   사용자는 수백 줄 로그가 지나간 뒤 "로그인은 되는데 DB 접속 실패" 만 보게 된다.
    //   → 여기서 멈추고 무엇을 채워야 하는지 알려 준다. (건너뛰려면 --skip-env-pause)
    const banner = [
      '',
      '╔══════════════════════════════════════════════════════════════════════════════╗',
      '║  .env 파일을 새로 만들었습니다 — DB 접속 정보를 채운 뒤 다시 실행하세요        ║',
      '╚══════════════════════════════════════════════════════════════════════════════╝',
      `  파일: ${envPath}`,
      '',
      '  ① MariaDB 를 쓰는 경우 — 아래 두 줄을 실제 값으로 바꿉니다',
      '       DB_USER=aidot',
      '       DB_PASSWORD=여기에_DB_비밀번호      ← 실제 비밀번호로 교체',
      '     (MariaDB 설치·계정 만들기: docs/BUILD_AND_RELEASE.md)',
      '',
      '  ② DB 설치 없이 바로 써 보려면 — 한 줄만 바꾸면 됩니다',
      '       DB_TYPE=sqlite',
      '',
      '  다 고쳤으면  npm start  를 다시 실행하세요.',
      '  (AUTH_ACCESS_SECRET 은 랜덤 값으로 이미 채워 두었습니다)',
      '',
    ].join('\n');
    process.stdout.write(banner + '\n');
    if (!args.has('--skip-env-pause')) process.exit(0);
  } else {
    // 이미 있는 .env — 시크릿이 비었거나 기본값이면 여기서 채운다
    const did = ensureSecret(envPath);
    if (did) {
      console.log(`[start] AUTH_ACCESS_SECRET ${did === 'added' ? 'added' : 'regenerated'} `
        + '(비어 있거나 배포본 기본값이었습니다). 기존 로그인 세션은 만료됩니다.');
    }
  }
}

/* 2) 루트 의존성 */
{
  const files = [path.join(root, 'package.json'), path.join(root, 'package-lock.json')];
  const want = hashFiles(files);
  const have = readHash('deps-root.hash');
  const hasModules = fs.existsSync(path.join(root, 'node_modules', 'express', 'package.json'));
  if (!hasModules || want !== have) {
    if (!AUTO_INSTALL) warn('의존성 변경 감지 — --no-install 로 설치를 건너뜁니다.');
    else {
      log(hasModules ? 'package.json 변경 감지 → 의존성 설치' : 'node_modules 없음 → 의존성 설치');
      try {
        run('npm', ['install', '--no-audit', '--no-fund', '--omit=dev'], root);
        writeHash('deps-root.hash', want);
      } catch (e) {
        // 사내망/오프라인처럼 레지스트리에 못 붙는 환경 — 이미 설치된 node_modules 가 있으면 그대로 진행한다.
        if (!hasModules) throw new Error(`${e.message}\n  → 인터넷 연결(또는 사내 npm 미러 설정)을 확인하세요. npm config set registry <주소>`);
        warn(`의존성 설치 실패 — 기존 node_modules 로 계속 진행합니다: ${e.message}`);
      }
    }
  } else log('루트 의존성 최신 상태');
}

/* 3) 관리자 콘솔 빌드 */
{
  const ac = path.join(root, 'admin-client');
  if (fs.existsSync(path.join(ac, 'package.json'))) {
    const srcFiles = [...walk(path.join(ac, 'src')), ...walk(path.join(ac, 'public')),
      path.join(ac, 'index.html'), path.join(ac, 'vite.config.js'), path.join(ac, 'vite.public.js'), path.join(ac, 'edition-plugin.js'), path.join(ac, 'package.json'), path.join(root, 'package.json')];
    const want = hashFiles(srcFiles);
    const have = readHash('admin-client.hash');
    const hasDist = fs.existsSync(path.join(ac, 'dist', 'index.html'));
    const needBuild = FORCE_BUILD || !hasDist || want !== have;
    if (!needBuild) log('관리자 콘솔(admin-client/dist) 최신 상태');
    else if (!AUTO_BUILD) warn('콘솔 소스 변경 감지 — --no-build 로 빌드를 건너뜁니다.');
    else {
      log(hasDist ? '콘솔 소스 변경 감지 → vite build' : 'admin-client/dist 없음 → vite build');
      const depWant = hashFiles([path.join(ac, 'package.json'), path.join(ac, 'package-lock.json')]);
      const depHave = readHash('deps-admin-client.hash');
      const hasMods = fs.existsSync(path.join(ac, 'node_modules', 'vite', 'package.json'));
      if (!hasMods || depWant !== depHave) {
        if (!AUTO_INSTALL) throw new Error('admin-client/node_modules 가 없어 빌드할 수 없습니다 (--no-install 해제 필요)');
        run('npm', ['install', '--no-audit', '--no-fund'], ac);
        writeHash('deps-admin-client.hash', depWant);
      }
      run('npm', ['run', 'build'], ac);
      writeHash('admin-client.hash', want);
    }
  }
}

/* 4) 마이그레이션 안내 */
log('DB 마이그레이션: 서버 기동 시 schema_migrations 기준으로 미적용 파일만 자동 적용됩니다.');

// v1.7.4: e2e 테스트 잔여물 경고.
//   v1.7.2 가 소스에서 지웠지만 patch zip 은 파일을 **덮어쓸 뿐 지우지 못한다.**
//   그래서 v1.7.1 이하에서 올라온 폴더에는 E2eRt*Controller 가 그대로 남아 라우트로 등록된다.
//   사용자 파일을 임의로 지우지 않고 알리기만 한다.
try {
  const leftovers = [];
  for (const [dir, re] of [
    [path.join(root, 'src', 'controller'), /^E2eRt.*Controller\.js$/],
    [path.join(root, 'src', 'service'), /^E2eRt.*Service\.js$/],
    [path.join(root, 'src', 'database', 'sql'), /^e2e_rt_.*\.sql$/],
  ]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (re.test(f)) leftovers.push(path.relative(root, path.join(dir, f)));
  }
  if (leftovers.length) {
    warn(`e2e 테스트 잔여물 ${leftovers.length}개가 남아 있습니다 — 실제 API 로 등록됩니다.`);
    for (const f of leftovers.slice(0, 8)) warn(`   ${f}`);
    warn('   지우려면: 위 파일 삭제 + DELETE FROM admin_controllers WHERE name LIKE \'E2eRt%\';');
  }
} catch { /* 점검 실패는 기동을 막지 않는다 */ }

if (PREPARE_ONLY) { log('--prepare-only: 준비 완료. 서버는 기동하지 않습니다.'); process.exit(0); }

/* 5) 서버 기동 */
{
  const entry = MAIN_ONLY ? 'src/app.js' : 'src/supervisor.js';
  const nodeArgs = ['--import', './src/loader/register.mjs', entry];
  log(`서버 기동: node ${nodeArgs.join(' ')}`);
  const child = spawn(process.execPath, nodeArgs, { cwd: root, stdio: 'inherit', env: process.env });
  const forward = (sig) => { try { child.kill(sig); } catch { /* noop */ } };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));
  child.on('exit', (code, sig) => process.exit(code ?? (sig ? 1 : 0)));
}
