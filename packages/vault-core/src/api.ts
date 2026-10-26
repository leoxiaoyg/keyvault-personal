import { VaultData, VaultEntry } from './types'

export interface OpResult {
  success: boolean
  error?: string
}

export interface ExportResult extends OpResult {}

export interface ImportResult extends OpResult {
  addedCount?: number
}

/**
 * Platform-agnostic vault API consumed by the React UI.
 * Desktop (Electron preload) and Mobile (Capacitor plugin) each provide an implementation.
 */
export interface IVaultApi {
  vaultExists(): Promise<boolean>
  initVault(password: string): Promise<OpResult>
  unlockVault(password: string): Promise<OpResult>
  lockVault(): Promise<OpResult>
  getData(): Promise<VaultData | null>
  saveEntry(entry: VaultEntry): Promise<OpResult>
  deleteEntry(id: string): Promise<OpResult>
  exportVault(): Promise<ExportResult>
  importVault(): Promise<ImportResult>
  copyToClipboard(text: string): Promise<boolean>
  onLocked(callback: () => void): void
}
