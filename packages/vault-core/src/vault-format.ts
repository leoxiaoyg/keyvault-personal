/** vault.dat layout: [Salt(16)][IV(12)][AuthTag(16)][EncryptedPayload...] */
export const SALT_LENGTH = 16
export const IV_LENGTH = 12
export const AUTH_TAG_LENGTH = 16
export const HEADER_LENGTH = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH

export interface VaultFileParts {
  salt: Buffer
  iv: string
  authTag: string
  encrypted: string
}

export function parseVaultFile(buffer: Buffer): VaultFileParts {
  if (buffer.length < HEADER_LENGTH) {
    throw new Error('Invalid vault file: too short')
  }

  return {
    salt: buffer.subarray(0, SALT_LENGTH),
    iv: buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH).toString('hex'),
    authTag: buffer
      .subarray(SALT_LENGTH + IV_LENGTH, HEADER_LENGTH)
      .toString('hex'),
    encrypted: buffer.subarray(HEADER_LENGTH).toString('hex')
  }
}

export function serializeVaultFile(
  salt: Buffer,
  iv: string,
  authTag: string,
  encrypted: string
): Buffer {
  return Buffer.concat([
    salt,
    Buffer.from(iv, 'hex'),
    Buffer.from(authTag, 'hex'),
    Buffer.from(encrypted, 'hex')
  ])
}
