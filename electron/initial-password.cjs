'use strict';
const path = require('node:path');
const { assertSender, lockLocalWindow } = require('./security.cjs');

function showInitialPassword({ parent, credential, regenerate, electron = require('electron') }) {
  const { BrowserWindow, ipcMain, clipboard } = electron;
  const page = path.join(__dirname, 'initial-password.html');
  if (typeof credential?.username !== 'string' || typeof credential?.password !== 'string'
      || !credential.username || !credential.password) throw new Error('Invalid initial administrator credentials');
  return new Promise((resolve, reject) => {
    let current = { username: credential.username, password: credential.password };
    let busy = false, uncertain = false, loadError = null;
    const win = new BrowserWindow({
      parent, modal: true, width: 530, height: 450, useContentSize: true,
      resizable: false, minimizable: false, maximizable: false, show: false,
      title: 'Aidot Express — 관리자 로그인',
      webPreferences: { preload: path.join(__dirname, 'initial-password-preload.cjs'),
        contextIsolation: true, nodeIntegration: false, sandbox: true, partition: 'initial-password' },
    });
    lockLocalWindow(win);
    win.setMenuBarVisibility(false);
    const channels = [];
    function handle(action, callback) {
      const channel = `initial-password:${action}`;
      channels.push(channel);
      ipcMain.handle(channel, async event => {
        assertSender(event, win, page, { file: true });
        return callback();
      });
    }
    handle('read', () => ({ ...current }));
    handle('copy', () => {
      if (busy) return { ok: false, message: '비밀번호를 생성하고 있습니다.' };
      try { clipboard.writeText(current.password); return { ok: true }; }
      catch { return { ok: false, message: '복사하지 못했습니다. 비밀번호를 선택해 Ctrl+C로 복사해 주세요.' }; }
    });
    handle('generate', async () => {
      if (busy || uncertain) return { ok: false, message: '현재 비밀번호를 먼저 확인해 주세요.' };
      busy = true;
      try {
        current = await regenerate({ ...current });
        return { ok: true, credential: { ...current } };
      } catch (error) {
        if (error.candidate) { current = error.candidate; uncertain = true; }
        return { ok: false, ...(uncertain ? { credential: { ...current }, uncertain } : {}),
          message: error.status || uncertain ? error.message : '생성하지 못했습니다. 서버 연결을 확인한 후 다시 시도해 주세요.' };
      } finally { busy = false; }
    });
    handle('continue', () => {
      if (busy) return { ok: false };
      setImmediate(() => { if (!win.isDestroyed()) win.close(); });
      return { ok: true };
    });
    win.on('close', event => { if (busy) event.preventDefault(); });
    win.on('closed', () => {
      for (const channel of channels) ipcMain.removeHandler(channel);
      current = null;
      if (loadError) reject(loadError); else resolve();
    });
    win.once('ready-to-show', () => { parent?.show(); win.show(); win.focus(); });
    win.loadFile(page).catch(error => { loadError = error; win.destroy(); });
  });
}
module.exports = { showInitialPassword };
