import { useState, useEffect, useMemo } from 'react'
import { 
  Shield, 
  Lock, 
  Unlock, 
  Plus, 
  Search, 
  Copy, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit,
  Key,
  User,
  Hash,
  ChevronDown,
  ChevronUp,
  X,
  Wand2,
  Download,
  Upload,
  AlertTriangle
} from 'lucide-react'
import { VaultEntry, Account, Binding } from '@keyvault/core'
import { getVaultClient } from '@renderer/services/vault-client'
import { useIsMobileLayout } from '@renderer/hooks/usePlatform'

const vault = getVaultClient()

const getSafeHostname = (url: string) => {
  try {
    if (!url) return ''
    const targetUrl = url.startsWith('http') ? url : `https://${url}`
    return new URL(targetUrl).hostname
  } catch {
    return url
  }
}

function App() {
  const isMobile = useIsMobileLayout()
  const [isLocked, setIsLocked] = useState(true)
  const [hasVault, setHasVault] = useState(false)
  const [password, setPassword] = useState('')
  const [data, setData] = useState<{ version: number; entries: VaultEntry[] } | null>(null)
  const [search, setSearch] = useState('')
  const [editingEntry, setEditingEntry] = useState<Partial<VaultEntry> | null>(null)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkVault()
    vault.onLocked(() => {
      setIsLocked(true)
      setData(null)
    })
  }, [])

  const checkVault = async () => {
    const exists = await vault.vaultExists()
    setHasVault(exists)
    setLoading(false)
  }

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    const { success } = await vault.unlockVault(password)
    if (success) {
      setIsLocked(false)
      const vaultData = await vault.getData()
      setData(vaultData)
      setPassword('')
    } else {
      setError('Invalid master password')
    }
  }

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { success, error } = await vault.initVault(password)
    if (success) {
      setHasVault(true)
      setIsLocked(false)
      setData({ version: 1, entries: [] })
      setPassword('')
    } else {
      setError(error || 'Failed to initialize')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return
    
    // Ensure accounts exist
    const accounts = (editingEntry.accounts || []).map(acc => ({
      ...acc,
      id: acc.id || crypto.randomUUID(),
      bindings: (acc.bindings || []).map(b => ({ ...b, id: b.id || crypto.randomUUID() }))
    }))

    if (accounts.length === 0) {
      setError('Please add at least one account')
      return
    }

    // Format URL if present
    let formattedUrl = editingEntry.url || ''
    if (formattedUrl && !formattedUrl.startsWith('http')) {
      formattedUrl = `https://${formattedUrl}`
    }

    const entry = {
      ...editingEntry,
      id: editingEntry.id || crypto.randomUUID(),
      url: formattedUrl,
      accounts,
      createdAt: editingEntry.createdAt || Date.now(),
      updatedAt: Date.now()
    } as VaultEntry

    const { success } = await vault.saveEntry(entry)
    if (success) {
      const updatedData = await vault.getData()
      setData(updatedData)
      setEditingEntry(null)
      setError('')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    const { success } = await vault.deleteEntry(id)
    if (success) {
      const updatedData = await vault.getData()
      setData(updatedData)
    }
  }

  const togglePassword = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAccount = (id: string) => {
    setExpandedAccounts(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredEntries = useMemo(() => {
    if (!data) return []
    const s = search.toLowerCase()
    return data.entries.filter((e: VaultEntry) => {
      const siteMatch = e.site.toLowerCase().includes(s) || e.url.toLowerCase().includes(s)
      const accountMatch = e.accounts.some(acc => 
        acc.username.toLowerCase().includes(s) || 
        acc.notes.toLowerCase().includes(s) ||
        acc.bindings.some(b => b.label.toLowerCase().includes(s) || b.value.toLowerCase().includes(s))
      )
      return siteMatch || accountMatch
    })
  }, [data, search])

  // Helper to update editing entry
  const updateEditingEntry = (updates: Partial<VaultEntry>) => {
    setEditingEntry(prev => ({ ...prev, ...updates }))
  }

  const addAccount = () => {
    const newAccount: Account = {
      id: crypto.randomUUID(),
      username: '',
      password: '',
      bindings: [],
      notes: ''
    }
    const currentAccounts = editingEntry?.accounts || []
    updateEditingEntry({ accounts: [...currentAccounts, newAccount] })
  }

  const removeAccount = (index: number) => {
    const currentAccounts = [...(editingEntry?.accounts || [])]
    currentAccounts.splice(index, 1)
    updateEditingEntry({ accounts: currentAccounts })
  }

  const updateAccount = (index: number, updates: Partial<Account>) => {
    const currentAccounts = [...(editingEntry?.accounts || [])]
    currentAccounts[index] = { ...currentAccounts[index], ...updates }
    updateEditingEntry({ accounts: currentAccounts })
  }

  const addBinding = (accountIndex: number) => {
    const newBinding: Binding = {
      id: crypto.randomUUID(),
      label: '',
      value: ''
    }
    const currentAccounts = [...(editingEntry?.accounts || [])]
    currentAccounts[accountIndex].bindings = [...currentAccounts[accountIndex].bindings, newBinding]
    updateEditingEntry({ accounts: currentAccounts })
  }

  const removeBinding = (accountIndex: number, bindingIndex: number) => {
    const currentAccounts = [...(editingEntry?.accounts || [])]
    const bindings = [...currentAccounts[accountIndex].bindings]
    bindings.splice(bindingIndex, 1)
    currentAccounts[accountIndex].bindings = bindings
    updateEditingEntry({ accounts: currentAccounts })
  }

  const updateBinding = (accountIndex: number, bindingIndex: number, updates: Partial<Binding>) => {
    const currentAccounts = [...(editingEntry?.accounts || [])]
    const bindings = [...currentAccounts[accountIndex].bindings]
    bindings[bindingIndex] = { ...bindings[bindingIndex], ...updates }
    currentAccounts[accountIndex].bindings = bindings
    updateEditingEntry({ accounts: currentAccounts })
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+"
    const length = 20
    let res = ""
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return res
  }

  const handleExport = async () => {
    const { success, error } = await vault.exportVault()
    if (success) {
      alert('Vault backup exported successfully!')
    } else if (error) {
      alert('Export failed: ' + error)
    }
  }

  const handleImport = async () => {
    if (!confirm('This will merge entries from the backup file into your current vault. Continue?')) return
    
    const { success, addedCount, error } = await vault.importVault()
    if (success) {
      alert(`Import successful! Added ${addedCount} new entries.`)
      const updatedData = await vault.getData()
      setData(updatedData)
    } else if (error) {
      alert('Import failed: ' + error)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full">Loading...</div>

  if (!hasVault) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="w-full max-w-md p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-blue-500/10 rounded-full mb-4">
              <Shield className="w-12 h-12 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold">Initialize KeyVault</h1>
            <p className="text-slate-400 text-center mt-2">
              Create a strong master password to encrypt your local vault.
            </p>
          </div>
          <form onSubmit={handleInit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Master Password"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
              Create Vault
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="w-full max-w-md p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-blue-500/10 rounded-full mb-4">
              <Lock className="w-12 h-12 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold">Vault Locked</h1>
            <p className="text-slate-400 text-center mt-2">Enter your master password to unlock.</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Master Password"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-950">
      {/* Header */}
      <header className="shrink-0 bg-slate-900/50 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Shield className="text-blue-500 w-5 h-5 shrink-0" />
            <h1 className="text-lg md:text-xl font-bold truncate">KeyVault</h1>
          </div>
          <button
            onClick={() => vault.lockVault()}
            className="md:hidden p-2.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"
            title="Lock Vault"
            aria-label="Lock Vault"
          >
            <Unlock className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full md:w-auto min-w-0">
          <div className="relative w-full md:w-80 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="search"
              placeholder={isMobile ? '搜索站点、用户名…' : 'Search Site, User, or Bindings...'}
              className="w-full min-w-0 pl-10 pr-4 py-2.5 md:py-2 bg-slate-950 border border-slate-800 rounded-xl md:rounded-full text-base md:text-sm outline-none focus:border-blue-500 transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
            <button
              onClick={() => vault.lockVault()}
              className="hidden md:flex p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Lock Vault"
              aria-label="Lock Vault"
            >
              <Unlock className="w-5 h-5" />
            </button>
            <div className="hidden md:block h-6 w-px bg-slate-800" />
            <button
              onClick={handleExport}
              className="p-2.5 md:p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Export Backup (.kvault)"
              aria-label="Export Backup"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleImport}
              className="p-2.5 md:p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Import Backup (.kvault)"
              aria-label="Import Backup"
            >
              <Upload className="w-5 h-5" />
            </button>
            <div className="hidden md:block h-6 w-px bg-slate-800" />
            <button
              onClick={() => setEditingEntry({ site: '', url: '', accounts: [] })}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-blue-600 hover:bg-blue-500 rounded-xl md:rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{isMobile ? '添加' : 'Add Entry'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center px-4">
            <Key className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-sm">{search ? '没有匹配的条目' : '暂无密码条目'}</p>
            {!search && (
              <button
                onClick={() => setEditingEntry({ site: '', url: '', accounts: [] })}
                className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold text-white"
              >
                添加第一条
              </button>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filteredEntries.map((entry: VaultEntry) => (
            <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group overflow-hidden min-w-0">
              {/* Card Header */}
              <div className="p-4 md:p-5 border-b border-slate-800 flex items-start justify-between gap-2 bg-slate-900/50 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Key className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base md:text-lg leading-tight truncate">{entry.site}</h3>
                    {entry.url && (
                      <a
                        href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1 truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{getSafeHostname(entry.url)}</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditingEntry(entry)}
                    className="p-2.5 md:p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    aria-label="Edit entry"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2.5 md:p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Accounts List */}
              <div className="divide-y divide-slate-800">
                {entry.accounts.map((acc) => (
                  <div key={acc.id} className="p-3 md:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 text-slate-300 min-w-0 flex-1">
                        <User className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="font-semibold truncate">{acc.username}</span>
                      </div>
                      <button
                        onClick={() => toggleAccount(acc.id)}
                        className="p-2 text-slate-500 hover:text-white transition-colors shrink-0"
                        aria-label="Toggle account details"
                      >
                        {expandedAccounts[acc.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 md:p-2 bg-slate-950 rounded-lg border border-slate-800 min-w-0">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] uppercase text-slate-600 font-bold tracking-wider">Password</span>
                        <span className="font-mono text-sm break-all">
                          {showPassword[acc.id] ? acc.password : '••••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePassword(acc.id)}
                          className="p-2 md:p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword[acc.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => vault.copyToClipboard(acc.password)}
                          className="p-2 md:p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                          aria-label="Copy password"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bindings & Notes (Expanded) */}
                    {expandedAccounts[acc.id] && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-slate-800/50">
                        {acc.bindings.map(b => (
                          <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs p-2 bg-slate-900/50 rounded border border-slate-800/50 min-w-0">
                            <span className="text-slate-500 flex items-center gap-1 shrink-0">
                              <Hash className="w-3 h-3" /> {b.label}:
                            </span>
                            <div className="flex items-center gap-2 min-w-0 sm:justify-end">
                              <span className="text-slate-300 font-medium break-all">{b.value}</span>
                              <button onClick={() => vault.copyToClipboard(b.value)} className="p-2 text-slate-600 hover:text-slate-400 shrink-0" aria-label="Copy binding">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {acc.notes && (
                          <div className="text-xs text-slate-500 italic p-2 bg-slate-950/30 rounded border border-dashed border-slate-800">
                            {acc.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </main>

      {/* Edit Modal — full screen on mobile */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50">
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-slate-900 md:border border-slate-800 md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <h2 className="text-lg md:text-xl font-bold truncate pr-2">{editingEntry.id ? '编辑条目' : '新建条目'}</h2>
              <button onClick={() => { setEditingEntry(null); setError(''); }} className="p-2 text-slate-500 hover:text-white shrink-0" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-5 md:space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Site Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Name</label>
                  <input
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:border-blue-500 outline-none"
                    value={editingEntry.site || ''}
                    onChange={e => updateEditingEntry({ site: e.target.value })}
                    placeholder="e.g. Google"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL (Optional)</label>
                  <input
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:border-blue-500 outline-none"
                    value={editingEntry.url || ''}
                    onChange={e => updateEditingEntry({ url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Accounts Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Accounts</h3>
                  <button 
                    type="button" 
                    onClick={addAccount}
                    className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-400 font-bold"
                  >
                    <Plus className="w-3 h-3" /> Add Account
                  </button>
                </div>

                <div className="space-y-4">
                  {(editingEntry.accounts || []).map((acc, accIdx) => (
                    <div key={acc.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4 relative">
                      <button
                        type="button"
                        onClick={() => removeAccount(accIdx)}
                        className="absolute top-3 right-3 p-2 text-slate-600 hover:text-red-500"
                        aria-label="Remove account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-10 sm:pr-8">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Username</label>
                          <input
                            required
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm focus:border-blue-500 outline-none"
                            value={acc.username}
                            onChange={e => updateAccount(accIdx, { username: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Password</label>
                          <div className="relative">
                            <input
                              required
                              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm focus:border-blue-500 outline-none pr-8"
                              value={acc.password}
                              onChange={e => updateAccount(accIdx, { password: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => updateAccount(accIdx, { password: generatePassword() })}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors"
                              title="Generate strong password"
                            >
                              <Wand2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bindings Sub-section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Bindings (Phone, Email, etc.)</label>
                          <button 
                            type="button" 
                            onClick={() => addBinding(accIdx)}
                            className="text-[10px] text-blue-500 hover:underline"
                          >
                            + Add Binding
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {acc.bindings.map((b, bIdx) => (
                            <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <input
                                className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm focus:border-blue-500 outline-none"
                                value={b.label}
                                placeholder="Label (e.g. Phone)"
                                onChange={e => updateBinding(accIdx, bIdx, { label: e.target.value })}
                              />
                              <div className="flex gap-2 flex-1 min-w-0">
                              <input
                                className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm focus:border-blue-500 outline-none"
                                value={b.value}
                                placeholder="Value"
                                onChange={e => updateBinding(accIdx, bIdx, { value: e.target.value })}
                              />
                              <button type="button" onClick={() => removeBinding(accIdx, bIdx)} className="p-2 text-slate-600 hover:text-red-500 shrink-0">
                                <X className="w-3 h-3" />
                              </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Notes</label>
                        <textarea
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm focus:border-blue-500 outline-none h-16"
                          value={acc.notes}
                          onChange={e => updateAccount(accIdx, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                  {(editingEntry.accounts || []).length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 text-sm">
                      No accounts added yet. Click "Add Account" to start.
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="pt-2 flex gap-3 sticky bottom-0 bg-slate-900 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => { setEditingEntry(null); setError(''); }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors min-h-[48px]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors min-h-[48px]"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
