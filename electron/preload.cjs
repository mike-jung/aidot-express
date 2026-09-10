/**
 * Electron preload — renderer 에서 쓸 수 있는 제한된 API 노출.
 *
 *  contextIsolation: true + sandbox: true 모드에서 실행되며,
 *  렌더러(admin-client) 는 오직 window.electronApp 으로만 main process 와 통신.
 *  admin-client 는 이 API 를 옵션으로 취급 — 웹 브라우저 모드에서는 undefined.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApp', {
  /** 앱 정보 조회 { name, version, port, serverReady, isDev } */
  getInfo: () => ipcRenderer.invoke('app:info'),
  restartApplication: () => ipcRenderer.invoke('app:restart'),

  /** 외부 URL 을 기본 브라우저로 열기 */
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),

  /** Electron 환경 플래그 (admin-client UI 가 참고 가능) */
  isElectron: true,
});
