import { Account, VaultData, VaultEntry } from './types'
import { normalizeTags } from './tag-utils'

type LegacyEntry = Partial<VaultEntry> & {
  id?: string
  username?: string
  password?: string
  notes?: string
  accounts?: Account[]
}

export function migrateVaultData(parsed: unknown): VaultData {
  if (!parsed || typeof parsed !== 'object') {
    return { version: 1, entries: [] }
  }

  const data = parsed as { version?: unknown; entries?: unknown }
  if (!Array.isArray(data.entries)) {
    return { version: 1, entries: [] }
  }

  return {
    version: typeof data.version === 'number' ? data.version : 1,
    entries: data.entries
      .filter((entry): entry is LegacyEntry => !!entry && typeof entry === 'object')
      .map(migrateEntry)
      .filter((entry): entry is VaultEntry => !!entry.id && !!entry.site)
  }
}

export function migrateEntry(entry: LegacyEntry): VaultEntry {
  const id = typeof entry.id === 'string' && entry.id ? entry.id : ''
  const accounts = Array.isArray(entry.accounts)
    ? entry.accounts
    : [
        {
          id: `${id || 'entry'}-default`,
          username: entry.username || '',
          password: entry.password || '',
          bindings: [],
          notes: entry.notes || ''
        }
      ]

  return {
    id,
    site: typeof entry.site === 'string' ? entry.site : '',
    url: typeof entry.url === 'string' ? entry.url : '',
    accounts,
    category: typeof entry.category === 'string' ? entry.category : '',
    tags: normalizeTags(entry.tags),
    createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
    updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.now()
  }
}
