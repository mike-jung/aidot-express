#!/usr/bin/env node
/**
 * scripts/build-linux.mjs — Linux 배포본을 만든다. Windows 에서도 돌아간다.
 *
 *  ⚠ AppImage 는 Windows 에서 만들 수 없다.
 *    공식 문서: "AppImages must be built on Linux (or via Docker).
 *                They cannot be cross-compiled from macOS or Windows."
 *    실제로 시도하면 mksquashfs 를 엉뚱한 경로에서 찾다가 ENOENT 로 죽는다
 *    (electron-builder #8006 계열). 고칠 수 있는 버그가 아니라 도구의 제약이다.
 *
 *  그래서 이 스크립트가 지금 환경에서 **가능한 방법을 골라** 대신 해 준다.
 *
 *    Linux           → 그냥 만든다
 *    Windows + WSL2  → WSL 안에서 만든다 (권장 — 가장 빠르다)
 *    Windows + Docker→ electronuserland/builder 컨테이너에서 만든다
 *    그 외            → tar.gz 로 대신 만든다 (아래 설명)
 *
 *  쓰는 법:
 *    npm run dist:linux              알아서 고른다
 *    npm run dist:linux -- --wsl     WSL 로 지정
 *    npm run dist:linux -- --docker  Docker 로 지정
 *    npm run dist:linux -- --targz   보조 수단만 (WSL·Docker 없이)
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const want = args.find((a) => ['--wsl', '--docker', '--targz', '--native'].includes(a));
/* 판(edition)별 설정 파일을 그대로 넘긴다 — 공개판/full 을 가르는 유일한 차이다 */
const cfgIdx = args.indexOf('--config');
const cfgArgs = cfgIdx >= 0 ? ['--config', args[cfgIdx + 1]] : [];
const isWin = process.platform === 'win32';

/**
 * ⚠ shell 은 **npm·npx 처럼 .cmd 인 것에만** 쓴다.
 *
 *  처음에는 모든 실행에 `shell: isWin` 을 줬다가 크게 물렸다.
 *  shell: true 면 Node 가 인자들을 **이스케이프 없이 이어 붙여** cmd.exe 에 넘긴다.
 *  그래서 여러 줄짜리 bash 스크립트를 인자로 주면 첫 단어만 살아남는다.
 *  실제 로그에 `BASH_EXECUTION_STRING=set` 이 찍혔다 — bash 가 받은 명령이 `set` 뿐이었고,
 *  환경변수만 잔뜩 쏟아내고 끝났다. Node 도 DEP0190 으로 경고하고 있었다.
 *
 *  wsl.exe · docker.exe 는 진짜 실행 파일이라 shell 이 필요 없다.
 */
const needsShell = (cmd) => isWin && /^(npm|npx|yarn|pnpm)$/.test(cmd);
const has = (cmd, cmdArgs = ['--version']) => {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'ignore', shell: needsShell(cmd) });
  return r.status === 0;
};
const run = (cmd, cmdArgs, opts = {}) =>
  execFileSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: needsShell(cmd), ...opts });

/* ── ① Linux 에서는 그냥 만든다 ─────────────────────────────────── */
function buildNative() {
  console.log('▶ Linux 에서 직접 만듭니다 (AppImage)');
  run('npx', ['electron-builder', '--linux', '--x64', ...cfgArgs]);
}

/* ── ② WSL2 ──────────────────────────────────────────────────────
 *  주의: Windows 의 node_modules 에는 **Windows 용 네이티브 모듈**(argon2,
 *  better-sqlite3)이 들어 있다. 같은 폴더에서 WSL 로 npm install 하면 그것을
 *  Linux 용으로 덮어써 Windows 빌드가 깨진다.
 *  그래서 소스만 WSL 안쪽 폴더로 복사해 거기서 새로 설치하고 빌드한다.
 *  (/mnt/d 위에서 빌드하면 파일 접근이 느려 몇 배 오래 걸리는 문제도 함께 피한다) */
function buildWsl() {
  const distro = (() => {
    try {
      const out = execFileSync('wsl.exe', ['-l', '-q'], { encoding: 'utf16le' });
      return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0] || null;
    } catch { return null; }
  })();
  if (!distro) throw new Error('WSL 배포판을 찾지 못했습니다. `wsl --install -d Ubuntu` 로 설치하세요.');
  console.log(`▶ WSL(${distro}) 안에서 만듭니다`);

  /* Windows 경로 → WSL 경로 (D:\a\b → /mnt/d/a/b) */
  const wslSrc = execFileSync('wsl.exe', ['wslpath', '-a', ROOT.replace(/\\/g, '/')], { encoding: 'utf8' }).trim();
  const workDir = '$HOME/.cache/aidot-express-linux-build';

  /* rsync 가 없는 배포판도 있으므로 없으면 tar 로 옮긴다 */
  const script = [
    'set -e',
    /* ★ v1.33.5 — WSL 은 Windows 의 PATH 를 그대로 물려받는다(/mnt/c/Program Files/nodejs 등).
       그래서 `command -v node` 가 **Windows 의 node.exe** 를 찾아 검사를 통과해 버렸고,
       Linux 빌드인데 Windows npm 이 돌았다. 실제로 이런 오류가 났다:
         npm error command C:\\Windows\\system32\\cmd.exe /d /s /c node ./script/select-7z-arch.js
         npm error UNC 경로는 지원되지 않습니다
         npm error Node.js v24.15.0            ← Windows 쪽 Node
       게다가 Linux 빌드에 필요 없는 electron-winstaller 까지 설치하려 했다.
       → Windows 경로를 PATH 에서 걷어낸 뒤 검사한다. */
    'export PATH="$(printf %s "$PATH" | tr ":" "\\n" | grep -v "^/mnt/[a-z]/" | paste -sd: -)"',
    'command -v node >/dev/null || { echo "✗ WSL 안에 Linux 용 Node 가 없습니다."; ' +
      'echo "  (Windows 의 Node 는 Linux 빌드에 쓸 수 없습니다)"; ' +
      'echo "  설치: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"; exit 1; }',
    /* 한 번 더 확인 — 혹시 남아 있는 Windows 실행 파일을 잡아낸다 */
    'case "$(command -v node)" in /mnt/*) echo "✗ 아직 Windows 의 Node 를 보고 있습니다: $(command -v node)"; ' +
      'echo "  WSL 안에 Linux 용 Node 를 설치해 주세요."; exit 1;; esac',
    'echo "· Linux Node $(node -v) ($(command -v node))"',
    'command -v make >/dev/null || { echo "✗ 빌드 도구가 없습니다."; ' +
      'echo "  설치: sudo apt-get update && sudo apt-get install -y build-essential python3"; exit 1; }',
    `mkdir -p ${workDir}`,
    /* node_modules·빌드 산출물은 빼고 소스만 복사한다 */
    /* 소스만 옮긴다 — node_modules 를 가져가면 Windows 용 네이티브 모듈이 섞인다 */
    `if command -v rsync >/dev/null; then`,
    `  rsync -a --delete --exclude node_modules --exclude dist-electron --exclude .git \\`,
    `    --exclude admin-client/node_modules "${wslSrc}/" "${workDir}/"`,
    `else`,
    `  rm -rf "${workDir}"; mkdir -p "${workDir}"`,
    `  ( cd "${wslSrc}" && tar --exclude=node_modules --exclude=dist-electron --exclude=.git \\`,
    `      --exclude=admin-client/node_modules -cf - . ) | ( cd "${workDir}" && tar -xf - )`,
    `fi`,
    `cd ${workDir}`,
    'echo "▶ Linux 용 의존성 설치 (처음엔 몇 분 걸립니다)"',
    'npm install --no-audit --no-fund',
    'echo "▶ AppImage 빌드"',
    `npx electron-builder --linux --x64${cfgArgs.length ? ' --config ' + path.basename(cfgArgs[1]) : ''}`,
    /* 결과물만 Windows 쪽으로 돌려준다 */
    `mkdir -p "${wslSrc}/dist-electron"`,
    `cp -f dist-electron/*.AppImage "${wslSrc}/dist-electron/" 2>/dev/null || true`,
    `cp -f dist-electron/*.deb "${wslSrc}/dist-electron/" 2>/dev/null || true`,
    'echo "✓ 완료 — dist-electron 폴더를 확인하세요"',
  ].join('\n');

  /* ★ 스크립트를 **파일로 써서 경로만 넘긴다.**
     인자로 직접 주면 cmd.exe 를 거치며 잘린다(위 needsShell 주석 참고). */
  const tmpWin = path.join(ROOT, '.wsl-build.sh');
  fs.writeFileSync(tmpWin, script.replace(/\r\n/g, '\n'), 'utf8');
  try {
    const tmpWsl = execFileSync('wsl.exe', ['wslpath', '-a', tmpWin.replace(/\\/g, '/')],
      { encoding: 'utf8' }).trim();
    /* -l (로그인 셸) 로 실행한다 — nvm 처럼 프로필에서 PATH 를 잡아 주는 경우가 많다.
       스크립트는 파일로 넘기므로 인자가 잘릴 일은 없다. */
    run('wsl.exe', ['-d', distro, '--', 'bash', '-l', tmpWsl]);
  } finally {
    fs.rmSync(tmpWin, { force: true });
  }
}

/* ── ③ Docker ────────────────────────────────────────────────────
 *  node_modules 는 **이름 있는 볼륨**에 둔다. 그래야 컨테이너 안의 Linux 용
 *  설치본이 Windows 쪽 node_modules 를 덮어쓰지 않는다. */
function buildDocker() {
  console.log('▶ Docker(electronuserland/builder) 안에서 만듭니다');
  const inner = [
    'set -e',
    'npm install --no-audit --no-fund',
    `npx electron-builder --linux --x64${cfgArgs.length ? ' --config ' + path.basename(cfgArgs[1]) : ''}`,
  ].join(' && ');
  run('docker', [
    'run', '--rm',
    '-v', `${ROOT}:/project`,
    '-v', 'aidot-express-node-modules:/project/node_modules',
    '-v', 'aidot-express-admin-node-modules:/project/admin-client/node_modules',
    '-v', 'aidot-electron-cache:/root/.cache/electron',
    '-v', 'aidot-builder-cache:/root/.cache/electron-builder',
    'electronuserland/builder:latest',
    /* 한 줄짜리라 인자로 넘겨도 안전하다. shell 을 거치지 않으므로 그대로 전달된다. */
    '/bin/bash', '-c', inner,
  ]);
}

/* ── ④ 보조 수단: tar.gz ──────────────────────────────────────────
 *  AppImage 와 달리 tar.gz 는 그냥 압축이라 **Windows 에서도 만들어진다.**
 *  받는 사람이 풀고 실행 파일을 직접 실행해야 하지만, 급할 때 쓸 수 있다. */
function buildTarGz() {
  console.log('▶ AppImage 대신 tar.gz 로 만듭니다 (Windows 에서도 됩니다)');
  console.log('  받는 사람은 풀어서 안의 실행 파일을 직접 실행하면 됩니다.');
  run('npx', ['electron-builder', '--linux', 'tar.gz', '--x64', ...cfgArgs]);
}

/* ── 무엇으로 할지 고른다 ────────────────────────────────────────── */
try {
  if (want === '--native' || (!want && !isWin)) { buildNative(); }
  else if (want === '--wsl') { buildWsl(); }
  else if (want === '--docker') { buildDocker(); }
  else if (want === '--targz') { buildTarGz(); }
  else {
    /* Windows 에서 자동 선택 */
    console.log('· Windows 에서는 AppImage 를 직접 만들 수 없습니다 (도구의 제약입니다).');
    if (has('wsl.exe', ['-l', '-q'])) { buildWsl(); }
    else if (has('docker')) { buildDocker(); }
    else {
      console.log('\n· WSL 도 Docker 도 없어 tar.gz 로 대신 만듭니다.');
      console.log('  AppImage 가 필요하면 둘 중 하나를 설치하세요:');
      console.log('    WSL2   : wsl --install -d Ubuntu   (권장 — 빠릅니다)');
      console.log('    Docker : https://www.docker.com/products/docker-desktop\n');
      buildTarGz();
    }
  }
} catch (e) {
  console.error(`\n✗ Linux 빌드 실패: ${e.message}`);
  console.error('  다른 방법을 지정해 볼 수 있습니다:');
  console.error('    npm run dist:linux -- --wsl');
  console.error('    npm run dist:linux -- --docker');
  console.error('    npm run dist:linux -- --targz    (AppImage 없이)');
  process.exit(1);
}
