/**
 * error-preload.cjs — 오류 창과 메인 프로세스를 잇는다.
 *
 *  오류 창에도 Node 를 열어 주지 않는다. 필요한 통로만 낸다 —
 *  데이터 받기 · 복사 · 폴더 열기 · 종료.
 */
const { contextBridge, ipcRenderer, clipboard, shell } = require('electron');

contextBridge.exposeInMainWorld('errorDialog', {
  onData: (cb) => ipcRenderer.on('error:data', (_e, d) => cb(d)),
  copy: (text) => clipboard.writeText(text),
  openLog: () => ipcRenderer.send('error:open-log'),
  openEnv: () => ipcRenderer.send('error:open-env'),
  quit: () => ipcRenderer.send('error:quit'),
});
