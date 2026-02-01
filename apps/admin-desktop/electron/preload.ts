import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getAppLogs: () => ipcRenderer.invoke('get-app-logs'),
  clearAppLogs: () => ipcRenderer.invoke('clear-app-logs'),
  openLogFile: () => ipcRenderer.invoke('open-log-file')
})