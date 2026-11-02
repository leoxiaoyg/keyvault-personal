import { app, BrowserWindow, ipcMain, clipboard, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { vaultManager } from './vault-instance'
import { VaultEntry } from '../common/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: path.join(__dirname, '../../resources/icon.png') } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', () => {
    lockVault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.keyvault.personal')
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('vault:exists', () => vaultManager.exists())

  ipcMain.handle('vault:init', (_, password: string) => {
    try {
      vaultManager.init(password)
      return { success: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Init failed'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('vault:unlock', (_, password: string) => {
    const success = vaultManager.unlock(password)
    return { success }
  })

  ipcMain.handle('vault:lock', () => {
    lockVault()
    return { success: true }
  })

  ipcMain.handle('vault:get-data', () => vaultManager.getData())

  ipcMain.handle('vault:save-entry', (_, entry: VaultEntry) => vaultManager.saveEntry(entry))

  ipcMain.handle('vault:delete-entry', (_, id: string) => vaultManager.deleteEntry(id))

  ipcMain.handle('vault:export', async () => {
    if (!mainWindow) return { success: false, error: 'No window' }
    if (vaultManager.isLocked()) return { success: false, error: 'Locked' }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Vault Backup',
      defaultPath: 'KeyVault_Backup.kvault',
      filters: [{ name: 'KeyVault Files', extensions: ['kvault'] }]
    })

    if (canceled || !filePath) {
      return { success: false, cancelled: true }
    }

    try {
      fs.copyFileSync(vaultManager.getFilePath(), filePath)
      return { success: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Export failed'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('vault:import', async () => {
    if (!mainWindow || vaultManager.isLocked()) {
      return { success: false, error: 'Locked or no window' }
    }

    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Vault Backup',
      filters: [{ name: 'KeyVault Files', extensions: ['kvault'] }],
      properties: ['openFile']
    })

    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    try {
      const buffer = fs.readFileSync(filePaths[0])
      return vaultManager.importMerge(buffer)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('clipboard:copy', (_, text: string) => {
    clipboard.writeText(text)
    setTimeout(() => {
      if (clipboard.readText() === text) {
        clipboard.clear()
      }
    }, 30000)
    return true
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function lockVault(): void {
  vaultManager.lock()
  if (mainWindow) {
    mainWindow.webContents.send('vault:locked-event')
  }
}

app.on('before-quit', () => {
  lockVault()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
