#!/usr/bin/env node
/**
 * electron:dev 런처 — Windows 한글 로그 깨짐 해결 + Electron 실행.
 *
 *  문제:
 *    Windows 콘솔(CMD/PowerShell) 의 기본 코드페이지가 cp949(한글) 일 때
 *    Node/Electron 이 쓰는 UTF-8 바이트열이 cp949 로 해석되어 한글이 깨짐.
 *
 *  해결:
 *    1) Windows 라면 `chcp 65001` 를 먼저 실행해 콘솔 코드페이지를 UTF-8 로 변경
 *       (이 프로세스/자식 프로세스에 영향 — 현재 콘솔 세션 범위)
 *    2) Electron 의 stdout/stderr 을 'inherit' 로 그대로 전달
 *    3) 자식 Electron 에 환경변수 PYTHONIOENCODING/LANG 주입 (부가적 보호)
 *
 *  실행:
 *    npm run electron:dev        → 이 스크립트 경유
 *    node scripts/electron-dev.cjs
 */
'use strict';

const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const isWin = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

// 1) Windows 콘솔 코드페이지 UTF-8 로 전환
//    chcp 는 Windows 내장 명령. 'spawnSync' 로 부모 콘솔에 먼저 적용.
if (isWin) {
  try {
    spawnSync('chcp', ['65001'], { shell: true, stdio: 'ignore' });
  } catch (_) { /* noop — 실패해도 앱은 돌아감 */ }
}

// 2) Electron 바이너리 경로 찾기
//    `require.resolve('electron/cli.js')` 는 electron 의 JS 엔트리.
//    이 엔트리를 Node 로 돌리면 실제 Electron 바이너리를 spawn 한다.
const electronCli = require.resolve('electron/cli.js');

// 3) Electron 실행
const child = spawn(process.execPath, [electronCli, '.'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    // UTF-8 보장용 환경변수 (주로 자식이 Python 등 툴을 쓸 때 도움)
    LANG: process.env.LANG || 'ko_KR.UTF-8',
    LC_ALL: process.env.LC_ALL || 'ko_KR.UTF-8',
    PYTHONIOENCODING: 'utf-8',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGINT',  () => { try { child.kill('SIGINT'); }  catch {} });
process.on('SIGTERM', () => { try { child.kill('SIGTERM'); } catch {} });
