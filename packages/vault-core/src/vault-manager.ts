import { SecurityManager } from './crypto'
import { VaultStore } from './vault-store'
import { VaultData, VaultEntry } from './types'
import { HEADER_LENGTH, parseVaultFile } from './vault-format'

export class VaultManager {
  constructor(
    private readonly store: VaultStore,
    private readonly security: SecurityManager
  ) {}

  public exists(): boolean {
    return this.store.exists()
  }

  public init(password: string): void {
    this.store.init(password)
  }

  public unlock(password: string): boolean {
    return this.store.load(password)
  }

  public lock(): void {
    this.security.lock()
    this.store.clearCache()
  }

  public isLocked(): boolean {
    return this.security.isLocked()
  }

  public getData(): VaultData | null {
    if (this.security.isLocked()) return null
    return this.store.getData()
  }

  public saveEntry(entry: VaultEntry): { success: boolean; error?: string } {
    if (this.security.isLocked()) return { success: false, error: 'Locked' }

    const data = this.store.getData()
    if (!data) return { success: false, error: 'No data' }

    const index = data.entries.findIndex((e) => e.id === entry.id)
    if (index > -1) {
      data.entries[index] = entry
    } else {
      data.entries.push(entry)
    }

    this.store.save()
    return { success: true }
  }

  public deleteEntry(id: string): { success: boolean; error?: string } {
    if (this.security.isLocked()) return { success: false, error: 'Locked' }

    const data = this.store.getData()
    if (!data) return { success: false, error: 'No data' }

    data.entries = data.entries.filter((e) => e.id !== id)
    this.store.save()
    return { success: true }
  }

  public importMerge(buffer: Buffer): { success: boolean; addedCount?: number; error?: string } {
    if (this.security.isLocked()) {
      return { success: false, error: 'Locked' }
    }

    try {
      if (buffer.length < HEADER_LENGTH) {
        throw new Error('Invalid backup file')
      }

      const { iv, authTag, encrypted } = parseVaultFile(buffer)
      const decrypted = this.security.decrypt(encrypted, iv, authTag)
      const importedData = JSON.parse(decrypted) as VaultData
      const currentData = this.store.getData()

      if (!currentData) {
        throw new Error('No current data to merge into')
      }

      let addedCount = 0
      importedData.entries.forEach((impEntry) => {
        const exists = currentData.entries.find(
          (e) =>
            e.site.toLowerCase() === impEntry.site.toLowerCase() &&
            e.url.toLowerCase() === impEntry.url.toLowerCase()
        )
        if (!exists) {
          currentData.entries.push(impEntry)
          addedCount++
        }
      })

      if (addedCount > 0) {
        this.store.save()
      }

      return { success: true, addedCount }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed'
      if (message.includes('Unsupported state') || message.includes('authenticate')) {
        return {
          success: false,
          error: 'Failed to decrypt backup. It might have a different master password.'
        }
      }
      return { success: false, error: message }
    }
  }

  public getFilePath(): string {
    return this.store.getFilePath()
  }
}
