const transport = require('../src/core/transport.cjs');
const httpsConfig = require('../src/core/httpsConfig.cjs');
const externalServer = require('./external-server.cjs');
const { ensureEnvSecret } = require('../src/core/secretPolicy.cjs');
const { sameOrigin, assertSender, trustedSender, lockLocalWindow, validateSetup, envLine } = require('./security.cjs');
/**
 * Aidot Express — Electron main process.
 *
 *  역할:
 *    1) 싱글 인스턴스 보장
 *    2) Splash window 표시 (앱 시작 ~ 서버 준비 완료)
 *    3) Express 서버를 child process 로 fork, ready 시그널 대기
 *    4) Tray icon + context menu ('콘솔 열기', '서버 종료')
 *    5) 메인 BrowserWindow 는 admin-client 를 URL 로 로드
 *    6) 윈도우 닫기(X) → hide() (실제 종료는 tray 메뉴로만)
 *    7) SIGTERM 으로 서버 정상 종료 후 app.quit()
 *    8) 로그인 시 자동 시작 (openAtLogin)
 *
 *  Node/Electron 환경:
 *    Electron 40+  (Chromium 144, Node 22)
 *    CommonJS — Electron 런타임은 require() 가 기본
 *    (프로젝트 나머지는 ESM 이므로 .cjs 로 명시)
 */
'use strict';

const {
  app, BrowserWindow, Tray, Menu, dialog, Notification,
  nativeImage, shell, ipcMain,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
/**
 * 기존 설치본에서 잘못된 userData 경로에 쌓인 파일들 마이그레이션.
 *
 * 배경: 과거 버전은 app.setName 을 안 불러서 Electron 이 package.json 의 'name'
 * 필드("spring-like-node-server") 를 userData 폴더명으로 사용했다. v5+ 에서
 * setName('Aidot Express') 로 통일했지만, 기존 설치자는 이미 "spring-like-node-server"
 * 폴더에 data/ logs/ 등이 쌓여있을 수 있다.
 *
 * 이 함수는 **Aidot Express 폴더가 비어있고 spring-like-node-server 가 있으면**
 * 후자를 전자로 rename 해준다. 데이터 손실 방지.
 */
function migrateLegacyUserData() {
  if (usesCustomProfile()) return;
  try {
    const appDataRoot = app.getPath('appData');   // %APPDATA% 직접
    const newDir = path.join(appDataRoot, 'Aidot Express');
    // 과거 package.json 의 name 이 다를 수 있어 후보 여럿 체크
    const legacyDirs = [
      path.join(appDataRoot, 'spring-like-node-server'),   // 원본 이름
      path.join(appDataRoot, 'aidot-express'),              // 중간에 바뀐 경우
    ];

    const newExists = fs.existsSync(newDir);
    let newEmpty = false;
    if (newExists) {
      try { newEmpty = fs.readdirSync(newDir).length === 0; } catch {}
    }

    for (const oldDir of legacyDirs) {
      if (!fs.existsSync(oldDir)) continue;

      if (!newExists || newEmpty) {
        try {
          if (newEmpty) fs.rmdirSync(newDir);
          fs.renameSync(oldDir, newDir);
          console.log(`[electron] 마이그레이션: ${oldDir} → ${newDir}`);
          return; // 첫 성공 후 종료
        } catch (e) {
          console.warn(`[electron] userData rename 실패 (무시): ${e.message}`);
        }
      } else {
        console.warn(`[electron] 구 userData 폴더(${oldDir}) 는 더 이상 사용되지 않습니다. 필요 시 수동으로 정리하세요.`);
      }
    }
  } catch (e) {
    console.error('[electron] migrateLegacyUserData 실패:', e.message);
  }
}

const { startServerProcess, stopServerProcess } = require('./server-bridge.cjs');

let serverTransport = { enabled: false, protocol: 'http', hostname: '127.0.0.1', certificate: null };
const serverUrl = () => transport.urlFor(serverTransport.protocol, serverTransport.hostname, serverPort);
let serverExternal = false;   // ★ v1.24.0 — 서비스에 붙은 경우: 우리가 띄운 것이 아니므로 끌 때 건드리지 않는다

/** 그 포트에 aidot-express 가 이미 살아 있는가 (짧게 두드려 본다) */
function probeExternalServer(port) {
  return externalServer.probeConnection({ ...serverTransport, port }).then(prepared => {
    serverTransport = prepared;
    return true;
  });
}

/**
 * 레거시 resources/.env 파일 제거.
 * v7 미만 인스톨러는 resources/.env 와 userData/.env 양쪽에 같은 파일을 썼다.
 * v7+ 부터는 userData 단일 경로로 통일. 이전 설치본이 남긴 resources/.env 가
 * 있으면 제거해서 Dashboard 에 "2개 로드됨" 같은 혼동이 안 생기게 한다.
 */
/**
 * ★ v1.35.8 — 인스톨러가 쓴 `.env` 를 **가져온 다음** 지운다.
 *
 *  설치 중에 DB 접속 정보를 물어보고, NSIS 가 그 답을
 *  `{설치폴더}/resources/.env` 에 쓴다. 그런데 앱은 `userData/.env` 를 본다.
 *  게다가 예전 함수는 시작하자마자 그것을 **읽지도 않고 지웠다.**
 *  사용자가 설치 중에 입력한 정보가 그대로 버려진 것이다.
 *
 *  이제 userData 에 아직 `.env` 가 없으면 **먼저 옮기고** 나서 지운다.
 *  이미 있으면 사용자가 나중에 고친 것이므로 덮지 않는다.
 *
 *  @returns {boolean} 인스톨러 값을 가져왔는가 (가져왔으면 설정 창을 띄우지 않는다)
 */
function adoptInstallerEnv() {
  if (usesCustomProfile()) return false;
  try {
    const resourcesPath = process.resourcesPath || '';
    if (!resourcesPath) return false;
    const resEnv = path.join(resourcesPath, '.env');
    if (!fs.existsSync(resEnv)) return false;

    const userEnv = path.join(app.getPath('userData'), '.env');
    let adopted = false;
    if (!fs.existsSync(userEnv)) {
      fs.mkdirSync(path.dirname(userEnv), { recursive: true });
      fs.copyFileSync(resEnv, userEnv);
      console.log(`[electron] 설치 중 입력한 설정을 가져왔습니다: ${userEnv}`);
      adopted = true;
    } else {
      console.log('[electron] userData/.env 가 이미 있어 인스톨러 값은 쓰지 않습니다');
    }

    /* 가져온 뒤에는 지운다 — 두 곳에 있으면 어느 쪽이 진짜인지 헷갈린다 */
    try { fs.unlinkSync(resEnv); } catch (e) {
      console.warn(`[electron] ${resEnv} 정리 실패 (권한 부족): ${e.message}`);
    }
    return adopted;
  } catch (e) {
    console.error('[electron] adoptInstallerEnv 실패:', e.message);
    return false;
  }
}


/* ─────────────────────────── 상수 / 전역 상태 ─────────────────────────── */

const APP_NAME = 'Aidot Express';
const APP_ID   = 'com.aidot.express';

/** Vite dev 서버 URL. 환경변수로 주면 main window 는 이 URL 을 로드한다.
 *  예: cross-env VITE_DEV_URL=http://localhost:5173 electron .
 *  이렇게 하면 admin-client 를 빌드하지 않아도 Vite HMR 과 함께 UI 를 확인 가능. */
const VITE_DEV_URL = process.env.VITE_DEV_URL || '';

/** @type {BrowserWindow|null} */   let splashWin = null;
/** @type {BrowserWindow|null} */   let mainWin   = null;
/** @type {Tray|null}           */  let tray      = null;
/** @type {import('child_process').ChildProcess|null} */ let serverProc = null;
let serverPort = null;
let serverReady = false;
let isQuitting = false;

/* ─────────────────────────── UTF-8 / 한글 인코딩 ─────────────────────────── */

// Windows cp949 환경에서도 한글 로그가 깨지지 않도록 Electron main 프로세스의
// stdout/stderr 을 UTF-8 로 강제. TTY 가 아닐 때도 setDefaultEncoding 이 기본 쓰기 경로에 반영.
try {
  if (process.stdout && typeof process.stdout.setDefaultEncoding === 'function') {
    process.stdout.setDefaultEncoding('utf8');
  }
  if (process.stderr && typeof process.stderr.setDefaultEncoding === 'function') {
    process.stderr.setDefaultEncoding('utf8');
  }
} catch (_) { /* ignore */ }

// Chromium locale 을 한국어로 명시. 이렇게 하면 Electron 내장 메뉴(Cmd+A 등) 와
// 시스템 다이얼로그 라벨이 한국어로 나온다.
app.commandLine.appendSwitch('lang', 'ko-KR');

// ⭐ 앱 이름을 "Aidot Express" 로 강제 설정.
//
// 배경: Electron 의 app.getPath('userData') 는 기본적으로 package.json 의 `name`
// 필드 (productName 이 아님!) 를 폴더명으로 사용한다. package.json 에 name:
// "spring-like-node-server" 로 되어 있으면 userData 는 %APPDATA%\spring-like-node-server\
// 가 된다. 반면 인스톨러는 productName 기준으로 %APPDATA%\Aidot Express\ 에 .env 를 쓴다.
// 두 경로가 불일치하여 "사용자가 편집한 .env 는 Electron 이 쳐다보지도 않는 유령 파일"
// 증상이 발생. setName 으로 통일.
//
// 반드시 app.whenReady() 전에, 그리고 어떤 getPath 호출보다 먼저 호출해야 한다.
app.setName('Aidot Express');

// Windows 알림 아이콘 / 작업 표시줄 그룹화에 필수
app.setAppUserModelId(APP_ID);

/* ─────────────────────────── 싱글 인스턴스 ─────────────────────────── */

if (!app.requestSingleInstanceLock()) {
  // 이미 실행 중인 인스턴스가 있으면 조용히 종료 — 기존 창이 활성화됨
  app.quit();
  return;
}

app.on('second-instance', () => {
  // 두 번째 실행 시도 시 기존 메인 윈도우를 활성화
  showMainWindow();
});

/* ─────────────────────────── 플랫폼 설정 ─────────────────────────── */

// "모든 창을 닫아도 앱 종료 안함" — 트레이로 남김
app.on('window-all-closed', () => {
  // 명시적으로 아무것도 안 함
});

// A window close may keep the tray alive; an application quit must finish.
// Route OS/menu/API quits through the same owned-server shutdown sequence.
app.on('before-quit', (event) => {
  if (isQuitting) return;
  event.preventDefault();
  doQuit();
});

/* ─────────────────────────── 실행 플로우 ─────────────────────────── */

/**
 * ★ v1.35.6 — 설치본에서 `.env` 를 만들어 준다.
 *
 *  설치 직후 실행하면 서버가 곧바로 죽었다:
 *      메인 서버가 기동 직후 종료되었습니다 (exit code=1)
 *      .env 의 DB 접속 정보를 확인하세요. 자세한 원인은 log/general 에 있습니다.
 *
 *  그런데 **그 .env 도, log 폴더도 없었다.** 안내가 가리키는 곳이 둘 다 없으니
 *  사용자가 할 수 있는 일이 없다.
 *
 *  원인은 두 가지였다.
 *    ① 빌드 규칙 `!**\/.env*` 가 `.env.example` 까지 제외해, 본보기 파일조차 없었다.
 *    ② `.env` 가 없을 때 만들어 주는 코드가 어디에도 없었다.
 *       인스톨러가 썼다고 가정했지만 실제로는 쓰지 않는다.
 *
 *  이제 첫 실행에서 `.env.example` 을 userData 로 복사한다. 그 안의 기본값은
 *  DB_TYPE=sqlite 로 바꿔 둔다 — MariaDB 를 아직 준비하지 않은 사람도 일단 열리게.
 */
function ensureUserEnv() {
  const fs = require('node:fs');
  const userDir = app.getPath('userData');
  const target = path.join(userDir, '.env');
  if (fs.existsSync(target)) { ensureEnvSecret(target); return target; }

  const candidates = [
    path.join(process.resourcesPath || '', 'app', '.env.example'),
    path.join(process.resourcesPath || '', '.env.example'),
    path.join(__dirname, '..', '.env.example'),
  ];
  const source = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });

  fs.mkdirSync(userDir, { recursive: true });
  /* ★ v1.35.7 — 기본은 **MariaDB** 다.
     v1.35.6 에서는 sqlite 로 바꿔 두어 일단 열리게 했는데, 그것은 문제를 미루는 것이었다.
     쓰려는 DB 는 MariaDB 인데 sqlite 로 열리면 "되는 줄 알았다가" 나중에 어긋난다.
     대신 첫 실행에서 **접속 정보를 물어본다**(showSetupWindow). */
  const text = source
    ? fs.readFileSync(source, 'utf8').replace(/^NODE_ENV=.*$/m, 'NODE_ENV=production')
    : ['# Created on first run.', 'DB_TYPE=mariadb', 'DB_HOST=127.0.0.1', 'DB_PORT=3306',
       'DB_USER=root', 'DB_PASSWORD=', 'DB_DATABASE=aidot_express', 'PORT=7901', 'NODE_ENV=production', ''].join('\n');
  fs.writeFileSync(target, text, 'utf8');
  ensureEnvSecret(target);
  console.log(`[electron] .env 를 만들었습니다: ${target}`);
  return target;
}

/** `.env` 가 방금 만들어졌는가 — 그렇다면 접속 정보를 물어봐야 한다 */
function isFirstRun() {
  const fs = require('node:fs');
  return !fs.existsSync(path.join(app.getPath('userData'), '.env'));
}

/** `.env` 의 한 줄을 바꾼다. 없으면 끝에 붙인다. 주석과 순서는 그대로 둔다. */
function setEnvValue(text, key, value) {
  const line = envLine(key, value);
  const re = new RegExp(`^#?\\s*${key}\\s*=.*$`, 'm');
  return re.test(text) ? text.replace(re, () => line) : `${text.replace(/\n*$/, '')}\n${line}\n`;
}

/**
 * 처음 설정 창 — DB 접속 정보를 받는다.
 *
 *  왜 서버보다 먼저 띄우나: 접속 정보가 틀리면 서버는 어차피 죽는다.
 *  죽은 뒤 "확인하세요" 라고 말하는 것보다, 시작하기 전에 물어보고
 *  **그 자리에서 연결을 시험해 보는** 편이 낫다.
 *
 *  @returns {Promise<'saved'|'skipped'>}
 */
function showSetupWindow(envPath) {
  const fs = require('node:fs');
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 560, height: 620, resizable: false, minimizable: false, maximizable: false,
      title: 'Aidot Express — 처음 설정',
      webPreferences: {
        preload: path.join(__dirname, 'setup-preload.cjs'),
        contextIsolation: true, nodeIntegration: false, sandbox: true,
      },
    });
    lockLocalWindow(win);
    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, 'setup.html'));

    let done = false;
    const finish = (how) => {
      if (done) return;
      done = true;
      ipcMain.removeHandler('setup:test-db');
      ipcMain.removeHandler('setup:save');
      ipcMain.removeHandler('setup:skip');
      if (!win.isDestroyed()) win.close();
      resolve(how);
    };

    ipcMain.handle('setup:test-db', async (event, cfg) => {
      assertSender(event, win, path.join(__dirname, 'setup.html'), { file: true });
      return testDbConnection(validateSetup(cfg));
    });

    ipcMain.handle('setup:save', async (event, cfg) => {
      assertSender(event, win, path.join(__dirname, 'setup.html'), { file: true });
      cfg = validateSetup(cfg);
      try {
        let text = fs.readFileSync(envPath, 'utf8');
        text = setEnvValue(text, 'DB_TYPE', cfg.type);
        text = setEnvValue(text, 'DB_DATABASE', cfg.database || 'aidot_express');
        text = setEnvValue(text, 'PORT', cfg.serverPort || '7901');
        text = setEnvValue(text, 'CONTROL_PORT', String(Number(cfg.serverPort || '7901') + 1));
        text = setEnvValue(text, 'HOST', '127.0.0.1');
        text = setEnvValue(text, 'CONTROL_HOST', '127.0.0.1');
        if (cfg.type === 'sqlite') {
          text = setEnvValue(text, 'DB_FILE', cfg.dbfile || 'data/app.db');
        } else {
          text = setEnvValue(text, 'DB_HOST', cfg.host || '127.0.0.1');
          text = setEnvValue(text, 'DB_PORT', cfg.port || '3306');
          text = setEnvValue(text, 'DB_USER', cfg.user || 'root');
          text = setEnvValue(text, 'DB_PASSWORD', cfg.password ?? '');
        }
        fs.writeFileSync(envPath, text, 'utf8');
        console.log('[electron] 처음 설정을 저장했습니다');
        finish('saved');
        return { ok: true };
      } catch (e) {
        return { ok: false, message: `저장하지 못했습니다: ${e.message}` };
      }
    });

    ipcMain.handle('setup:skip', (event) => {
      assertSender(event, win, path.join(__dirname, 'setup.html'), { file: true });
      finish('skipped'); return { ok: true };
    });

    /* 창을 그냥 닫아도 진행은 되어야 한다 — 갇히면 안 된다 */
    win.on('closed', () => finish('skipped'));
  });
}

/**
 * 입력한 정보로 실제 연결해 본다.
 *
 *  ⚠ 스키마가 아직 없을 수 있으므로 **DB 이름 없이** 붙는다.
 *    서버는 기동할 때 스키마를 만들 수 있고, 여기서 "없다" 고 막으면
 *    사용자가 할 수 없는 일을 요구하게 된다.
 */
async function testDbConnection(cfg) {
  if (cfg.type === 'sqlite') return { ok: true, version: 'SQLite (내장)' };
  try {
    /* ⚠ 이 프로젝트의 드라이버는 `mariadb` 다 (`mysql2` 가 아니다).
       없는 모듈을 부르면 연결 시험이 늘 실패하고, 사용자는 DB 문제로 오해한다. */
    const mariadb = require('mariadb');
    const conn = await mariadb.createConnection({
      host: cfg.host || '127.0.0.1',
      port: Number(cfg.port) || 3306,
      user: cfg.user || 'root',
      password: cfg.password ?? '',
      connectTimeout: 4000,
      /* 스키마는 아직 없을 수 있으므로 지정하지 않는다 — 서버가 기동할 때 만든다 */
    });
    const rows = await conn.query('SELECT VERSION() AS v');
    await conn.end();
    return { ok: true, version: rows?.[0]?.v || '' };
  } catch (e) {
    /* 흔한 것은 풀어서 알려 준다 — 코드만 보고는 무엇을 고쳐야 할지 알기 어렵다 */
    const hint = {
      ECONNREFUSED: 'DB 가 그 주소·포트에서 듣고 있지 않습니다.',
      ETIMEDOUT: '주소에 닿지 못했습니다. 방화벽을 확인하세요.',
      ER_ACCESS_DENIED_ERROR: '사용자 이름이나 비밀번호가 맞지 않습니다.',
      ER_ACCESS_DENIED_NO_PASSWORD_ERROR: '사용자 이름이나 비밀번호가 맞지 않습니다.',
      ENOTFOUND: '그 주소를 찾지 못했습니다.',
    }[e.code];
    return { ok: false, message: hint ? `${hint}\n(${e.code})` : (e.message || String(e)) };
  }
}

app.whenReady().then(async () => {
  try {
    showSplash();

    const clientFile = httpsConfig.envPath(process.cwd(), { ...process.env, ELECTRON_USER_DATA_PATH: app.getPath('userData') });
    const connection = externalServer.loadConnection({ envFile: clientFile });
    // Service clients do not migrate server data, ask for DB credentials or create server secrets.
    if (!connection) {
      migrateLegacyUserData();
      const adopted = adoptInstallerEnv();
      const first = !adopted && isFirstRun();
      const envPath = ensureUserEnv();
      if (first) {
        if (splashWin && !splashWin.isDestroyed()) splashWin.hide();
        await showSetupWindow(envPath);
        if (splashWin && !splashWin.isDestroyed()) splashWin.show();
      }
    }
    const t0 = Date.now();
    const externalPort = connection?.port ?? null;
    if (connection) serverTransport = connection;
    const external = externalPort !== null && await probeExternalServer(externalPort);
    if (externalPort !== null && !external) throw new Error('The explicitly selected Aidot server is unavailable');
    let result;
    if (external) {
      console.log(`[electron] 이미 떠 있는 서버에 붙습니다 (:${externalPort}) — 서비스로 운영 중`);
      result = { proc: null, port: externalPort, external: true, ...serverTransport };
    } else {
      result = await startServerProcess({
        onLog: (line) => console.log('[server]', line),
        userDataPath: app.getPath('userData'),
      });
    }
    serverProc = result.proc;
    serverPort = result.port;
    serverTransport = { enabled: result.protocol === 'https', protocol: result.protocol || 'http', hostname: result.hostname || '127.0.0.1', certificate: result.certificate };
    if (!result.external && serverTransport.enabled) {
      const names = transport.certificateHosts(serverTransport);
      const loopbackName = ['localhost', '127.0.0.1'].find(host => names.includes(host));
      if (!loopbackName) throw new Error('An embedded Electron server certificate must include localhost or 127.0.0.1 in its SAN. Generate a certificate with localhost included.');
      serverTransport.hostname = loopbackName;
    }
    serverExternal = !!result.external;
    serverReady = true;
    const elapsed = Date.now() - t0;
    console.log(`[electron] server ready on :${serverPort} in ${elapsed}ms`);

    // 2) 서버가 예기치 않게 죽으면 경고
    serverProc?.on('exit', (code) => {
      serverReady = false;
      console.error(`[electron] server exited unexpectedly code=${code}`);
      if (!isQuitting) onServerCrash(code);
    });

    // 3) 트레이 + 메인 윈도우 생성 (기본 hidden)
    createTray();
    createMainWindow();    // --hidden is reserved for background startup
    if (!process.argv.includes('--hidden')) showMainWindow();

    // 4) 스플래시 닫기 + 시작 완료 토스트
    closeSplash();
    const initialFile = path.join(app.getPath('userData'), 'initial-admin-credentials.json');
    if (!serverExternal && fs.existsSync(initialFile)) {
      const initial = JSON.parse(fs.readFileSync(initialFile, 'utf8'));
      await dialog.showMessageBox(mainWin, {
        type: 'info', title: 'Initial administrator sign-in',
        message: `Username: ${initial.username}`,
        detail: `Initial password: ${initial.password}\n\nChange this password after signing in.`, buttons: ['Continue'],
      });
    }
    notifyToast(`${APP_NAME} 시작됨`, `서버가 포트 ${serverPort} 에서 실행 중입니다.`);

    // Login startup is changed only by the user's explicit tray-menu action.

  } catch (e) {
    closeSplash();
    /* supervisor 가 보낸 것이면 자식 출력이 함께 온다 (e.detail) */
    await showErrorWindow({
      reason: e?.reason || e?.message || String(e),
      output: e?.output || (e?.stack ? String(e.stack).split('\n') : []),
      envPath: e?.envPath,
      logPath: e?.logPath,
    });
    isQuitting = true;
    app.quit();
  }
});


/**
 * ★ v1.36.4 — 오류를 **읽고 복사할 수 있는 창**으로 보여 준다.
 *
 *  `dialog.showMessageBox` 는 스크롤도 복사도 안 된다. 스택이 길면 잘려서
 *  정작 필요한 줄이 보이지 않고, 보여도 손으로 옮겨 적어야 한다.
 *  실제로 그것 때문에 원인을 찾는 데 여러 번 왕복했다.
 *
 *  @param {{reason?:string, output?:string[], envPath?:string, logPath?:string}} info
 */
function showErrorWindow(info) {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 780, height: 560, minWidth: 520, minHeight: 360,
      title: '서버 시작 실패',
      webPreferences: {
        preload: path.join(__dirname, 'error-preload.cjs'),
        contextIsolation: true, nodeIntegration: false, sandbox: true,
      },
    });
    lockLocalWindow(win);
    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, 'error.html'));

    win.webContents.once('did-finish-load', () => {
      win.webContents.send('error:data', {
        reason: info.reason || '',
        output: info.output || [],
        envPath: info.envPath || '',
        logPath: info.logPath || '',
        version: app.getVersion(),
        node: process.versions.node,
      });
    });

    const done = () => {
      ipcMain.removeAllListeners('error:open-log');
      ipcMain.removeAllListeners('error:open-env');
      ipcMain.removeAllListeners('error:quit');
      if (!win.isDestroyed()) win.close();
      resolve();
    };
    /* 폴더를 열어 준다 — 경로를 손으로 옮겨 적게 하지 않는다 */
    ipcMain.on('error:open-log', (event) => { if (!trustedSender(event, win, path.join(__dirname, 'error.html'), { file: true })) return; if (info.logPath) shell.openPath(info.logPath); });
    ipcMain.on('error:open-env', (event) => { if (!trustedSender(event, win, path.join(__dirname, 'error.html'), { file: true })) return; if (info.envPath) shell.showItemInFolder(info.envPath); });
    ipcMain.on('error:quit', (event) => { if (trustedSender(event, win, path.join(__dirname, 'error.html'), { file: true })) done(); });
    win.on('closed', () => done());
  });
}

/* ─────────────────────────── Splash ─────────────────────────── */

function showSplash() {
  splashWin = new BrowserWindow({
    width: 500, height: 340,
    frame: false, alwaysOnTop: true, transparent: true,
    resizable: false, skipTaskbar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splashWin.loadFile(path.join(__dirname, 'splash.html'));
  splashWin.once('ready-to-show', () => splashWin && splashWin.show());
}

function closeSplash() {
  if (splashWin && !splashWin.isDestroyed()) splashWin.close();
  splashWin = null;
}

/* ─────────────────────────── Tray ─────────────────────────── */

function createTray() {
  const iconPath = resolveIcon('tray.png');
  const image = nativeImage.createFromPath(iconPath);
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip(`${APP_NAME} (port ${serverPort})`);
  rebuildTrayMenu();
  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
}

function rebuildTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: `${APP_NAME} — :${serverPort}`, enabled: false },
    { label: serverReady ? '● 실행 중' : '○ 중지됨', enabled: false },
    { type: 'separator' },
    { label: '콘솔 열기', click: showMainWindow },
    {
      label: '브라우저에서 열기',
      click: () => shell.openExternal(serverUrl()),
    },
    { type: 'separator' },
    { label: '개발자 도구', click: toggleDevTools, visible: isDev() },
    { label: '로그 파일 열기', click: openLogFile },
    ...(process.platform === 'win32' || process.platform === 'darwin' ? [{
      label: '로그인 시 자동 시작', type: 'checkbox',
      checked: loginStartupEnabled(), enabled: !usesCustomProfile(),
      click: (item) => {
        try {
          app.setLoginItemSettings({ openAtLogin: item.checked, ...loginStartupOptions() });
          rebuildTrayMenu();
        } catch (error) {
          dialog.showErrorBox('자동 시작 설정 실패', error.message);
          rebuildTrayMenu();
        }
      },
    }] : []),
    { type: 'separator' },
    { label: '서버 종료', click: confirmQuit },
  ]);
  tray.setContextMenu(menu);
}

/* ─────────────────────────── Main Window ─────────────────────────── */

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1280, height: 820, minWidth: 960, minHeight: 600,
    title: APP_NAME,
    icon: resolveIcon('icon.ico'),
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111214',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // VITE_DEV_URL 환경변수가 설정되어 있으면 Vite dev 서버(HMR 가능) 를 로드.
  const targetUrl = VITE_DEV_URL || serverUrl();
  const allowedTlsHosts = [serverTransport.hostname];
  if (VITE_DEV_URL) allowedTlsHosts.push(new URL(VITE_DEV_URL).hostname);
  mainWin.webContents.session.setCertificateVerifyProc((request, callback) => {
    // Trust only the configured leaf, for the expected origin hostname and validity period.
    // Every other certificate retains Chromium's normal verification result.
    callback(transport.acceptsConfiguredCertificate(serverTransport, request.hostname, request.certificate.data, allowedTlsHosts) ? 0 : -3);
  });
  loadMainUrl();

  if (VITE_DEV_URL) {
    console.log(`[electron] main window → Vite dev server: ${VITE_DEV_URL}`);
  }

  // 로드 실패 시 에러 페이지 표시 (data: URL — 가벼움) + 재시도 버튼
  mainWin.webContents.on('did-fail-load', (_ev, errorCode, errorDescription, validatedURL) => {
    // -3 은 사용자 취소 — 정상 reload 시 발생하므로 무시
    if (errorCode === -3) return;
    console.error(`[electron] loadURL 실패 code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
    // 오류 문자열/URL 을 그대로 넣으면 따옴표·태그가 HTML 을 깨뜨릴 수 있어 이스케이프한다.
    const esc = (v) => String(v).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>로딩 실패</title>
<style>
  body { font-family: Segoe UI, system-ui, sans-serif; background: #111214; color: #eee;
         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { background: #1e2024; padding: 32px 40px; border-radius: 12px; max-width: 560px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4); }
  h1 { margin: 0 0 12px; font-size: 20px; }
  p { margin: 8px 0; line-height: 1.5; color: #bbb; font-size: 14px; }
  code { background: #000; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #ffb; }
  button { margin-top: 16px; padding: 8px 20px; background: #2563eb; color: #fff; border: 0;
           border-radius: 6px; cursor: pointer; font-size: 14px; }
  button:hover { background: #1d4ed8; }
</style></head>
<body><div class="card">
  <h1>⚠ 서버 연결 실패</h1>
  <p>${esc(errorDescription)} (code: ${errorCode})</p>
  <p>요청 URL: <code>${esc(validatedURL)}</code></p>
  <p>서버가 시작 중이거나 DB 접속에 실패했을 수 있습니다.<br>트레이의 "서버 재시작" 을 시도하거나 아래 버튼으로 다시 로드하세요.</p>
  <button onclick="location.href='${esc(targetUrl)}'">다시 로드</button>
</div></body></html>`;
    try {
      mainWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    } catch {}
  });

  // 닫기 버튼 → 종료 대신 hide
  mainWin.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWin.hide();
    }
  });

  mainWin.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWin.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  mainWin.webContents.session.setPermissionCheckHandler(() => false);
  mainWin.webContents.on('will-redirect', (event, url) => { if (!isAllowedInternalUrl(url)) event.preventDefault(); });

  // 외부 링크는 기본 브라우저로 — http/https 만 허용 (file:, ms-msdt: 같은 위험한 스킴 차단)
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    else console.warn(`[electron] 차단된 새 창 URL: ${url}`);
    return { action: 'deny' };
  });

  // 창 자체가 외부 사이트로 이동하는 것을 차단 (로컬 서버 / Vite dev / 내부 data: 에러 페이지만 허용)
  mainWin.webContents.on('will-navigate', (e, url) => {
    if (!isAllowedInternalUrl(url)) {
      e.preventDefault();
      console.warn(`[electron] 차단된 내비게이션: ${url}`);
      if (isSafeExternalUrl(url)) shell.openExternal(url);
    }
  });
}

/** 현재 window 에 URL 을 로드 (실패해도 did-fail-load 에서 에러 페이지 표시). */
function loadMainUrl() {
  if (!mainWin || mainWin.isDestroyed()) return;
  const targetUrl = VITE_DEV_URL || serverUrl();
  mainWin.loadURL(targetUrl).catch((e) => {
    console.error(`[electron] loadURL reject: ${e.message}`);
  });
}

function showMainWindow() {
  if (!mainWin || mainWin.isDestroyed()) {
    createMainWindow();
  } else {
    // 기존 창에 빈 페이지나 에러 페이지가 남아있을 수 있음 — 콘솔 열 때 마다 재로드.
    // 서버가 재시작되어 이전 tab 이 무효화된 경우, "콘솔 열기" 한 번으로 복구.
    const current = mainWin.webContents.getURL();
    if (!current || current.startsWith('data:') || !current.startsWith('http')) {
      loadMainUrl();
    }
  }
  mainWin.show();
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.focus();
}

function toggleDevTools() {
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.toggleDevTools();
}

/* ─────────────────────────── 종료 ─────────────────────────── */

async function confirmQuit() {
  // 메인 윈도우가 있으면 parent 로 묶어서 모달화, 없으면 무부모 다이얼로그
  //  showMessageBox 의 1번째 인자는 BrowserWindow 여야 한다 — undefined 를 넘기면
  //  Electron 이 인자 변환 오류를 내므로, 부모 창이 없으면 옵션만 넘기는 형태로 호출한다.
  const parent = (mainWin && !mainWin.isDestroyed() && mainWin.isVisible()) ? mainWin : null;
  const boxOpts = {
    type: 'warning',
    title: '서버 종료 확인',
    message: `${APP_NAME} 서버를 종료하시겠습니까?`,
    detail: '현재 요청 중인 모든 API 가 중단되고 클라이언트 연결이 끊어집니다.\n' +
            '앱을 다시 시작할 때까지 서버는 정지 상태로 유지됩니다.',
    buttons: ['취소', '서버 종료'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
  const rs = parent
    ? await dialog.showMessageBox(parent, boxOpts)
    : await dialog.showMessageBox(boxOpts);
  if (rs.response === 1) doQuit();
}

// 로그아웃/시스템 종료 등으로 OS 가 신호를 보내면 서버까지 정리하고 끝낸다.
process.on('SIGTERM', () => doQuit());
process.on('SIGINT', () => doQuit());

function doQuit() {
  if (isQuitting) return;
  isQuitting = true;
  /* ★ v1.24.0 — 서비스에 붙은 경우 서버는 우리 것이 아니다. 창만 닫고 서버는 그대로 둔다.
     (창을 닫았다고 병원 서버가 내려가면 안 된다) */
  if (serverExternal || !serverProc) { app.quit(); return; }
  stopServerProcess(serverProc)
    .catch((e) => console.error('[electron] server stop error:', e))
    .finally(() => app.quit());
}

function onServerCrash(code) {
  rebuildTrayMenu();
  // 이미 사용자가 콘솔을 보고 있을 수도 있으므로 경고 대화상자
  dialog.showMessageBox({
    type: 'error',
    title: '서버가 예기치 않게 종료됨',
    message: `Aidot Express 서버 프로세스가 code=${code} 로 종료되었습니다.`,
    detail: '앱을 재시작하거나 로그 파일을 확인해주세요.',
    buttons: ['종료', '무시'],
    defaultId: 0,
  }).then((r) => {
    if (r.response === 0) {
      isQuitting = true;
      app.quit();
    }
  });
}

/* ─────────────────────────── 유틸 ─────────────────────────── */

function notifyToast(title, body) {
  if (!Notification.isSupported()) return;
  new Notification({
    title, body, silent: true,
    icon: resolveIcon('icon.ico'),
  }).show();
}

function openLogFile() {
  // 프로젝트 루트 바깥 logs/ 디렉토리 (배포 시 resources 경로 기준)
  const projectRoot = isDev()
    ? path.resolve(__dirname, '..')
    : path.resolve(process.resourcesPath || app.getAppPath(), 'app');
  const candidates = [
    path.join(projectRoot, 'log'),
    path.join(app.getPath('userData'), 'logs'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) shell.openPath(found);
  else shell.showItemInFolder(app.getPath('userData'));
}

function resolveIcon(name) {
  // dev: electron/build/, prod: resources/
  const distResources = path.join(process.resourcesPath || '', 'electron', 'build', name);
  const devResources  = path.join(__dirname, 'build', name);
  return fs.existsSync(distResources) ? distResources : devResources;
}

function isDev() {
  return !app.isPackaged;
}

function usesCustomProfile() {
  const standard = path.join(app.getPath('appData'), 'Aidot Express');
  return path.relative(standard, app.getPath('userData')) !== '';
}

function loginStartupOptions() {
  return process.platform === 'win32'
    ? { path: process.execPath, args: ['--hidden'] }
    : { openAsHidden: true, args: ['--hidden'] };
}

function loginStartupEnabled() {
  if (usesCustomProfile()) return false;
  try {
    return app.getLoginItemSettings(loginStartupOptions()).openAtLogin
      || app.getLoginItemSettings().openAtLogin;
  } catch { return false; }
}

/** 기본 브라우저로 열어도 되는 URL 인가 (http/https 만) */
function isSafeExternalUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

/** 앱 창 안에서 이동해도 되는 URL 인가 — 로컬 서버(loopback) 와 Vite dev 서버, 내부 에러 페이지만 */
function isAllowedInternalUrl(url) {
  return sameOrigin(url, VITE_DEV_URL || serverUrl());
}

/* ─────────────────────────── IPC (preload 에서 사용) ─────────────────────────── */

ipcMain.handle('app:info', (event) => {
  assertSender(event, mainWin, VITE_DEV_URL || serverUrl());
  return ({
  name: APP_NAME,
  version: app.getVersion(),
  port: serverPort,
  protocol: serverTransport.protocol,
  serverExternal,
  serverReady,
  isDev: isDev(),
});
});

ipcMain.handle('app:open-external', (event, url) => {
  assertSender(event, mainWin, VITE_DEV_URL || serverUrl());
  if (isSafeExternalUrl(url)) return shell.openExternal(url);
  console.warn(`[electron] 차단된 openExternal 요청: ${url}`);
  return false;
});

// A local, sender-validated app operation. The renderer cannot run arbitrary commands.
ipcMain.handle('app:restart', (event) => {
  assertSender(event, mainWin, VITE_DEV_URL || serverUrl());
  if (serverExternal) throw new Error('Restart the external service to apply HTTPS settings');
  app.relaunch();
  setImmediate(() => doQuit());
  return true;
});
