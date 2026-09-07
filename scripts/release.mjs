#!/usr/bin/env node
/**
 * scripts/release.mjs — 배포 산출물 만들기 (`npm run release`)
 *
 *  왜 필요한가
 *    파일 이름에 버전이 안 들어가면 "지금 받은 zip 이 무엇인지" 를 아무도 확신할 수 없다.
 *    이 스크립트는 **package.json 의 version 을 유일한 기준**으로 삼아
 *    검증 → 버전 각인 → 버전이 박힌 파일 이름으로 패키징 → 무결성 목록 생성까지 한 번에 한다.
 *
 *  사용법
 *    npm run release                     전체 패키지(zip) + 매니페스트
 *    npm run release -- --check          검사만 (파일 생성 없음)
 *    npm run release -- --patch-from <경로>   그 경로(이전 버전 소스)와 비교해 변경분 zip 도 생성
 *    npm run release -- --out <폴더>     산출물 위치 (기본 dist-release/)
 *    npm run release -- --channel beta   build-info.json 의 channel 값 (기본 release)
 *    npm run release -- --strict-lock    package-lock.json 이 없거나 버전이 어긋나면 중단
 *
 *  만들어지는 것 (버전이 v1.4.0 일 때)
 *    dist-release/aidot-express-1.4.0-full.zip
 *    dist-release/aidot-express-1.4.0-patch.zip      (--patch-from 지정 시)
 *    dist-release/aidot-express-1.4.0-MANIFEST.txt   (sha256 목록)
 *    build-info.json                                 (패키지 안에 포함 — 실행 중 버전 확인용)
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const CHECK_ONLY = flag('check');
const CHANNEL = opt('channel', 'release');
const OUT_DIR = path.resolve(root, opt('out', 'dist-release'));
const PATCH_FROM = opt('patch-from', null);

/** 패키지에 넣지 않는 것 — 비밀/생성물/로컬 상태 */
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'log', 'data', '.cache', '.tmp', 'dist-electron', 'dist-release']);
const EXCLUDE_FILES = new Set(['.env', '.DS_Store', 'Thumbs.db']);
const EXCLUDE_PATTERNS = [/^src\/secure\/\.keyguard\.json$/, /^examples\/[^/]+\/(node_modules|dist)\//];

const log = (m) => process.stdout.write(`[release] ${m}\n`);
const warn = (m) => process.stderr.write(`[release] ⚠ ${m}\n`);
const die = (m) => { process.stderr.write(`[release] ✖ ${m}\n`); process.exit(1); };

/* ───────────────── 1. 버전 확인 ───────────────── */
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version || '')) {
  die(`package.json 의 version 이 SemVer 형식이 아닙니다: ${version}`);
}
log(`버전 ${version} (channel=${CHANNEL})`);

/* ───────────────── 2. 배포 전 검사 ───────────────── */
const problems = [];
const notes = [];

// (a) CHANGELOG 에 이 버전 항목이 있는가
const changelog = fs.existsSync(path.join(root, 'CHANGELOG.md'))
  ? fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8') : '';
if (!new RegExp(`^##\\s*v?${version.replace(/\./g, '\\.')}\\b`, 'm').test(changelog)) {
  problems.push(`CHANGELOG.md 에 "## v${version}" 항목이 없습니다 — 무엇이 바뀌었는지 적어야 합니다.`);
}

// (b) 관리자 콘솔이 빌드되어 있고, 소스보다 오래되지 않았는가
const distIndex = path.join(root, 'admin-client', 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
  problems.push('admin-client/dist 가 없습니다 — `npm run build:admin` 을 먼저 실행하세요.');
} else {
  const distMtime = fs.statSync(distIndex).mtimeMs;
  let newestSrc = 0;
  const walkSrc = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkSrc(p);
      else newestSrc = Math.max(newestSrc, fs.statSync(p).mtimeMs);
    }
  };
  walkSrc(path.join(root, 'admin-client', 'src'));
  if (newestSrc > distMtime) {
    problems.push('admin-client 소스가 dist 보다 최신입니다 — `npm run build:admin` 을 다시 실행하세요.');
  }
}

// (c) 의존성 잠금 파일 — 같은 버전을 어디서 설치해도 똑같이 재현되게 하는 안전장치
{
  const lockPath = path.join(root, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    const msg = 'package-lock.json 이 없습니다 — 설치 시점에 따라 의존성 버전이 달라질 수 있습니다. '
      + '인터넷이 되는 PC 에서 `npm install --package-lock-only` 로 만들어 커밋하세요.';
    if (flag('strict-lock')) problems.push(msg);
    else warn(msg);
  } else {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (lock.version && lock.version !== version) {
      const msg = `package-lock.json 의 version(${lock.version}) 이 package.json(${version}) 과 다릅니다 — `
        + '`npm install --package-lock-only` 로 갱신하세요.';
      if (flag('strict-lock')) problems.push(msg); else warn(msg);
    } else {
      log(`package-lock.json OK (v${lock.version ?? '?'} · lockfileVersion ${lock.lockfileVersion ?? '?'})`);
    }
    // 잠금 파일이 있으면 재현 설치 명령을 안내
    notes.push('배포처에서는 `npm ci` 로 설치하면 잠금 파일 그대로 재현됩니다.');
  }
}

// (d) .env 가 실수로 들어가지 않는가 (패키지 목록에서 제외되는지 확인용)
if (fs.existsSync(path.join(root, '.env'))) {
  notes.push('.env 가 작업 폴더에 있지만 패키지에서는 제외됩니다.');
}

// (d-2) 테스트 잔여물 — e2e 가 만든 임시 컨트롤러/서비스/SQL 이 남아 있으면 패키지에 섞인다
{
  const junk = [];
  const scan = (dir, re) => {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) return;
    for (const f of fs.readdirSync(abs)) if (re.test(f)) junk.push(`${dir}/${f}`);
  };
  scan('src/controller', /^E2e|^e2e/i);
  scan('src/controller/meta', /^E2e|^e2e/i);
  scan('src/service', /^E2e|^e2e/i);
  scan('src/service/meta', /^E2e|^e2e/i);
  scan('src/database/sql', /^e2etmp/i);
  if (junk.length) {
    problems.push(`테스트 잔여물이 남아 있습니다 (${junk.length}개): ${junk.slice(0, 5).join(', ')}`
      + `${junk.length > 5 ? ' …' : ''} — 삭제한 뒤 다시 실행하세요.`);
  } else {
    log('테스트 잔여물 없음');
  }
}

// (e) 구문 검사 (빠르게 한 번)
if (!flag('skip-check')) {
  const r = spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', 'scripts/check-syntax.mjs'],
    { cwd: root, encoding: 'utf8' });
  const last = (r.stdout || '').trim().split('\n').pop() || '';
  if (r.status !== 0) problems.push(`구문 검사 실패: ${last}`);
  else log(`구문 검사 OK — ${last}`);
}

for (const n of notes) log(`· ${n}`);
if (problems.length) {
  for (const p of problems) warn(p);
  if (!flag('force')) die(`검사 ${problems.length}건 실패 — 고친 뒤 다시 실행하세요 (무시하려면 --force).`);
}

if (CHECK_ONLY) { log('--check: 검사만 수행했습니다.'); process.exit(0); }

/* ───────────────── 3. 버전 각인 ───────────────── */
const buildInfo = {
  version,
  channel: CHANNEL,
  builtAt: new Date().toISOString(),
  artifact: `aidot-express-${version}-full.zip`,
  node: process.versions.node,
};
fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify(buildInfo, null, 2) + '\n');
log('build-info.json 기록 — 실행 중 /health 와 콘솔에서 이 버전이 보입니다.');

/* ───────────────── 4. 파일 목록 ───────────────── */
function listFiles(base) {
  const out = [];
  const walk = (dir, rel = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (EXCLUDE_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name), relPath);
      } else {
        if (EXCLUDE_FILES.has(e.name)) continue;
        if (EXCLUDE_PATTERNS.some((re) => re.test(relPath))) continue;
        out.push(relPath);
      }
    }
  };
  walk(base);
  return out.sort();
}

const files = listFiles(root);
log(`패키지 대상 ${files.length}개 파일`);

/* ───────────────── 5. zip 만들기 ───────────────── */
await fsp.mkdir(OUT_DIR, { recursive: true });

function zipFrom(stageDir, zipPath) {
  fs.rmSync(zipPath, { force: true });
  const r = spawnSync('zip', ['-rq', zipPath, 'aidot-express'], { cwd: stageDir, encoding: 'utf8' });
  if (r.status !== 0) die(`zip 실패: ${r.stderr || r.stdout}`);
}

async function stage(fileList, stageDir) {
  fs.rmSync(stageDir, { recursive: true, force: true });
  for (const rel of fileList) {
    const src = path.join(root, rel);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(stageDir, 'aidot-express', rel);
    await fsp.mkdir(path.dirname(dst), { recursive: true });
    await fsp.copyFile(src, dst);
  }
}

const tmpBase = path.join(OUT_DIR, '.stage');
const fullZip = path.join(OUT_DIR, `aidot-express-${version}-full.zip`);
await stage(files, path.join(tmpBase, 'full'));
zipFrom(path.join(tmpBase, 'full'), fullZip);
log(`전체 패키지: ${path.relative(root, fullZip)}`);

let patchZip = null;
if (PATCH_FROM) {
  const baseDir = path.resolve(PATCH_FROM);
  if (!fs.existsSync(baseDir)) die(`--patch-from 경로가 없습니다: ${baseDir}`);
  const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const changed = files.filter((rel) => {
    const oldPath = path.join(baseDir, rel);
    if (!fs.existsSync(oldPath)) return true;                   // 새 파일
    try { return sha(path.join(root, rel)) !== sha(oldPath); }   // 내용이 다른 파일
    catch { return true; }
  });
  patchZip = path.join(OUT_DIR, `aidot-express-${version}-patch.zip`);
  await stage(changed, path.join(tmpBase, 'patch'));
  zipFrom(path.join(tmpBase, 'patch'), patchZip);
  log(`변경분 패키지: ${path.relative(root, patchZip)} (${changed.length}개 파일)`);
  await fsp.writeFile(path.join(OUT_DIR, `aidot-express-${version}-FILELIST.txt`), changed.join('\n') + '\n');
}

fs.rmSync(tmpBase, { recursive: true, force: true });

/* ───────────────── 5-b. 업그레이드 안내 동봉 ───────────────── */
const upgradeSrc = path.join(root, 'docs', 'UPGRADE.md');
if (fs.existsSync(upgradeSrc)) {
  const upgradeOut = path.join(OUT_DIR, `aidot-express-${version}-UPGRADE.md`);
  await fsp.copyFile(upgradeSrc, upgradeOut);
  log(`업그레이드 안내: ${path.relative(root, upgradeOut)}`);
}

/* ───────────────── 6. 무결성 매니페스트 ───────────────── */
const manifestLines = [
  `aidot-express ${version} (${CHANNEL})`,
  `빌드 시각: ${buildInfo.builtAt}`,
  `파일 수: ${files.length}`,
  '',
  '--- 산출물 sha256 ---',
];
for (const f of [fullZip, patchZip].filter(Boolean)) {
  const h = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  manifestLines.push(`${h}  ${path.basename(f)}`);
}
const manifestPath = path.join(OUT_DIR, `aidot-express-${version}-MANIFEST.txt`);
await fsp.writeFile(manifestPath, manifestLines.join('\n') + '\n');
log(`매니페스트: ${path.relative(root, manifestPath)}`);

log('완료 ✓');
