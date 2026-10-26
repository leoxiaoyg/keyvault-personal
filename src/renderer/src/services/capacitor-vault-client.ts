import { registerPlugin } from '@capacitor/core'
import type { IVaultApi, VaultData, VaultEntry } from '@keyvault/core'

interface VaultPluginNative {
  exists(): Promise<{ exists: boolean }>
  init(options: { password: string }): Promise<{ success: boolean; error?: string }>
  unlock(options: { password: string }): Promise<{ success: boolean }>
  lock(): Promise<{ success: boolean }>
  getData(): Promise<{ data: VaultData | null }>
  saveEntry(options: { entry: VaultEntry }): Promise<{ success: boolean; error?: string }>
  deleteEntry(options: { id: string }): Promise<{ success: boolean; error?: string }>
  exportVault(): Promise<{ success: boolean; error?: string }>
  importVault(): Promise<{ success: boolean; addedCount?: number; error?: string }>
  copyToClipboard(options: { text: string }): Promise<{ success: boolean }>
  addListener(
    eventName: 'locked',
    listener: () => void
  ): Promise<{ remove: () => Promise<void> }>
}

const VaultNative = registerPlugin<VaultPluginNative>('Vault')

const lockedListeners = new Set<() => void>()
let listenerRegistered = false

function ensureLockedListener(): void {
  if (listenerRegistered) return
  listenerRegistered = true
  void VaultNative.addListener('locked', () => {
    lockedListeners.forEach((cb) => cb())
  })
}

export function createCapacitorVaultClient(): IVaultApi {
  ensureLockedListener()

  return {
    vaultExists: async () => {
      const { exists } = await VaultNative.exists()
      return exists
    },
    initVault: (password) => VaultNative.init({ password }),
    unlockVault: (password) => VaultNative.unlock({ password }),
    lockVault: () => VaultNative.lock(),
    getData: async () => {
      const { data } = await VaultNative.getData()
      return data
    },
    saveEntry: (entry) => VaultNative.saveEntry({ entry }),
    deleteEntry: (id) => VaultNative.deleteEntry({ id }),
    exportVault: () => VaultNative.exportVault(),
    importVault: () => VaultNative.importVault(),
    copyToClipboard: async (text) => {
      const { success } = await VaultNative.copyToClipboard({ text })
      return success
    },
    onLocked: (callback) => {
      lockedListeners.add(callback)
    }
  }
}
