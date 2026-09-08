/**
 * setup-preload.cjs — 처음 설정 화면과 메인 프로세스를 잇는다.
 *
 *  화면에는 Node 를 열어 주지 않는다(contextIsolation). DB 비밀번호를 다루는 창이라
 *  필요한 세 가지만 통로로 낸다.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setup', {
  testDb: (cfg) => ipcRenderer.invoke('setup:test-db', cfg),
  save: (cfg) => ipcRenderer.invoke('setup:save', cfg),
  skip: () => ipcRenderer.invoke('setup:skip'),
});
