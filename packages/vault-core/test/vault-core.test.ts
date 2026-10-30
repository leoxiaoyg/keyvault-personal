import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SecurityManager } from '../src/crypto'
import { VaultEntry } from '../src/types'
import { HEADER_LENGTH, parseVaultFile } from '../src/vault-format'
import { VaultManager } from '../src/vault-manager'
import { VaultStore } from '../src/vault-store'
import { MemoryFileStorage } from './memory-storage'

const VAULT_PATH = 'vault.dat'
const PASSWORD = 'correct horse battery staple'

function makeEntry(id: string, site: string, url = `https://${site}.example`): VaultEntry {
  return {
    id,
    site,
    url,
    accounts: [
      {
        id: `${id}-acc`,
        username: 'user',
        password: 'secret',
        bindings: [],
        notes: ''
      }
    ],
    category: '',
    tags: [],
    createdAt: 1,
    updatedAt: 1
  }
}

function openVault(storage = new MemoryFileStorage(), password = PASSWORD) {
  const security = new SecurityManager()
  const store = new VaultStore(storage, VAULT_PATH, security)
  const manager = new VaultManager(store, security)
  return { storage, security, store, manager, password }
}

describe('SecurityManager', () => {
  it('round-trips plaintext with the derived key', () => {
    const security = new SecurityManager()
    const salt = security.generateSalt()
    security.unlock(PASSWORD, salt)

    const { encrypted, iv, authTag } = security.encrypt('hello vault')
    assert.equal(security.decrypt(encrypted, iv, authTag), 'hello vault')
  })

  it('rejects a wrong password against the same ciphertext', () => {
    const security = new SecurityManager()
    const salt = security.generateSalt()
    security.unlock(PASSWORD, salt)
    const sealed = security.encrypt('hello vault')

    const attacker = new SecurityManager()
    attacker.unlock('wrong password', salt)
    assert.throws(() => attacker.decrypt(sealed.encrypted, sealed.iv, sealed.authTag))
  })

  it('rejects a flipped ciphertext byte', () => {
    const security = new SecurityManager()
    security.unlock(PASSWORD, security.generateSalt())
    const sealed = security.encrypt('hello vault')
    const tampered = Buffer.from(sealed.encrypted, 'hex')
    tampered[0] ^= 0xff

    assert.throws(() =>
      security.decrypt(tampered.toString('hex'), sealed.iv, sealed.authTag)
    )
  })

  it('rejects a flipped auth tag byte', () => {
    const security = new SecurityManager()
    security.unlock(PASSWORD, security.generateSalt())
    const sealed = security.encrypt('hello vault')
    const tag = Buffer.from(sealed.authTag, 'hex')
    tag[0] ^= 0xff

    assert.throws(() => security.decrypt(sealed.encrypted, sealed.iv, tag.toString('hex')))
  })

  it('refuses encrypt and decrypt after lock', () => {
    const security = new SecurityManager()
    security.unlock(PASSWORD, security.generateSalt())
    const sealed = security.encrypt('hello vault')
    security.lock()

    assert.equal(security.isLocked(), true)
    assert.throws(() => security.encrypt('again'), /Vault is locked/)
    assert.throws(
      () => security.decrypt(sealed.encrypted, sealed.iv, sealed.authTag),
      /Vault is locked/
    )
  })
})

describe('VaultManager', () => {
  it('unlocks with the master password and reloads entries', () => {
    const { storage, manager } = openVault()
    manager.init(PASSWORD)
    manager.saveEntry(makeEntry('1', 'mail'))

    const reopened = openVault(storage)
    assert.equal(reopened.manager.unlock(PASSWORD), true)
    const data = reopened.manager.getData()
    assert.ok(data)
    assert.equal(data.entries[0].site, 'mail')
    assert.equal(data.entries[0].accounts[0].password, 'secret')
  })

  it('stays locked when the master password is wrong', (t) => {
    t.mock.method(console, 'error', () => {})
    const { storage, manager } = openVault()
    manager.init(PASSWORD)
    manager.saveEntry(makeEntry('1', 'mail'))
    manager.lock()

    const reopened = openVault(storage)
    assert.equal(reopened.manager.unlock('not the password'), false)
    assert.equal(reopened.manager.isLocked(), true)
    assert.equal(reopened.manager.getData(), null)
  })

  it('does not unlock a vault whose ciphertext was altered', (t) => {
    t.mock.method(console, 'error', () => {})
    const { storage, manager } = openVault()
    manager.init(PASSWORD)
    manager.saveEntry(makeEntry('1', 'mail'))
    manager.lock()

    const buffer = storage.read(VAULT_PATH)
    buffer[HEADER_LENGTH] ^= 0xff
    storage.writeAtomic(VAULT_PATH, buffer)

    const reopened = openVault(storage)
    assert.equal(reopened.manager.unlock(PASSWORD), false)
    assert.equal(reopened.manager.isLocked(), true)
  })

  it('does not unlock a vault whose auth tag was altered', (t) => {
    t.mock.method(console, 'error', () => {})
    const { storage, manager } = openVault()
    manager.init(PASSWORD)
    manager.saveEntry(makeEntry('1', 'mail'))
    manager.lock()

    const parts = parseVaultFile(storage.read(VAULT_PATH))
    const tag = Buffer.from(parts.authTag, 'hex')
    tag[0] ^= 0xff
    const mutated = Buffer.concat([
      parts.salt,
      Buffer.from(parts.iv, 'hex'),
      tag,
      Buffer.from(parts.encrypted, 'hex')
    ])
    storage.writeAtomic(VAULT_PATH, mutated)

    const reopened = openVault(storage)
    assert.equal(reopened.manager.unlock(PASSWORD), false)
  })

  it('drops in-memory data on lock and rejects writes', () => {
    const { manager } = openVault()
    manager.init(PASSWORD)
    manager.saveEntry(makeEntry('1', 'mail'))
    manager.lock()

    assert.equal(manager.isLocked(), true)
    assert.equal(manager.getData(), null)
    const save = manager.saveEntry(makeEntry('2', 'work'))
    assert.equal(save.success, false)
    assert.equal(save.error, 'Locked')
    const merge = manager.importMerge(Buffer.alloc(HEADER_LENGTH))
    assert.equal(merge.success, false)
    assert.equal(merge.error, 'Locked')
  })

  it('merges a backup encrypted with the same key', () => {
    const source = openVault()
    source.manager.init(PASSWORD)
    source.manager.saveEntry(makeEntry('a', 'mail'))

    const backupStorage = new MemoryFileStorage()
    backupStorage.writeAtomic(VAULT_PATH, source.storage.read(VAULT_PATH))
    const backup = openVault(backupStorage)
    assert.equal(backup.manager.unlock(PASSWORD), true)
    backup.manager.saveEntry(makeEntry('c', 'notes'))

    const result = source.manager.importMerge(backupStorage.read(VAULT_PATH))
    assert.equal(result.success, true)
    assert.equal(result.addedCount, 1)
    const sites = source.manager.getData()?.entries.map((entry) => entry.site).sort()
    assert.deepEqual(sites, ['mail', 'notes'])
  })

  it('does not merge a backup from a different salt', () => {
    const current = openVault()
    current.manager.init(PASSWORD)
    current.manager.saveEntry(makeEntry('a', 'mail'))

    const other = openVault()
    other.manager.init(PASSWORD)
    other.manager.saveEntry(makeEntry('b', 'bank'))

    const result = current.manager.importMerge(other.storage.read(VAULT_PATH))
    assert.equal(result.success, false)
    assert.match(result.error ?? '', /different master password|authenticate|Unsupported state/i)
    assert.equal(current.manager.getData()?.entries.length, 1)
  })

  it('does not merge a backup from a different master password', () => {
    const current = openVault()
    current.manager.init(PASSWORD)
    current.manager.saveEntry(makeEntry('a', 'mail'))

    const other = openVault()
    other.manager.init('a different password')
    other.manager.saveEntry(makeEntry('b', 'bank'))

    const result = current.manager.importMerge(other.storage.read(VAULT_PATH))
    assert.equal(result.success, false)
    assert.equal(current.manager.getData()?.entries.length, 1)
  })
})
