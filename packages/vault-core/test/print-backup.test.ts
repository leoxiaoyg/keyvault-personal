import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { VaultData } from '../src/types'
import {
  buildPrintBackup,
  escapeHtml,
  paperBackupFileName,
  renderPrintBackupHtml
} from '../src/print-backup'

function sampleData(): VaultData {
  return {
    version: 1,
    entries: [
      {
        id: '2',
        site: 'Zeta Bank',
        url: 'https://bank.example',
        accounts: [
          {
            id: '2a',
            username: 'teller',
            password: 'pw-2',
            bindings: [{ id: 'b', label: 'Phone', value: '123' }],
            notes: 'night shift'
          }
        ],
        category: '',
        tags: ['finance'],
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: '1',
        site: 'Alpha Mail',
        url: 'https://mail.example',
        accounts: [
          {
            id: '1a',
            username: 'me',
            password: '<script>alert(1)</script>',
            bindings: [],
            notes: ''
          }
        ],
        category: '',
        tags: ['mail'],
        createdAt: 1,
        updatedAt: 1
      }
    ]
  }
}

describe('print backup', () => {
  it('sorts sites and counts accounts', () => {
    const doc = buildPrintBackup(sampleData(), new Date(2026, 10, 8, 17, 52))
    assert.equal(doc.generatedAt, '2026-11-08 17:52')
    assert.equal(doc.entryCount, 2)
    assert.equal(doc.accountCount, 2)
    assert.deepEqual(
      doc.entries.map((entry) => entry.site),
      ['Alpha Mail', 'Zeta Bank']
    )
  })

  it('treats a missing vault as empty', () => {
    const doc = buildPrintBackup(null)
    assert.equal(doc.entryCount, 0)
    assert.equal(doc.accountCount, 0)
    assert.match(renderPrintBackupHtml(doc), /没有可打印的条目/)
  })

  it('writes plaintext passwords into HTML and escapes markup', () => {
    const html = renderPrintBackupHtml(buildPrintBackup(sampleData(), new Date(2026, 10, 8, 9, 0)))
    assert.match(html, /pw-2/)
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
    assert.doesNotMatch(html, /<script>alert/)
    assert.match(html, /这是明文备份/)
    assert.match(html, /night shift/)
    assert.match(html, /Phone/)
  })

  it('escapes quotes and names the backup file by local date', () => {
    assert.equal(escapeHtml(`a&b<"'>`), 'a&amp;b&lt;&quot;&#39;&gt;')
    assert.equal(paperBackupFileName('pdf', new Date(2026, 10, 8, 23, 0)), 'KeyVault-paper-backup-2026-11-08.pdf')
    assert.equal(paperBackupFileName('png', new Date(2026, 0, 2)), 'KeyVault-paper-backup-2026-01-02.png')
  })
})
