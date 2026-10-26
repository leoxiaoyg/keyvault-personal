export interface Binding {
  id: string
  label: string
  value: string
}

export interface Account {
  id: string
  username: string
  password: string
  bindings: Binding[]
  notes: string
}

export interface VaultEntry {
  id: string
  site: string
  url: string
  accounts: Account[]
  category: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface VaultData {
  version: number
  entries: VaultEntry[]
}

export interface AppState {
  isLocked: boolean
  hasVault: boolean
}
