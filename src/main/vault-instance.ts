import path from 'path'
import { app } from 'electron'
import { SecurityManager, VaultManager, VaultStore } from '@keyvault/core'
import { NodeFileStorage } from './electron-storage'

const DB_FILE = path.join(app.getPath('userData'), 'vault.dat')

const storage = new NodeFileStorage()
const security = new SecurityManager()
const store = new VaultStore(storage, DB_FILE, security)
export const vaultManager = new VaultManager(store, security)

export { security }
