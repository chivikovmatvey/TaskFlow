import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { teamService } from '../../services/teamService'
import { useModalLock } from '../../hooks/useModalLock'
import ColorPicker from '../common/ColorPicker'

const COLORS = ['#f97316', '#f4654b', '#3b82f6', '#10b981', '#a855f7', '#eab308', '#ec4899', '#64748b']

function CreateTeamModal({ onClose, onCreated }) {
  useModalLock(true)
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const m = useMutation({
    mutationFn: teamService.create,
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Команда создана')
      onCreated?.(team)
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Введите название')
    m.mutate({ name: name.trim(), description: description.trim() || null, color })
  }

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] animate-fadeIn" style={{ backgroundColor: 'var(--bg-overlay)' }} onClick={onClose}>
      <div className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg max-w-md w-full animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-hairline dark:border-navy-hairline">
          <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas">Новая команда</h2>
          <p className="text-xs text-ink-muted-soft mt-1">Участников добавишь после создания — по @username или email</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Название</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100}
                   className="w-full px-3.5 py-2.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
                   placeholder="Команда дизайнеров" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Описание (необязательно)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500}
                      className="w-full px-3.5 py-2.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm resize-none"
                      placeholder="UI/UX, иконки, иллюстрации" />
          </div>
          <ColorPicker value={color} onChange={setColor} presets={COLORS} />

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors">Отмена</button>
            <button type="submit" disabled={m.isPending} className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02] disabled:opacity-50">
              {m.isPending ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default CreateTeamModal
