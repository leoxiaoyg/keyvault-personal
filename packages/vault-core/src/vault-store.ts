import { SecurityManager } from './crypto'
import { IFileStorage } from './file-storage'
import { VaultData } from './types'
import { parseVaultFile, serializeVaultFile } from './vault-format'

function migrateEntries(parsed: VaultData): VaultData {
  if (!parsed || !Array.isArray(parsed.entries)) {
    return { version: 1, entries: [] }
  }

  parsed.entries = parsed.entries.map((entry: VaultData['entries'][number] & { username?: string; password?: string; notes?: string; accounts?: VaultData['entries'][number]['accounts'] }) => {
    if (!entry.accounts) {
      return {
        ...entry,
        accounts: [
          {
            id: entry.id + '-default',
            username: entry.username || '',
            password: entry.password || '',
            bindings: [],
            notes: entry.notes || ''
          }
        ]
      }
    }
    return entry
  })

  return parsed
}

export class VaultStore {
  private cachedData: VaultData | null = null

  constructor(
    private readonly storage: IFileStorage,
    private readonly filePath: string,
    private readonly security: SecurityManager
  ) {}

  public exists(): boolean {
    return this.storage.exists(this.filePath)
  }

  public init(password: string): void {
    const salt = this.security.generateSalt()
    this.security.unlock(password, salt)
    this.cachedData = { version: 1, entries: [] }
    this.save(salt)
  }

  public load(password: string): boolean {
    if (!this.exists()) return false

    try {
      const buffer = this.storage.read(this.filePath)
      const { salt, iv, authTag, encrypted } = parseVaultFile(buffer)

      this.security.unlock(password, salt)
      const decrypted = this.security.decrypt(encrypted, iv, authTag)
      this.cachedData = migrateEntries(JSON.parse(decrypted))
      return true
    } catch (e) {
      console.error('Failed to load vault:', e)
      this.security.lock()
      return false
    }
  }

  public save(saltOverride?: Buffer): void {
    if (!this.cachedData || this.security.isLocked()) {
      throw new Error('Cannot save locked or empty vault')
    }

    let salt: Buffer
    if (saltOverride) {
      salt = saltOverride
    } else {
      const existingBuffer = this.storage.read(this.filePath)
      salt = parseVaultFile(existingBuffer).salt
    }

    const { encrypted, iv, authTag } = this.security.encrypt(JSON.stringify(this.cachedData))
    const finalBuffer = serializeVaultFile(salt, iv, authTag, encrypted)

    this.storage.writeAtomic(this.filePath, finalBuffer)
  }

  public getData(): VaultData | null {
    return this.cachedData
  }

  public setData(data: VaultData): void {
    this.cachedData = data
  }

  public clearCache(): void {
    this.cachedData = null
  }

  public getFilePath(): string {
    return this.filePath
  }
}
