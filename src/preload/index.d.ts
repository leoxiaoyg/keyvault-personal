import { ElectronAPI } from '@electron-toolkit/preload'
import { IVaultApi } from '@keyvault/core'

declare global {
  interface Window {
    electron: ElectronAPI
    api: IVaultApi
  }
}

export {}
