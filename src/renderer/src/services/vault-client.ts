import { Capacitor } from '@capacitor/core'
import { IVaultApi } from '@keyvault/core'
import { createCapacitorVaultClient } from './capacitor-vault-client'

function createElectronVaultClient(): IVaultApi {
  return {
    vaultExists: () => window.api.vaultExists(),
    initVault: (password) => window.api.initVault(password),
    unlockVault: (password) => window.api.unlockVault(password),
    lockVault: () => window.api.lockVault(),
    getData: () => window.api.getData(),
    saveEntry: (entry) => window.api.saveEntry(entry),
    deleteEntry: (id) => window.api.deleteEntry(id),
    exportVault: () => window.api.exportVault(),
    importVault: () => window.api.importVault(),
    copyToClipboard: (text) => window.api.copyToClipboard(text),
    onLocked: (callback) => window.api.onLocked(callback)
  }
}

let client: IVaultApi | null = null

export function getVaultClient(): IVaultApi {
  if (!client) {
    if (typeof window !== 'undefined' && window.api) {
      client = createElectronVaultClient()
    } else if (Capacitor.isNativePlatform()) {
      client = createCapacitorVaultClient()
    } else {
      throw new Error('Vault client not available in this environment')
    }
  }
  return client
}

/** Override auto-detected client (tests or custom bootstrap). */
export function setVaultClient(api: IVaultApi): void {
  client = api
}
