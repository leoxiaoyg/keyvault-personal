import { BrowserWindow, dialog } from 'electron'
import fs from 'fs'
import {
  PaperBackupFormat,
  PaperBackupResult,
  VaultData,
  buildPrintBackup,
  paperBackupFileName,
  renderPrintBackupHtml
} from '@keyvault/core'

const PNG_MAX_HEIGHT = 12000

function loadHtml(win: BrowserWindow, html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup()
      resolve()
    }
    const onFail = (_event: unknown, _code: number, desc: string) => {
      cleanup()
      reject(new Error(desc || 'Failed to load print document'))
    }
    const cleanup = () => {
      win.webContents.removeListener('did-finish-load', onOk)
      win.webContents.removeListener('did-fail-load', onFail)
    }
    win.webContents.once('did-finish-load', onOk)
    win.webContents.once('did-fail-load', onFail)
    void win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  })
}

function printDocument(win: BrowserWindow): Promise<boolean> {
  return new Promise((resolve) => {
    win.webContents.print({ printBackground: true, silent: false }, (success) => {
      resolve(Boolean(success))
    })
  })
}

async function capturePng(win: BrowserWindow): Promise<Buffer> {
  const height = await win.webContents.executeJavaScript(
    'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1)'
  )
  if (typeof height !== 'number' || height > PNG_MAX_HEIGHT) {
    throw new Error('条目太多，图片会截断。请改用 PDF')
  }
  win.setContentSize(830, Math.max(1170, Math.ceil(height) + 24))
  await new Promise((resolve) => setTimeout(resolve, 120))
  const image = await win.webContents.capturePage()
  return image.toPNG()
}

export async function exportPaperBackup(
  parent: BrowserWindow,
  data: VaultData | null,
  format: PaperBackupFormat
): Promise<PaperBackupResult> {
  if (!data) {
    return { success: false, error: 'Locked' }
  }
  if (format !== 'pdf' && format !== 'png') {
    return { success: false, error: 'Unsupported format' }
  }
  if (data.entries.length === 0) {
    return { success: false, error: '没有可打印的条目' }
  }

  const html = renderPrintBackupHtml(buildPrintBackup(data))
  const win = new BrowserWindow({
    parent,
    show: false,
    width: 830,
    height: 1170,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    await loadHtml(win, html)

    const buffer =
      format === 'pdf'
        ? await win.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate:
              '<div style="font-size:9px;width:100%;text-align:center;color:#555;padding:4px 0;">KeyVault 明文备份 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'
          })
        : await capturePng(win)

    const { canceled, filePath } = await dialog.showSaveDialog(parent, {
      title: format === 'pdf' ? '保存 PDF 备份' : '保存图片备份',
      defaultPath: paperBackupFileName(format),
      filters:
        format === 'pdf'
          ? [{ name: 'PDF', extensions: ['pdf'] }]
          : [{ name: 'PNG', extensions: ['png'] }]
    })

    if (canceled || !filePath) {
      return { success: false, cancelled: true }
    }

    fs.writeFileSync(filePath, buffer)
    const printed = await printDocument(win)
    return { success: true, printed, filePath }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    return { success: false, error: message }
  } finally {
    if (!win.isDestroyed()) {
      win.destroy()
    }
  }
}
