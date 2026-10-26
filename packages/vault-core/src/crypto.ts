import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const SALT_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

export const CRYPTO_CONSTANTS = {
  ALGORITHM,
  IV_LENGTH,
  SALT_LENGTH,
  KEY_LENGTH,
  ITERATIONS,
  DIGEST: 'sha512' as const
}

export class SecurityManager {
  private masterKey: Buffer | null = null

  public deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, CRYPTO_CONSTANTS.DIGEST)
  }

  public unlock(password: string, salt: Buffer): boolean {
    try {
      this.masterKey = this.deriveKey(password, salt)
      return true
    } catch {
      return false
    }
  }

  public lock(): void {
    if (this.masterKey) {
      this.masterKey.fill(0)
      this.masterKey = null
    }
  }

  public isLocked(): boolean {
    return this.masterKey === null
  }

  public encrypt(data: string): { encrypted: string; iv: string; authTag: string } {
    if (!this.masterKey) throw new Error('Vault is locked')

    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv)

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag().toString('hex')

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag
    }
  }

  public decrypt(encrypted: string, iv: string, authTag: string): string {
    if (!this.masterKey) throw new Error('Vault is locked')

    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, Buffer.from(iv, 'hex'))
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  public generateSalt(): Buffer {
    return crypto.randomBytes(SALT_LENGTH)
  }
}
