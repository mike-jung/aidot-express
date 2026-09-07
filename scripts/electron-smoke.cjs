#!/usr/bin/env node
/**
 * scripts/electron-smoke.cjs — Electron 메인 프로세스 실행 검증 (GUI 없이).
 *
 *  왜 필요한가
 *    electron/main.cjs 는 GUI 가 있어야 실행되지만, 정작 문제가 잘 생기는 부분은
 *    "서버 자식 프로세스 기동 / ready 핸드셰이크 / 창 로드 URL / 보안 옵션 / 종료 처리" 처럼
 *    화면과 무관한 로직이다. 이 스크립트는 electron 모듈만 가짜(fake)로 바꿔치기하고
 *    main.cjs 를 그대로 실행해서, 진짜 서버를 fork 하고 그 흐름 전체를 점검한다.
 *
 *  검사 항목
 *    1) 싱글 인스턴스 락 / setName / AppUserModelId
 *    2) 스플래시·메인 윈도우의 보안 옵션 (contextIsolation, sandbox, nodeIntegration)
 *    3) 서버 자식 프로세스 fork → ready 시그널 수신 → 해당 포트가 실제 HTTP 200 응답
 *    4) 메인 윈도우가 로컬 서버 URL 을 로드하고, 그 URL 이 admin-client SPA 를 반환
 *    5) 트레이 메뉴 구성
 *    6) 외부 URL 정책: http/https 만 기본 브라우저로, file:/그 외 스킴 차단, 외부 사이트 내비게이션 차단
 *    7) IPC (app:info, app:open-external)
 *    8) 실시간(SSE): Electron 이 띄운 서버에서 스트림이 정상 동작하는가
 *       — 압축 우회 · 이벤트 즉시 전달 · 관리자 티켓 인증 · 종료 시 스트림 정리
 *    9) 트레이 [서버 종료] → 서버 프로세스 정상 종료 (포트 해제)
 *
 *  사용법
 *    node scripts/electron-smoke.cjs                 # .env 사용
 *    AIDOT_ENV_FILE=.tmp/electron.env node scripts/electron-smoke.cjs
 */
'use strict';

const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const projectRoot = path.resolve(__dirname, '..');
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 90_000);

let pass = 0; const failures = [];
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { failures.push(name); console.log(`  ✗ ${name}${detail ? '  — ' + String(detail).slice(0, 200) : ''}`); }
};

/* ─────────────────────── 가짜 electron 모듈 ─────────────────────── */

const state = {
  appName: null, appUserModelId: null, switches: [],
  windows: [], tray: null, trayMenu: null,
  ipcHandlers: new Map(), dialogs: [], notifications: [],
  openedExternal: [], openedPaths: [],
  quitCalled: false, loginItem: null,
  windowOpenHandler: null, willNavigate: null,
};
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-el-'));

class FakeWebContents {
  constructor(win) { this.win = win; this.url = ''; this.listeners = new Map(); this.devToolsOpen = false; }
  on(ev, fn) {
    this.listeners.set(ev, fn);
    if (ev === 'will-navigate') state.willNavigate = fn;
    return this;
  }
  setWindowOpenHandler(fn) { state.windowOpenHandler = fn; }
  getURL() { return this.url; }
  toggleDevTools() { this.devToolsOpen = !this.devToolsOpen; }
  emit(ev, ...args) { const fn = this.listeners.get(ev); if (fn) fn(...args); }
}
class FakeBrowserWindow {
  constructor(opts = {}) {
    this.opts = opts;
    this.webContents = new FakeWebContents(this);
    this.destroyed = false; this.visible = false; this.loaded = null;
    this.events = new Map();
    state.windows.push(this);
  }
  loadFile(f) { this.loaded = { type: 'file', value: f }; this.emitOnce('ready-to-show'); return Promise.resolve(); }
  loadURL(u) { this.loaded = { type: 'url', value: u }; this.webContents.url = u; this.emitOnce('ready-to-show'); return Promise.resolve(); }
  once(ev, fn) { this.events.set(ev, fn); if (ev === 'ready-to-show' && this.loaded) fn(); return this; }
  on(ev, fn) { this.events.set(ev, fn); return this; }
  emitOnce(ev, ...a) { const fn = this.events.get(ev); if (fn) fn(...a); }
  show() { this.visible = true; } hide() { this.visible = false; }
  close() { this.destroyed = true; }
  focus() {} restore() {}
  isDestroyed() { return this.destroyed; }
  isVisible() { return this.visible; }
  isMinimized() { return false; }
}
class FakeTray {
  constructor(img) { this.image = img; state.tray = this; this.listeners = new Map(); }
  setToolTip(t) { this.tooltip = t; }
  setContextMenu(m) { state.trayMenu = m; }
  on(ev, fn) { this.listeners.set(ev, fn); }
}
const fakeElectron = {
  app: {
    isPackaged: false,
    getVersion: () => require(path.join(projectRoot, 'package.json')).version,
    getPath: (k) => (k === 'userData' ? userDataDir : k === 'appData' ? path.dirname(userDataDir) : userDataDir),
    getAppPath: () => projectRoot,
    setName: (n) => { state.appName = n; },
    setAppUserModelId: (id) => { state.appUserModelId = id; },
    setLoginItemSettings: (s) => { state.loginItem = s; },
    requestSingleInstanceLock: () => true,
    commandLine: { appendSwitch: (k, v) => state.switches.push(`${k}=${v}`) },
    on: () => {},
    whenReady: () => Promise.resolve(),
    quit: () => { state.quitCalled = true; },
  },
  BrowserWindow: FakeBrowserWindow,
  Tray: FakeTray,
  Menu: { buildFromTemplate: (tpl) => ({ items: tpl }) },
  dialog: {
    showMessageBox: async (a, b) => {
      const opts = b || a;
      state.dialogs.push(opts);
      // '서버 종료' 확인 대화상자에는 항상 [종료] 선택
      return { response: Array.isArray(opts.buttons) && opts.buttons.length > 1 ? 1 : 0 };
    },
  },
  Notification: class { constructor(o) { state.notifications.push(o); } show() {} static isSupported() { return true; } },
  nativeImage: { createFromPath: (p) => ({ isEmpty: () => !p || !fs.existsSync(p) }), createEmpty: () => ({ isEmpty: () => true }) },
  shell: {
    openExternal: (u) => { state.openedExternal.push(u); return Promise.resolve(); },
    openPath: (p) => { state.openedPaths.push(p); return Promise.resolve(''); },
    showItemInFolder: (p) => { state.openedPaths.push(p); },
  },
  ipcMain: { handle: (ch, fn) => state.ipcHandlers.set(ch, fn) },
};

// require('electron') 을 가짜로 치환
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return fakeElectron;
  return origLoad.apply(this, arguments);
};

/* ─────────────────────── 실행 ─────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms, label) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(250); }
  throw new Error(`timeout: ${label}`);
};

(async () => {
  console.log(`electron-smoke → ${projectRoot}`);
  console.log(`  userData=${userDataDir}`);

  require(path.join(projectRoot, 'electron', 'main.cjs'));

  check('app.setName("Aidot Express") 호출', state.appName === 'Aidot Express', state.appName);
  check('AppUserModelId 설정', state.appUserModelId === 'com.aidot.express', state.appUserModelId);
  check('Chromium lang=ko-KR 스위치', state.switches.includes('lang=ko-KR'), state.switches.join(','));

  // 스플래시는 즉시 생성됨
  await waitFor(async () => state.windows.length >= 1, 10_000, 'splash window');
  const splash = state.windows[0];
  const sp = splash.opts.webPreferences || {};
  check('스플래시 보안 옵션 (contextIsolation/sandbox/!nodeIntegration)',
    sp.contextIsolation === true && sp.sandbox === true && sp.nodeIntegration === false, JSON.stringify(sp));
  check('스플래시 splash.html 로드', splash.loaded?.value?.endsWith('splash.html'), JSON.stringify(splash.loaded));

  // 서버 기동 대기 → 메인 윈도우 생성
  await waitFor(async () => state.windows.length >= 2, TIMEOUT_MS, '서버 기동 + 메인 윈도우');
  const mainWin = state.windows[1];
  const wp = mainWin.opts.webPreferences || {};
  check('메인 윈도우 보안 옵션', wp.contextIsolation === true && wp.sandbox === true && wp.nodeIntegration === false, JSON.stringify(wp));
  check('preload 파일 존재', typeof wp.preload === 'string' && fs.existsSync(wp.preload), wp.preload);
  check('스플래시 닫힘', splash.isDestroyed(), '');

  const loadedUrl = mainWin.loaded?.value || '';
  check('메인 윈도우가 로컬 서버 URL 로드', /^http:\/\/127\.0\.0\.1:\d+\/$/.test(loadedUrl), loadedUrl);

  const info = await state.ipcHandlers.get('app:info')();
  check('IPC app:info — serverReady/port', info.serverReady === true && Number(info.port) > 0, JSON.stringify(info));
  check('로드 URL 의 포트 == ready 포트', loadedUrl.includes(`:${info.port}/`), `${loadedUrl} vs ${info.port}`);

  // 실제 HTTP 응답 확인
  const health = await fetch(`http://127.0.0.1:${info.port}/health`).then((r) => r.json()).catch((e) => ({ err: e.message }));
  check('서버 /health 응답 ok', health.ok === true, JSON.stringify(health));
  const spa = await fetch(`http://127.0.0.1:${info.port}/`).then(async (r) => ({ s: r.status, t: await r.text() })).catch((e) => ({ err: e.message }));
  check('루트 / 가 admin-client SPA(index.html) 반환',
    spa.s === 200 && /<div id="app"|<script[^>]+assets\//.test(spa.t || ''), `status=${spa.s}`);

  // 트레이
  const labels = (state.trayMenu?.items || []).map((i) => i.label).filter(Boolean);
  check('트레이 생성 + 메뉴 구성', !!state.tray && labels.includes('콘솔 열기') && labels.includes('서버 종료'), labels.join(' | '));
  check('트레이 툴팁에 포트 표시', String(state.tray?.tooltip || '').includes(String(info.port)), state.tray?.tooltip);

  // 외부 URL 정책
  const beforeExt = state.openedExternal.length;
  const denyFile = state.windowOpenHandler({ url: 'file:///etc/passwd' });
  check('새 창: file: 스킴 차단', denyFile?.action === 'deny' && state.openedExternal.length === beforeExt, JSON.stringify(state.openedExternal.slice(beforeExt)));
  const denyHttps = state.windowOpenHandler({ url: 'https://example.com/docs' });
  check('새 창: https 는 기본 브라우저로 위임', denyHttps?.action === 'deny' && state.openedExternal.at(-1) === 'https://example.com/docs', state.openedExternal.at(-1));

  let prevented = false;
  state.willNavigate({ preventDefault: () => { prevented = true; } }, 'https://evil.example.com/');
  check('내비게이션: 외부 사이트 차단', prevented === true, '');
  prevented = false;
  state.willNavigate({ preventDefault: () => { prevented = true; } }, `http://127.0.0.1:${info.port}/dashboard`);
  check('내비게이션: 로컬 서버는 허용', prevented === false, '');

  const openExt = state.ipcHandlers.get('app:open-external');
  const bad = await openExt({}, 'ms-msdt:/id');
  check('IPC open-external: 위험 스킴 거부', bad === false, String(bad));

  /* ── 실시간(SSE) — Electron 이 fork 한 서버에서도 스트림이 동작해야 한다 ──
   *   패키징 환경에서는 서버가 "Electron 바이너리를 Node 모드로 실행한 자식" 이므로,
   *   압축 미들웨어·소켓 옵션이 개발 환경과 다르게 동작할 여지가 있다. 여기서 실제로 확인한다. */
  const sseState = { stream: null, events: [] };
  {
    const base = `http://127.0.0.1:${info.port}`;
    const ac = new AbortController();
    sseState.abort = ac;
    const res = await fetch(`${base}/api/events/stream?channel=electron-smoke`,
      { headers: { Accept: 'text/event-stream' }, signal: ac.signal });
    check('SSE 스트림 200 + text/event-stream',
      res.status === 200 && String(res.headers.get('content-type')).includes('text/event-stream'), `${res.status}`);
    check('SSE 응답이 압축되지 않음 (이벤트 즉시 전달)', !res.headers.get('content-encoding'), res.headers.get('content-encoding'));

    let closed = false;
    (async () => {
      const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      try {
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, i); buf = buf.slice(i + 2);
            const ev = /event: ([\w-]+)/.exec(raw); const dt = /data: (.*)/.exec(raw);
            if (ev) sseState.events.push({ event: ev[1], data: dt?.[1] || '' });
          }
        }
      } catch { /* abort */ } finally { closed = true; }
    })();
    sseState.isClosed = () => closed;

    await sleep(400);
    const t0 = Date.now();
    const pub = await fetch(`${base}/api/events/publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'electron-smoke', message: 'Electron 환경 전달 확인' }),
    }).then((r) => r.json());
    await waitFor(async () => sseState.events.some((e) => e.data.includes('Electron 환경 전달 확인')), 3000, 'SSE 메시지 수신')
      .catch(() => {});
    const got = sseState.events.find((e) => e.data.includes('Electron 환경 전달 확인'));
    check(`SSE 발행 → 수신 (${Date.now() - t0}ms)`, !!got && pub?.data?.delivered >= 1, JSON.stringify(pub?.data));

    // 관리자 티켓 인증 경로 (콘솔이 실제로 쓰는 방식)
    const login = await fetch(`${base}/api/admin/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin1234' }),
    }).then((r) => r.json()).catch(() => null);
    const token = login?.data?.accessToken;
    check('관리자 로그인(스모크 환경)', !!token, JSON.stringify(login)?.slice(0, 120));
    if (token) {
      const tk = await fetch(`${base}/api/admin/sse/ticket`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}',
      }).then((r) => r.json());
      check('SSE 티켓 발급', typeof tk?.data?.ticket === 'string' && tk.data.expiresIn > 0, JSON.stringify(tk)?.slice(0, 120));

      const ac2 = new AbortController();
      const mres = await fetch(`${base}/api/admin/metrics/stream?intervalMs=1000&ticket=${encodeURIComponent(tk.data.ticket)}`,
        { headers: { Accept: 'text/event-stream' }, signal: ac2.signal });
      check('티켓으로 지표 스트림 접속 200', mres.status === 200, `${mres.status}`);
      ac2.abort();

      const reuse = await fetch(`${base}/api/admin/metrics/stream?ticket=${encodeURIComponent(tk.data.ticket)}`)
        .then((r) => r.status).catch(() => 0);
      check('티켓 재사용 차단 401', reuse === 401, String(reuse));
    }
  }

  // 종료: 트레이 [서버 종료] 클릭
  const quitItem = (state.trayMenu.items || []).find((i) => i.label === '서버 종료');
  await quitItem.click();
  await waitFor(async () => state.quitCalled, 20_000, 'app.quit');
  check('트레이 [서버 종료] → 종료 확인 대화상자', state.dialogs.some((d) => String(d.title).includes('종료 확인')), '');
  let after = 'still-alive';
  for (let i = 0; i < 16; i++) {
    await sleep(500);
    after = await fetch(`http://127.0.0.1:${info.port}/health`, { signal: AbortSignal.timeout(1500) })
      .then(() => 'still-alive').catch(() => 'closed');
    if (after === 'closed') break;
  }
  check('종료 후 서버 포트 해제', after === 'closed', after);
  check('종료 시 열려 있던 SSE 스트림도 닫힘', sseState.isClosed(), '스트림이 아직 열려 있음');
  const bye = sseState.events.find((e) => e.event === 'server-shutdown');
  check('종료 직전 server-shutdown 이벤트 전달', !!bye, sseState.events.map((e) => e.event).join(','));
  try { sseState.abort?.abort(); } catch { /* noop */ }

  console.log(`\nelectron-smoke 결과: pass=${pass} fail=${failures.length}` + (failures.length ? `\n실패: ${failures.join(' | ')}` : ''));
  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error(`\nelectron-smoke 중단: ${e.message}`);
  console.log(`진행된 검사: pass=${pass} fail=${failures.length}`);
  process.exit(1);
});
