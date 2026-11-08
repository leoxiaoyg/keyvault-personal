import { ElectronAPI } from '@electron-toolkit/preload'
import { IVaultApi, PaperBackupFormat, PaperBackupResult } from '@keyvault/core'

type DesktopVaultApi = IVaultApi & {
  exportPaperBackup?: (options: { format: PaperBackupFormat }) => Promise<PaperBackupResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DesktopVaultApi
  }
}

export {}
