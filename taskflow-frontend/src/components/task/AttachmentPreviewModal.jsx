import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { attachmentService } from '../../services/attachmentService'
import { useModalLock } from '../../hooks/useModalLock'

function AttachmentPreviewModal({ attachment, blobUrl, onClose }) {
  useModalLock(true)
  const [docxHtml, setDocxHtml] = useState(null)
  const [xlsx, setXlsx] = useState(null)
  const [text, setText] = useState(null)
  const [markdownHtml, setMarkdownHtml] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fileType = attachment.file_type || ''
  const fileName = attachment.file_name || ''
  const isImage = fileType.startsWith('image/')
  const isVideo = fileType.startsWith('video/')
  const isPdf = fileType.includes('pdf')
  const isMarkdown = fileType.includes('markdown') || /\.(md|markdown)$/i.test(fileName)
  const isText = !isMarkdown && (fileType.startsWith('text/') || fileType.includes('json') || fileType.includes('xml'))
  const isDocx = fileType.includes('wordprocessingml') || /\.docx$/i.test(fileName)
  const isXlsx = fileType.includes('spreadsheetml') || /\.xlsx?$/i.test(fileName)

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      try {
        if (isMarkdown) {
          const r = await fetch(blobUrl)
          const t = await r.text()
          const [markedMod, purifyMod] = await Promise.all([
            import('marked'),
            import('dompurify'),
          ])
          const marked = markedMod.marked || markedMod.default || markedMod
          const DOMPurify = purifyMod.default || purifyMod
          if (typeof marked.setOptions === 'function') {
            marked.setOptions({ gfm: true, breaks: true })
          }
          const rawHtml = await Promise.resolve(marked.parse(t, { gfm: true, breaks: true }))
          const safe = DOMPurify.sanitize(rawHtml)
          if (!cancelled) setMarkdownHtml(safe || '<p class="text-ink-muted">Пустой документ</p>')
        } else if (isText) {
          const r = await fetch(blobUrl)
          const t = await r.text()
          if (!cancelled) setText(t)
        } else if (isDocx) {
          const mammoth = (await import('mammoth')).default
          const r = await fetch(blobUrl)
          const ab = await r.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer: ab })
          if (!cancelled) setDocxHtml(result.value || '<p class="text-ink-muted">Пустой документ</p>')
        } else if (isXlsx) {
          const XLSX = await import('xlsx')
          const r = await fetch(blobUrl)
          const ab = await r.arrayBuffer()
          const wb = XLSX.read(ab, { type: 'array' })
          const sheets = wb.SheetNames.map((name) => ({
            name,
            html: XLSX.utils.sheet_to_html(wb.Sheets[name], { editable: false }),
          }))
          if (!cancelled) setXlsx({ sheets, current: 0 })
        }
      } catch (err) {
        console.error('preview error:', err)
        if (!cancelled) setError(err.message || 'Ошибка предпросмотра')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [blobUrl, attachment.id])

  const download = () => {
    attachmentService.downloadFile(attachment.file_path, attachment.file_name, attachment.id)
      .catch((err) => toast.error(err.message || 'Ошибка скачивания'))
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-hairline dark:border-navy-hairline flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon type={fileType} />
            <div className="min-w-0">
              <h3 className="font-display text-base tracking-display-sm text-ink dark:text-canvas truncate">
                {attachment.file_name}
              </h3>
              <p className="text-[11px] text-ink-muted-soft mt-0.5">
                {formatFileSize(attachment.file_size)}
                {attachment.file_type && ` · ${attachment.file_type}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={download}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-hairline dark:border-navy-hairline hover:border-coral hover:text-coral transition-colors"
              title="Скачать"
            >
              Скачать
            </button>
            <button
              onClick={onClose}
              className="p-2 text-ink-muted hover:text-ink dark:hover:text-canvas rounded-md transition-colors"
              title="Закрыть (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-canvas-soft dark:bg-navy-soft">
          {error && (
            <div className="p-8 text-center text-sm text-danger">{error}</div>
          )}
          {loading && !error && (isDocx || isXlsx || isText || isMarkdown) && (
            <div className="p-12 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 text-sm text-ink-muted-soft">
                <span className="w-2 h-2 rounded-full bg-coral animate-shimmer" />
                Загрузка предпросмотра...
              </span>
            </div>
          )}

          {!loading && !error && isImage && (
            <div className="p-4 flex items-center justify-center min-h-[400px]">
              <img
                src={blobUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-[80vh] object-contain rounded-md shadow-lift"
              />
            </div>
          )}

          {!loading && !error && isVideo && (
            <div className="p-4 flex items-center justify-center">
              <video src={blobUrl} controls className="max-w-full max-h-[80vh] rounded-md">
                Видео не поддерживается
              </video>
            </div>
          )}

          {!loading && !error && isPdf && (
            <iframe
              src={blobUrl}
              className="w-full min-h-[80vh] bg-white"
              title={attachment.file_name}
            />
          )}

          {!loading && !error && isText && text !== null && (
            <pre className="p-5 text-sm font-mono text-ink dark:text-canvas whitespace-pre-wrap break-words bg-canvas dark:bg-navy">
              {text}
            </pre>
          )}

          {!loading && !error && isMarkdown && markdownHtml !== null && (
            <div
              className="md-preview p-8 bg-canvas dark:bg-navy text-ink dark:text-canvas max-w-3xl mx-auto"
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          )}

          {!loading && !error && isDocx && docxHtml && (
            <div
              className="docx-preview prose dark:prose-invert prose-sm max-w-none p-8 bg-canvas dark:bg-navy text-ink dark:text-canvas"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          )}

          {!loading && !error && isXlsx && xlsx && (
            <div className="flex flex-col h-full">
              {xlsx.sheets.length > 1 && (
                <div className="flex border-b border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy overflow-x-auto">
                  {xlsx.sheets.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => setXlsx({ ...xlsx, current: i })}
                      className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                        xlsx.current === i
                          ? 'border-coral text-coral'
                          : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-canvas'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <div
                className="xlsx-preview flex-1 overflow-auto p-4 bg-canvas dark:bg-navy text-ink dark:text-canvas"
                dangerouslySetInnerHTML={{ __html: xlsx.sheets[xlsx.current].html }}
              />
            </div>
          )}

          {!loading && !error && !isImage && !isVideo && !isPdf && !isText && !isDocx && !isXlsx && !isMarkdown && (
            <div className="p-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline flex items-center justify-center mb-4">
                <FileIcon type={fileType} size={28} />
              </div>
              <p className="text-sm text-ink-muted dark:text-ink-muted-soft mb-1">Предпросмотр недоступен</p>
              <p className="text-xs text-ink-muted-soft mb-4">Скачай файл, чтобы открыть его в нативном приложении</p>
              <button
                onClick={download}
                className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02]"
              >
                Скачать файл
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function FileIcon({ type, size = 18 }) {
  const cls = 'shrink-0'
  const style = { width: size, height: size }
  if (type.startsWith('image/')) return <svg style={style} className={`${cls} text-coral`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  if (type.startsWith('video/')) return <svg style={style} className={`${cls} text-amber`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
  if (type.includes('pdf')) return <svg style={style} className={`${cls} text-danger`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
  if (type.includes('wordprocessingml')) return <svg style={style} className={`${cls}`} fill="none" stroke="#2563eb" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  if (type.includes('spreadsheetml')) return <svg style={style} className={`${cls}`} fill="none" stroke="#16a34a" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6h13M9 11V5a2 2 0 012-2h7l4 4v8a2 2 0 01-2 2h-8M9 11H4a1 1 0 00-1 1v8a1 1 0 001 1h5m0-10v10" /></svg>
  return <svg style={style} className={`${cls} text-ink-muted dark:text-ink-muted-soft`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default AttachmentPreviewModal
