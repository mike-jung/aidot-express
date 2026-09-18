'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readEnv } = require('../src/core/httpsConfig.cjs');
const { assertSender, lockLocalWindow, validateSetup, envLine } = require('./security.cjs');

function readSetup(envPath, { recovery = true } = {}) {
  const env = readEnv(envPath);
  const dbBase = recovery && env.DB_FILE ? path.resolve(__dirname, '..') : path.dirname(envPath);
  return {
    type: env.DB_TYPE || 'mariadb', host: env.DB_HOST || '127.0.0.1',
    port: env.DB_PORT || '3306', user: env.DB_USER || 'root', password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || 'aidot_express', dbfile: path.resolve(dbBase, env.DB_FILE || 'app.db'),
    serverPort: env.PORT || '7901', service: env.DB_SERVICE || '',
  };
}

function saveSetup(envPath, cfg, { recovery = false } = {}) {
  cfg = validateSetup(cfg);
  let text = fs.readFileSync(envPath, 'utf8');
  const values = { DB_TYPE: cfg.type, DB_DATABASE: cfg.database || 'aidot_express' };
  if (cfg.type === 'sqlite') values.DB_FILE = path.resolve(path.dirname(envPath), cfg.dbfile || 'app.db');
  else Object.assign(values, {
    DB_HOST: cfg.host || '127.0.0.1', DB_PORT: cfg.port || '3306',
    DB_USER: cfg.user || 'root', DB_PASSWORD: cfg.password ?? '',
    ...(cfg.type === 'oracle' ? { DB_SERVICE: cfg.service || cfg.database } : {}),
  });
  // DB 복구는 이미 사용 중인 HTTP/HTTPS, 호스트, 포트를 바꾸지 않는다.
  if (!recovery) Object.assign(values, {
    PORT: cfg.serverPort || '7901', CONTROL_PORT: String(Number(cfg.serverPort || '7901') + 1),
    HOST: '127.0.0.1', CONTROL_HOST: '127.0.0.1',
  });
  for (const [key, value] of Object.entries(values)) {
    const line = envLine(key, value);
    const re = new RegExp(`^#?\\s*${key}\\s*=.*$`, 'gm');
    text = re.test(text) ? text.replace(re, () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  // 완성한 내용을 임시 파일에 쓴 다음 교체한다. 실패하면 기존 설정을 보존한다.
  const tmp = `${envPath}.db-setup-${process.pid}`;
  try {
    fs.writeFileSync(tmp, text, { mode: 0o600, flag: 'wx' });
    fs.renameSync(tmp, envPath);
  } finally { fs.rmSync(tmp, { force: true }); }
}

async function testDbConnection(cfg, envPath) {
  let connection;
  try {
    if (cfg.type === 'sqlite') {
      const file = path.resolve(path.dirname(envPath), cfg.dbfile || 'app.db');
      if (fs.existsSync(file)) {
        const Database = require('better-sqlite3');
        const db = new Database(file, { readonly: true });
        try { db.prepare('PRAGMA schema_version').get(); } finally { db.close(); }
        fs.accessSync(file, fs.constants.W_OK);
      } else {
        let parent = path.dirname(file);
        while (!fs.existsSync(parent)) parent = path.dirname(parent);
        fs.accessSync(parent, fs.constants.W_OK);
      }
      return { ok: true, version: 'SQLite' };
    }
    if (cfg.type === 'oracle') {
      const driver = require('oracledb');
      connection = await driver.getConnection({ user: cfg.user, password: cfg.password,
        connectString: `${cfg.host}:${cfg.port || 1521}/${cfg.service || cfg.database}?connect_timeout=4` });
      await connection.execute('SELECT 1 FROM DUAL');
      return { ok: true, version: 'Oracle' };
    }
    connection = await require('mariadb').createConnection({
      host: cfg.host || '127.0.0.1', port: Number(cfg.port) || 3306,
      user: cfg.user || 'root', password: cfg.password ?? '', connectTimeout: 4000,
    });
    const rows = await connection.query('SELECT VERSION() AS v');
    return { ok: true, version: rows?.[0]?.v || '' };
  } catch (error) {
    const hint = {
      ECONNREFUSED: 'DB 주소와 포트를 확인하세요.', ETIMEDOUT: 'DB 주소와 방화벽을 확인하세요.',
      ER_ACCESS_DENIED_ERROR: '사용자 이름과 비밀번호를 확인하세요.', ENOTFOUND: 'DB 주소를 찾지 못했습니다.',
    }[error.code];
    return { ok: false, message: hint ? `${hint} (${error.code})` : error.message };
  } finally {
    try { if (connection?.end) await connection.end(); else await connection?.close(); } catch { /* 이미 종료 */ }
  }
}

function showSetupWindow({ electron, envPath, parent, recovery = false, testConnection = testDbConnection }) {
  const { BrowserWindow, ipcMain } = electron;
  return new Promise((resolve) => {
    const file = path.join(__dirname, 'setup.html');
    const win = new BrowserWindow({
      width: 570, height: 670, resizable: false, minimizable: false, maximizable: false,
      ...(parent ? { parent, modal: true } : {}),
      title: recovery ? 'Aidot Express — DB 연결 설정' : 'Aidot Express — 처음 설정',
      webPreferences: { preload: path.join(__dirname, 'setup-preload.cjs'),
        contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    lockLocalWindow(win);
    win.setMenuBarVisibility(false);
    let finished = false;
    let busy = false;
    let saved = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      for (const name of ['read', 'test-db', 'save', 'skip']) ipcMain.removeHandler(`setup:${name}`);
      if (!win.isDestroyed()) win.close();
      resolve(result);
    };
    const trusted = (event) => assertSender(event, win, file, { file: true });
    ipcMain.handle('setup:read', (event) => {
      trusted(event);
      // 비밀번호는 격리된 로컬 설정창에만 전달한다. 콘솔 렌더러에는 노출하지 않는다.
      return { config: readSetup(envPath, { recovery }), recovery };
    });
    const operation = async (event, input, save) => {
      trusted(event);
      if (busy || saved || finished) return { ok: false, message: '처리 중입니다.' };
      busy = true;
      try {
        const cfg = validateSetup(input);
        const result = await testConnection(cfg, envPath);
        if (!result.ok || !save) return result;
        saveSetup(envPath, cfg, { recovery });
        saved = true;
        busy = false;
        // IPC 응답을 먼저 전달한 다음 창을 닫는다.
        setImmediate(() => finish('saved'));
        return { ok: true };
      } catch (error) { return { ok: false, message: error.message }; }
      finally { busy = false; }
    };
    ipcMain.handle('setup:test-db', (event, cfg) => operation(event, cfg, false));
    ipcMain.handle('setup:save', (event, cfg) => operation(event, cfg, true));
    ipcMain.handle('setup:skip', (event) => {
      trusted(event);
      if (busy) return { ok: false };
      finish('skipped');
      return { ok: true };
    });
    win.on('close', (event) => { if (busy) event.preventDefault(); });
    win.on('closed', () => finish('skipped'));
    win.loadFile(file);
  });
}

module.exports = { readSetup, saveSetup, testDbConnection, showSetupWindow };
