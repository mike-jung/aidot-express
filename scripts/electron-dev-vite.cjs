#!/usr/bin/env node
/**
 * electron:dev:vite — Vite dev 서버 + Electron 을 함께 기동하는 크로스플랫폼 런처.
 *
 *  흐름:
 *    1) admin-client 폴더에서 `npm run dev` 를 spawn (Vite dev 서버)
 *    2) Vite 가 포트 LISTEN 할 때까지 (최대 30초) 대기 — 로그에서 URL 파싱
 *    3) Electron 을 VITE_DEV_URL 환경변수와 함께 spawn
 *    4) 두 프로세스 중 하나가 종료되면 나머지도 정리 후 exit
 *
 *  의존성: Node 내장 (child_process, net) 만 사용. npm 글로벌 없어도 동작.
 *
 *  실행:
 *    npm run electron:dev:vite
 */
'use strict';

const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');

const projectRoot = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

// Windows 콘솔 코드페이지를 UTF-8 로 전환해 한글 로그 깨짐 방지.
if (isWin) {
  try {
    spawnSync('chcp', ['65001'], { shell: true, stdio: 'ignore' });
  } catch (_) { /* noop */ }
}

/** Vite dev 서버가 뜰 때까지 TCP 레벨로 대기. */
async function waitForPort(host, port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const s = net.createConnection({ host, port });
      s.once('connect', () => { s.end(); resolve(true); });
      s.once('error', () => resolve(false));
      setTimeout(() => { try { s.destroy(); } catch {} resolve(false); }, 500);
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const children = [];
function killAll(code = 0) {
  for (const c of children) {
    try { c.kill(isWin ? undefined : 'SIGTERM'); } catch {}
  }
  process.exit(code);
}
process.on('SIGINT', () => killAll(0));
process.on('SIGTERM', () => killAll(0));

(async () => {
  // 0) 프로젝트 .env 에서 실제 Express 서버 포트 추출 → Vite 에 전달.
  //    이렇게 하면 사용자가 .env 의 PORT 를 바꿔도 Vite proxy 가 자동 동기화됨.
  let apiTarget = process.env.VITE_API_TARGET;
  if (!apiTarget) {
    try {
      const fs = require('node:fs');
      const envPath = path.join(projectRoot, '.env');
      if (fs.existsSync(envPath)) {
        const m = fs.readFileSync(envPath, 'utf8').match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
        if (m) apiTarget = `http://localhost:${m[1]}`;
      }
    } catch (_) { /* noop */ }
  }
  if (apiTarget) {
    console.log(`[launcher] Express 서버 포트 감지: ${apiTarget}`);
  }

  // 1) Vite dev 서버 시작 — admin-client 폴더에서
  const viteCmd = isWin ? 'npm.cmd' : 'npm';
  const vite = spawn(viteCmd, ['run', 'dev'], {
    cwd: path.join(projectRoot, 'admin-client'),
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      ...(apiTarget ? { VITE_API_TARGET: apiTarget } : {}),
    },
  });
  children.push(vite);
  vite.on('exit', (code) => {
    console.log(`[launcher] Vite dev server exited code=${code}`);
    killAll(code ?? 0);
  });

  // 2) Vite 포트 LISTEN 대기 — vite.config.js 의 port 는 5174
  const VITE_HOST = '127.0.0.1';
  const VITE_PORT = 5174;
  console.log(`[launcher] Vite dev 서버 기동 대기 (http://${VITE_HOST}:${VITE_PORT}) ...`);
  const ready = await waitForPort(VITE_HOST, VITE_PORT, 30_000);
  if (!ready) {
    console.error('[launcher] Vite dev 서버가 30초 내에 기동하지 않았습니다.');
    killAll(1);
    return;
  }
  console.log('[launcher] Vite ready → Electron 시작');

  // 3) Electron 을 VITE_DEV_URL 환경변수와 함께 시작
  const electronBin = require.resolve('electron/cli.js');
  const electron = spawn(process.execPath, [electronBin, '.'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_URL: `http://${VITE_HOST}:${VITE_PORT}`,
    },
  });
  children.push(electron);
  electron.on('exit', (code) => {
    console.log(`[launcher] Electron exited code=${code}`);
    killAll(code ?? 0);
  });
})().catch((e) => {
  console.error('[launcher]', e);
  killAll(1);
});
