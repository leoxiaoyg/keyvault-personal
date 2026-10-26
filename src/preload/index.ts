import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  vaultExists: () => ipcRenderer.invoke('vault:exists'),
  initVault: (password: string) => ipcRenderer.invoke('vault:init', password),
  unlockVault: (password: string) => ipcRenderer.invoke('vault:unlock', password),
  lockVault: () => ipcRenderer.invoke('vault:lock'),
  getData: () => ipcRenderer.invoke('vault:get-data'),
  saveEntry: (entry: any) => ipcRenderer.invoke('vault:save-entry', entry),
  deleteEntry: (id: string) => ipcRenderer.invoke('vault:delete-entry', id),
  exportVault: () => ipcRenderer.invoke('vault:export'),
  importVault: () => ipcRenderer.invoke('vault:import'),
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:copy', text),
  onLocked: (callback: () => void) => ipcRenderer.on('vault:locked-event', () => callback())
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
