#!/usr/bin/env node
/**
 * scripts/build-edition.mjs — 판(edition)을 골라 설치 파일을 만든다.
 *
 *  왜 나누나
 *    설치 파일은 **공개판 내용만** 담아야 한다. 그런데 개발은 full 에서 한다.
 *    한 폴더에서 두 가지 결과물을 만들어야 하므로, 무엇을 넣고 뺄지를
 *    빌드할 때 정한다.
 *
 *    제외 목록은 **public-filter.json 하나만 본다.** 공개 저장소와 설치 파일이
 *    서로 다른 기준을 쓰면 언젠가 어긋난다 — 한쪽에서 뺀 것이 다른 쪽으로 나간다.
 *
 *  쓰는 법
 *    npm run dist:win            공개판 Windows 설치 파일  (기본)
 *    npm run dist:win:full       full 판 (사내·엔터프라이즈 전달용)
 *    npm run dist:linux          공개판 Linux
 *    npm run dist:linux:full     full 판 Linux
 *
 *  ⚠ full 판 설치 파일은 GitHub 공개 릴리스에 올리지 마세요.
 *    파일 이름에 `-full` 이 붙어 구분됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let filterCfg = null;
const isFull = args.includes('--full');
/* 처음부터 다시 만들고 싶을 때. 지난 빌드가 영향을 준다고 의심되면 이것이 가장 확실하다. */
const clean = args.includes('--clean');
/* 여기서 소비하는 인자 — 아래 build-linux 로 넘기지 않는다 */
const MINE = new Set(['--full', '--linux', '--clean']);
const target = args.includes('--linux') ? 'linux' : 'win';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const build = structuredClone(pkg.build);

if (!isFull) {
  /* 공개판 — public-filter.json 의 차단 목록을 그대로 제외 규칙으로 바꾼다.
     electron-builder 의 files 는 `!경로` 로 제외를 적는다. */
  const cfgPath = path.join(ROOT, 'scripts/publish/public-filter.json');
  const filter = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  filterCfg = filter;
  const keep = new Set(filter.keep || []);

  const excludes = filter.deny
    .filter((p) => !keep.has(p))
    /* 빌드에 애초에 포함되지 않는 것들은 규칙을 늘리지 않는다 */
    .filter((p) => !/^(workspace|dist-electron|log|data)\//.test(p))
    .map((p) => `!${p}`);

  /* allowOnly 는 "이 폴더는 남길 것만" 이라는 뜻이다.
     electron-builder 에는 그런 문법이 없으므로 폴더를 통째로 빼고 남길 것만 되돌린다.
     files 는 뒤에 오는 규칙이 이긴다. */
  for (const [scope, list] of Object.entries(filter.allowOnly || {})) {
    if (scope.startsWith('_')) continue;
    excludes.push(`!${scope}`);
    for (const keepPat of list) excludes.push(keepPat);
  }

  /* ★ v1.35.9 — 자리지킴이 경로는 **맨 뒤에** 다시 넣는다.
     keep 은 규칙 문자열이 정확히 같을 때만 걸러 내므로, `src/secure/**` 같은
     넓은 제외를 이기지 못한다. electron-builder 의 files 는 뒤에 오는 규칙이 이기니
     여기서 되살린다. 그러지 않으면 파일이 빠진 채로 나가 서버가 켜지자마자 죽는다. */
  for (const d of filter.stubs?.dirs || []) excludes.push(`${d}/**`);
  for (const f of filter.stubs?.files || []) excludes.push(f);

  build.files = [...build.files, ...excludes];
  /* 같은 이름이면 두 판을 구분할 수 없다 */
  build.win = { ...build.win };
  build.linux = { ...build.linux };
} else {
  const tag = '-full';
  build.win = { ...build.win, artifactName: `\${productName}-Setup-\${version}${tag}-\${arch}.\${ext}` };
  build.linux = { ...build.linux, artifactName: `\${productName}-\${version}${tag}.\${ext}` };
}

/* electron-builder 에 넘길 설정 파일을 만든다.
   package.json 의 build 를 건드리지 않는다 — 그쪽은 full 이 기준이다. */
const outCfg = path.join(ROOT, `.electron-builder.${isFull ? 'full' : 'public'}.json`);
fs.writeFileSync(outCfg, JSON.stringify(build, null, 2), 'utf8');

/**
 * ★ v1.35.5 — 지난 산출물을 지울 때 **OS 와 판을 둘 다** 본다.
 *
 *  v1.35.3 에서는 확장자로 설치 파일인지만 가리고 판(full/공개)만 구분했다.
 *  그래서 `dist:win` 이 같은 판의 **AppImage 까지 지웠다.** 반대도 마찬가지다.
 *  둘을 만들어 두고 함께 릴리스하려는데 매번 한쪽이 사라졌다.
 *
 *  지우는 조건은 셋이 모두 같을 때뿐이다: **같은 OS · 같은 판 · 지난 버전.**
 *  같은 버전을 다시 빌드하는 경우도 지운다 — 그것은 덮어쓰기가 맞다.
 */
const EXT_BY_OS = {
  win: /\.(exe|msi)$/i,
  linux: /\.(AppImage|deb|rpm)$|\.tar\.gz$/i,
  mac: /\.(dmg|pkg)$/i,
};

/**
 * ★ v1.35.8 — 설치 파일뿐 아니라 **그 판이 남긴 것 전부**를 지운다.
 *
 *  v1.35.5 는 설치 파일(exe·AppImage…)만 지웠다. 그런데 electron-builder 는
 *  같은 폴더에 더 남긴다:
 *
 *    linux-unpacked/ · win-unpacked/   압축 전 폴더. **지우지 않으면 재사용된다.**
 *    latest-linux.yml · latest.yml     자동 업데이트 메타. 옛 버전을 가리킨 채 남는다.
 *    *.blockmap                        차등 업데이트용
 *    builder-debug.yml                 빌드 로그
 *
 *  지난 버전의 unpacked 폴더가 남아 있으면 그 안의 파일이 새 패키지로 흘러들 수 있고,
 *  옛 latest.yml 은 자동 업데이트가 없는 버전을 가리키게 만든다.
 *  실제로 v1.35.4 의 latest.yml 이 v1.35.7 빌드 폴더에 남아 있었다.
 *
 *  ⚠ 다른 OS·다른 판의 것은 여전히 건드리지 않는다.
 */
const ART_BY_OS = {
  win: [/\.(exe|msi)$/i, /^latest\.yml$/i, /^win-unpacked$/i, /\.exe\.blockmap$/i],
  linux: [/\.(AppImage|deb|rpm)$/i, /\.tar\.gz$/i, /^latest-linux\.yml$/i, /^linux-unpacked$/i],
  mac: [/\.(dmg|pkg)$/i, /^latest-mac\.yml$/i, /^mac$/i, /\.dmg\.blockmap$/i],
};

const outDir = path.join(ROOT, build.directories?.output || 'dist');

if (clean && fs.existsSync(outDir)) {
  /* ⚠ Windows 에서 폴더 자체를 지우면 EPERM 이 잘 난다 —
     탐색기가 열려 있거나, 안티바이러스가 훑는 중이거나, 파일 하나가 잠겨 있으면.
     실제로 그렇게 실패했다. 그래서 **폴더는 남기고 안의 것만** 지우고,
     실패하면 멈추지 않고 알린 뒤 계속한다. 정리는 편의일 뿐 빌드의 조건이 아니다. */
  let failed = 0;
  for (const f of fs.readdirSync(outDir)) {
    try {
      fs.rmSync(path.join(outDir, f), { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch { failed += 1; }
  }
  console.log(failed
    ? `· --clean · ${path.relative(ROOT, outDir)} 를 비웠습니다 (${failed}개는 잠겨 있어 남겼습니다)`
    : `· --clean · ${path.relative(ROOT, outDir)} 를 비웠습니다`);
  if (failed) console.log('  Close any Explorer window or running app and it can be deleted.');
}

if (!clean && fs.existsSync(outDir)) {
  const pats = ART_BY_OS[target] || ART_BY_OS.win;
  const isInstaller = (f) => /\.(exe|msi|AppImage|deb|rpm|dmg|pkg)$/i.test(f) || /\.tar\.gz$/i.test(f);

  const mine = fs.readdirSync(outDir).filter((f) => {
    if (!pats.some((re) => re.test(f))) return false;       /* 다른 OS 는 건드리지 않는다 */
    /* 설치 파일만 판을 가린다. unpacked 폴더와 yml 은 판 표시가 없으므로 그대로 지운다
       — 어차피 이번 빌드가 새로 만든다. */
    if (!isInstaller(f)) return true;
    return isFull ? /-full[-.]/i.test(f) : !/-full[-.]/i.test(f);
  });

  for (const f of mine) fs.rmSync(path.join(outDir, f), { recursive: true, force: true });
  if (mine.length) {
    const os = { win: 'Windows', linux: 'Linux', mac: 'macOS' }[target] || target;
    console.log(`· removed ${mine.length} previous ${os} artifacts: ${mine.join(', ')}`);
  }

  /* 남겨 둔 설치 파일을 알려 준다 — 사라진 줄 알고 다시 빌드하는 일이 없게 */
  const kept = fs.readdirSync(outDir).filter(isInstaller);
  if (kept.length) console.log(`· kept ${kept.length}: ${kept.join(', ')}`);
}

/**
 * ★ v1.36.1 — 제외한 **폴더 전체**를 자리지킴이로 바꾼다.
 *
 *  파일을 하나씩 대체했더니 계속 샜다. index.js 를 막았더니 agent.js 가,
 *  그것을 막았더니 readOnlyGuard.js 가 없다고 죽었다 — 설치본을 세 번 고쳤다.
 *  진짜 구현끼리 서로를 참조하므로, 하나만 남겨도 그 사슬이 다시 끊긴다.
 *
 *  이제 `stubs/` 아래에 같은 구조로 자리지킴이를 두고, 빌드 동안 폴더를 통째로 바꾼다.
 *  공개판에는 그 폴더의 파일만 들어가므로 빠질 것이 없다.
 */
const stubSpec = filterCfg?.stubs || {};
const restore = [];   /* [원본경로, 백업경로|null] */

function swapIn(realRel) {
  const real = path.join(ROOT, realRel);
  const stub = path.join(ROOT, 'stubs', realRel);
  if (!fs.existsSync(stub)) { console.warn(`· no stub for: stubs/${realRel}`); return false; }
  const backup = `${real}.__full`;
  if (fs.existsSync(real)) {
    fs.cpSync(real, backup, { recursive: true });
    restore.push([real, backup]);
  } else {
    restore.push([real, null]);
  }
  fs.rmSync(real, { recursive: true, force: true });
  fs.cpSync(stub, real, { recursive: true });
  return true;
}

if (!isFull) {
  let n = 0;
  for (const d of stubSpec.dirs || []) if (swapIn(d)) n += 1;
  for (const f of stubSpec.files || []) if (swapIn(f)) n += 1;
  if (n) console.log(`· swapped in ${n} public-edition stubs (restored after the build)`);
}

/* ⚠ 프로세스가 어떻게 끝나든 되돌린다.
   예전에는 finally 에만 있었는데, 그 앞에서 죽자 **소스가 stub 인 채로 남았다.** */
let restored = false;
for (const ev of ['exit', 'SIGINT', 'SIGTERM', 'uncaughtException']) {
  process.on(ev, (e) => {
    if (!restored) { restored = true; restoreStubs(); }
    if (ev === 'uncaughtException') { console.error(e); process.exit(1); }
    if (ev !== 'exit') process.exit(1);
  });
}

/** 넣어 둔 자리지킴이를 되돌린다 — 실패해도 반드시 부른다 */
function restoreStubs() {
  restored = true;
  for (const [real, backup] of restore) {
    try {
      fs.rmSync(real, { recursive: true, force: true });
      if (backup) { fs.cpSync(backup, real, { recursive: true }); fs.rmSync(backup, { recursive: true, force: true }); }
    } catch (e) { console.warn(`· could not restore ${real}: ${e.message}`); }
  }
  if (restore.length) console.log('· stubs restored');
}

const label = isFull ? 'full 판 (사내 전달용)' : '공개판';
console.log(`▶ ${label} ${target === 'win' ? 'Windows' : 'Linux'} installer`);
if (!isFull) {
  const n = build.files.filter((f) => f.startsWith('!')).length;
  console.log(`  ${n} exclusion rules applied (from public-filter.json)`);
}

try {
  if (target === 'linux') {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-linux.mjs'), /* 이 스크립트가 이미 처리한 인자는 넘기지 않는다 —
       build-linux.mjs 가 모르는 것을 electron-builder 로 흘려보내면 거기서 죽는다. */
      ...args.filter((a) => a.startsWith('--') && !MINE.has(a)), '--config', outCfg],
      { cwd: ROOT, stdio: 'inherit' });
  } else {
    execFileSync('npx', ['electron-builder', '--win', '--x64', '--config', outCfg],
      { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  }
} finally {
  fs.rmSync(outCfg, { force: true });
  restoreStubs();
}
