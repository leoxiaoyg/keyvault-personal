import { VaultData } from './types'

export type PaperBackupFormat = 'pdf' | 'png'

export interface PrintBackupAccount {
  username: string
  password: string
  notes: string
  bindings: Array<{ label: string; value: string }>
}

export interface PrintBackupEntry {
  site: string
  url: string
  tags: string[]
  accounts: PrintBackupAccount[]
}

export interface PrintBackupDocument {
  generatedAt: string
  entryCount: number
  accountCount: number
  entries: PrintBackupEntry[]
}

export interface PaperBackupResult {
  success: boolean
  cancelled?: boolean
  error?: string
  printed?: boolean
  filePath?: string
}

const WARNING =
  '警告：这是明文备份。纸张、PDF 和图片都没有加密。谁拿到就能看见全部密码。请锁好，不要上传网盘。'

export function formatPrintTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function paperBackupFileName(format: PaperBackupFormat, date = new Date()): string {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `KeyVault-paper-backup-${day}.${format}`
}

export function buildPrintBackup(data: VaultData | null, generatedAt = new Date()): PrintBackupDocument {
  const entries = (data?.entries ?? [])
    .slice()
    .sort((a, b) => a.site.localeCompare(b.site, 'zh-CN'))
    .map((entry) => ({
      site: entry.site || '',
      url: entry.url || '',
      tags: Array.isArray(entry.tags) ? entry.tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [],
      accounts: (entry.accounts || []).map((account) => ({
        username: account.username || '',
        password: account.password || '',
        notes: account.notes || '',
        bindings: (account.bindings || []).map((binding) => ({
          label: binding.label || '',
          value: binding.value || ''
        }))
      }))
    }))

  return {
    generatedAt: formatPrintTimestamp(generatedAt),
    entryCount: entries.length,
    accountCount: entries.reduce((sum, entry) => sum + entry.accounts.length, 0),
    entries
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderPrintBackupHtml(doc: PrintBackupDocument): string {
  const entriesHtml =
    doc.entries.length === 0
      ? '<p class="empty">没有可打印的条目。</p>'
      : doc.entries.map(renderEntry).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>KeyVault 纸质备份</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 28px 40px;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    color: #111;
    background: #fff;
    font-size: 13px;
    line-height: 1.45;
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #444; margin-bottom: 14px; }
  .warn {
    border: 2px solid #b45309;
    background: #fff7ed;
    color: #7c2d12;
    padding: 10px 12px;
    margin-bottom: 18px;
    font-weight: 600;
  }
  .entry {
    border: 1px solid #d4d4d4;
    padding: 12px 14px;
    margin: 0 0 14px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .site { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
  .url, .tags { color: #444; font-size: 12px; margin: 0 0 8px; word-break: break-all; }
  .account { border-top: 1px solid #ececec; padding-top: 8px; margin-top: 8px; }
  .account:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
  .row { display: flex; gap: 8px; margin: 2px 0; }
  .label { width: 64px; flex-shrink: 0; color: #666; }
  .pw { font-family: Consolas, "Courier New", monospace; word-break: break-all; }
  .notes { white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
  <h1>KeyVault 纸质备份</h1>
  <p class="meta">${escapeHtml(doc.generatedAt)} · ${doc.entryCount} 个站点 · ${doc.accountCount} 个账号</p>
  <p class="warn">${WARNING}</p>
  ${entriesHtml}
</body>
</html>`
}

function renderEntry(entry: PrintBackupEntry): string {
  const tags = entry.tags.length ? `<p class="tags">标签：${escapeHtml(entry.tags.join('、'))}</p>` : ''
  const url = entry.url ? `<p class="url">${escapeHtml(entry.url)}</p>` : ''
  const accounts = entry.accounts.map(renderAccount).join('') || '<p class="empty">没有账号</p>'

  return `<section class="entry">
    <p class="site">${escapeHtml(entry.site)}</p>
    ${url}
    ${tags}
    ${accounts}
  </section>`
}

function renderAccount(account: PrintBackupAccount): string {
  const bindings = account.bindings
    .filter((binding) => binding.label || binding.value)
    .map(
      (binding) =>
        `<div class="row"><span class="label">${escapeHtml(binding.label || '绑定')}</span><span>${escapeHtml(binding.value)}</span></div>`
    )
    .join('')
  const notes = account.notes
    ? `<div class="row"><span class="label">备注</span><span class="notes">${escapeHtml(account.notes)}</span></div>`
    : ''

  return `<div class="account">
    <div class="row"><span class="label">用户名</span><span>${escapeHtml(account.username)}</span></div>
    <div class="row"><span class="label">密码</span><span class="pw">${escapeHtml(account.password)}</span></div>
    ${bindings}
    ${notes}
  </div>`
}
