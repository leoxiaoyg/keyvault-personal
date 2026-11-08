import { useMemo, useState } from 'react'
import { AlertTriangle, Printer, X } from 'lucide-react'
import {
  PaperBackupFormat,
  VaultData,
  buildPrintBackup,
  renderPrintBackupHtml
} from '@keyvault/core'

interface PrintBackupDialogProps {
  data: VaultData
  onClose: () => void
}

export function PrintBackupDialog({ data, onClose }: PrintBackupDialogProps) {
  const [format, setFormat] = useState<PaperBackupFormat>('pdf')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const documentHtml = useMemo(
    () => renderPrintBackupHtml(buildPrintBackup(data)),
    [data]
  )
  const empty = data.entries.length === 0

  const confirmExport = async () => {
    if (empty || busy) return
    const exportPaperBackup = window.api.exportPaperBackup
    if (!exportPaperBackup) {
      setError('当前环境不支持打印导出')
      return
    }

    setBusy(true)
    setError('')
    const result = await exportPaperBackup({ format })
    setBusy(false)

    if (result.cancelled) return
    if (!result.success) {
      setError(result.error || '导出失败')
      return
    }

    onClose()
    const printed = result.printed ? '已打开打印。' : '文件已保存，打印已取消。'
    alert(`明文备份已保存。\n${printed}`)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50">
      <div className="w-full h-full md:h-auto md:max-h-[92vh] md:max-w-4xl bg-slate-900 md:border border-slate-800 md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-800 flex justify-between items-center shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold truncate">打印预览</h2>
            <p className="text-xs text-slate-500 mt-1">确认前不会保存文件，也不会调用打印机。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-2 text-slate-500 hover:text-white shrink-0"
            aria-label="关闭预览"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 py-3 md:px-6 border-b border-slate-800 bg-amber-500/10 text-amber-200 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            这份备份是明文，包含当前保险库的全部 {data.entries.length} 条，不受搜索或标签筛选影响。纸、PDF、图片谁拿到都能看见密码。
          </p>
        </div>

        <div className="flex-1 min-h-0 bg-slate-950 p-3 md:p-4">
          <iframe
            title="纸质备份预览"
            sandbox=""
            srcDoc={documentHtml}
            className="w-full h-full min-h-[320px] bg-white rounded-lg border border-slate-800"
          />
        </div>

        <div className="px-4 py-3 md:px-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 shrink-0">导出为</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setFormat('pdf')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                format === 'pdf' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              PDF
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setFormat('png')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                format === 'png' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              图片
            </button>
          </div>
          {error && <p className="text-red-400 text-sm flex-1">{error}</p>}
          <div className="flex gap-3 sm:ml-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold min-h-[48px]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void confirmExport()}
              disabled={busy || empty}
              className="flex-1 sm:flex-none px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-semibold min-h-[48px] inline-flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {busy ? '正在导出…' : empty ? '没有条目' : '确认导出并打印'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
