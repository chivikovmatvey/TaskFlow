import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { useModalLock } from '../../hooks/useModalLock'

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  type = 'danger'
}) {
  useModalLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const buttonClass = {
    danger: 'bg-danger hover:opacity-90 text-white',
    warning: 'bg-amber hover:opacity-90 text-ink',
    info: 'bg-coral hover:bg-coral-active text-white',
  }[type] || 'bg-coral hover:bg-coral-active text-white'

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[70] animate-fadeIn"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg max-w-md w-full animate-scaleIn"
        style={{ transformOrigin: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-2 leading-tight">
            {title}
          </h3>
          <p className="text-sm text-ink-body dark:text-ink-muted leading-relaxed">
            {message}
          </p>
        </div>

        <div className="px-6 pb-6 pt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 hover:scale-[1.02] ${buttonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmModal
