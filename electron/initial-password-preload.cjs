'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('initialPassword', {
  read: () => ipcRenderer.invoke('initial-password:read'),
  copy: () => ipcRenderer.invoke('initial-password:copy'),
  generate: () => ipcRenderer.invoke('initial-password:generate'),
  continue: () => ipcRenderer.invoke('initial-password:continue'),
});
