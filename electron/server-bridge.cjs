/**
 * Aidot Express — 서버 프로세스 브릿지.
 *
 *  main.cjs 가 호출하여 Express 서버를 child_process 로 fork 한다.
 *   - 프로젝트 entrypoint 는 ESM (src/app.js) + decorator loader 를 사용하므로
 *     execArgv 에 '--import ./src/loader/register.mjs' 를 전달해야 함.
 *   - 서버는 listen 직후 process.send({ type: 'ready', port }) 을 보내도록
 *     app.js 에 훅을 추가해 두었다 (IS_ELECTRON 환경변수 체크).
 *   - ready 시그널 수신 전까지 Promise 대기, 타임아웃 시 reject.
 *   - SIGTERM → graceful shutdown → SIGKILL fallback (5초 후)
 *
 *  리소스 위치 처리:
 *    - 개발 모드:   /src/app.js 그대로
 *    - packaged:    resources/app/src/app.js
 */
'use strict';

const { fork } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const STARTUP_TIMEOUT_MS = 30_000;
const SHUTDOWN_GRACE_MS  = 5_000;

function resolveAppRoot() {
  // packaged: process.resourcesPath/app/  (electron-builder 기본)
  // dev:      프로젝트 루트 (electron/ 의 상위)
  if (process.resourcesPath) {
    const packed = path.join(process.resourcesPath, 'app');
    if (fs.existsSync(path.join(packed, 'src', 'supervisor.js'))) return packed;
  }
  return path.resolve(__dirname, '..');
}

function startServerProcess({ onLog, userDataPath } = {}) {
  return new Promise((resolve, reject) => {
    const appRoot    = resolveAppRoot();
    // Supervisor 를 entrypoint 로 사용 — 이렇게 하면 main(7901) + control(7902) 모두 기동됨.
    //   기존엔 src/app.js 를 직접 fork 했는데, 그러면 메인 서버(7901)만 뜨고
    //   control 서버(7902) 는 띄우지 못해 supervisor control API 가 동작 안함.
    const serverEntry = path.join(appRoot, 'src', 'supervisor.js');
    const loaderFile  = path.join(appRoot, 'src', 'loader', 'register.mjs');

    if (!fs.existsSync(serverEntry)) {
      return reject(new Error(`supervisor entry 파일이 없음: ${serverEntry}`));
    }
    if (!fs.existsSync(loaderFile)) {
      return reject(new Error(`loader 파일이 없음: ${loaderFile}`));
    }

    // Windows 에서 절대경로(D:\...)를 그대로 --import 에 넘기면 Node ESM 로더가
    // 'd:' 를 URL scheme 으로 해석해서 ERR_UNSUPPORTED_ESM_URL_SCHEME 을 발생시킨다.
    // 반드시 file:// URL 로 변환해야 함.  pathToFileURL() 이 OS 별 차이를 정확히 처리.
    //   Windows: D:\foo\register.mjs  → file:///D:/foo/register.mjs
    //   POSIX:   /home/foo/register.mjs → file:///home/foo/register.mjs
    const loaderUrl = pathToFileURL(loaderFile).href;

    const proc = fork(serverEntry, [], {
      cwd: appRoot,
      execArgv: ['--import', loaderUrl],
      env: {
        ...process.env,
        // ⭐ 자식(supervisor) 과 그 손자(app.js) 를 "순수 Node" 로 실행시키는 스위치.
        //    packaged 앱에서 process.execPath 는 electron.exe 이므로, 이 값이 없으면
        //    supervisor 가 spawn(process.execPath, ...) 할 때 Electron GUI 가 한 번 더 뜨고
        //    싱글 인스턴스 락에 걸려 즉시 종료 → 메인 서버가 영영 기동되지 않는다.
        //    fork() 가 자동으로 넣어 주는 경우도 있지만, env 를 직접 지정하면 덮어써질 수 있어 명시한다.
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: process.env.NODE_ENV || 'production',
        IS_ELECTRON: '1',
        // 자식 프로세스는 'process.resourcesPath' 가 undefined 이므로 명시적으로 전달.
        // config/index.js 가 이 값을 받아 {resourcesPath}/.env 를 fallback 으로 로드.
        ELECTRON_RESOURCES_PATH: process.resourcesPath || '',
        // ⭐ 사용자별 설정 저장소 — config/index.js 가 {userData}/.env 를 최우선 로드.
        //    인스톨러가 userData 에도 .env 를 쓰므로, 앱 재설치/업그레이드 시에도 사용자 설정 보존.
        ELECTRON_USER_DATA_PATH: userDataPath || '',
        // src/database/db.js 가 참조하는 별칭 (sqlite 파일 위치) — 두 이름 모두 채워 준다.
        ELECTRON_USER_DATA: userDataPath || '',
        // 로그도 설치 폴더가 아닌 userData 아래로 (설치 폴더 권한/재설치 이슈 회피)
        LOG_DIR: process.env.LOG_DIR || (userDataPath ? path.join(userDataPath, 'log') : ''),
        // 자식 프로세스 내부에서도 UTF-8 을 강제하기 위한 힌트
        //   - Windows 에서 winston/console 출력이 깨지지 않도록
        //   - Node 의 기본 encoding 은 utf8 이지만 서드파티 라이브러리가 locale 을 보고 다르게
        //     쓰는 경우 대비 (예: Python subprocess 같은 도구)
        LANG: process.env.LANG || 'ko_KR.UTF-8',
        LC_ALL: process.env.LC_ALL || 'ko_KR.UTF-8',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    // Windows 의 Korean codepage(cp949) 환경에서도 자식 프로세스의 UTF-8 출력이
    // 깨지지 않도록 pipe 에 encoding 을 utf8 로 명시.
    //   .on('data', handler) 는 encoding 이 설정되어 있으면 string 으로 전달됨.
    if (proc.stdout) proc.stdout.setEncoding('utf8');
    if (proc.stderr) proc.stderr.setEncoding('utf8');

    // stdout/stderr 로깅 전달
    if (proc.stdout && onLog) {
      proc.stdout.on('data', (s) => onLog(String(s).trimEnd()));
    }
    if (proc.stderr && onLog) {
      proc.stderr.on('data', (s) => onLog('[stderr] ' + String(s).trimEnd()));
    }

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`서버가 ${STARTUP_TIMEOUT_MS}ms 내에 준비되지 않았습니다`));
    }, STARTUP_TIMEOUT_MS);

    proc.once('message', (msg) => {
      clearTimeout(timer);
      if (msg && msg.type === 'ready' && typeof msg.port === 'number') {
        resolve({ proc, port: msg.port });
        return;
      }
      // supervisor 가 기동 실패 원인을 알려 준 경우 — 그대로 사용자에게 표시한다
      if (msg && msg.type === 'error') {
        reject(new Error(msg.message || '서버 기동에 실패했습니다'));
      } else {
        reject(new Error(`예상치 못한 ready 메시지: ${JSON.stringify(msg)}`));
      }
      try { proc.kill('SIGTERM'); } catch {}
      setTimeout(() => { try { if (proc.exitCode === null) proc.kill('SIGKILL'); } catch {} }, 3000).unref?.();
    });

    proc.once('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });

    // ready 이전에 exit 하면 실패
    const earlyExit = (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`서버가 준비 전에 종료됨: code=${code} signal=${signal}`));
    };
    proc.once('exit', earlyExit);

    // ready 가 오면 earlyExit 리스너 해제
    proc.once('message', (msg) => {
      if (msg && msg.type === 'ready') {
        proc.off('exit', earlyExit);
      }
    });
  });
}

/**
 * 서버 프로세스 정상 종료. SIGTERM 먼저, 5초 내 exit 안하면 SIGKILL.
 * @param {import('child_process').ChildProcess|null} proc
 */
function stopServerProcess(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null || proc.killed) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };

    proc.once('exit', finish);

    try { proc.kill('SIGTERM'); } catch {}
    setTimeout(() => {
      if (!done && proc.exitCode === null) {
        try { proc.kill('SIGKILL'); } catch {}
      }
    }, SHUTDOWN_GRACE_MS);
  });
}

module.exports = { startServerProcess, stopServerProcess, resolveAppRoot };
