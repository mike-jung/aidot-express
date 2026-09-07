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
const isFull = args.includes('--full');
const target = args.includes('--linux') ? 'linux' : 'win';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const build = structuredClone(pkg.build);

if (!isFull) {
  /* 공개판 — public-filter.json 의 차단 목록을 그대로 제외 규칙으로 바꾼다.
     electron-builder 의 files 는 `!경로` 로 제외를 적는다. */
  const cfgPath = path.join(ROOT, 'scripts/publish/public-filter.json');
  const filter = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
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

/* ★ v1.35.3 — 이 판의 지난 산출물을 먼저 지운다.
   전자 빌더는 폴더를 비우지 않아 버전이 쌓이고, 그러면 릴리스에 옛 것이 섞인다.
   ⚠ 다른 판(full/공개)의 것은 건드리지 않는다 — 둘을 따로 만들어 두고 쓸 수 있어야 한다. */
const outDir = path.join(ROOT, build.directories?.output || 'dist');
if (fs.existsSync(outDir)) {
  const mine = fs.readdirSync(outDir).filter((f) => {
    if (!/\.(exe|AppImage|deb|rpm|zip|dmg)$/i.test(f) && !/\.tar\.gz$/i.test(f)) return false;
    return isFull ? /-full[-.]/i.test(f) : !/-full[-.]/i.test(f);
  });
  for (const f of mine) fs.rmSync(path.join(outDir, f), { force: true });
  if (mine.length) console.log(`· 지난 ${isFull ? 'full' : '공개'}판 산출물 ${mine.length}개를 지웠습니다`);
}

const label = isFull ? 'full 판 (사내 전달용)' : '공개판';
console.log(`▶ ${label} ${target === 'win' ? 'Windows' : 'Linux'} 설치 파일`);
if (!isFull) {
  const n = build.files.filter((f) => f.startsWith('!')).length;
  console.log(`  제외 규칙 ${n}개 적용 (public-filter.json 기준)`);
}

try {
  if (target === 'linux') {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-linux.mjs'), ...args.filter((a) => a.startsWith('--') && a !== '--full' && a !== '--linux'), '--config', outCfg],
      { cwd: ROOT, stdio: 'inherit' });
  } else {
    execFileSync('npx', ['electron-builder', '--win', '--x64', '--config', outCfg],
      { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  }
} finally {
  fs.rmSync(outCfg, { force: true });
}
