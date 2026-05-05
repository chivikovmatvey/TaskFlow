import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { boardMemberService } from '../../services/boardMemberService'

function InviteMemberModal({ boardId, onClose }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const inviteMutation = useMutation({
    mutationFn: ({ boardId, email, role }) =>
      boardMemberService.inviteMember(boardId, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
      toast.success('Участник добавлен')
      onClose()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка приглашения')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim()) return toast.error('Введите email')
    if (!email.includes('@')) return toast.error('Введите корректный email')
    inviteMutation.mutate({ boardId, email: email.trim(), role })
  }

  const roles = [
    { value: 'viewer', label: 'Наблюдатель', desc: 'Только просмотр' },
    { value: 'member', label: 'Участник', desc: 'Создание и редактирование задач' },
    { value: 'admin', label: 'Администратор', desc: 'Управление колонками и доской' },
  ]

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[60] animate-fadeIn"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg max-w-md w-full animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-hairline dark:border-navy-hairline flex justify-between items-start">
          <div>
            <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas leading-tight">
              Пригласить участника
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-muted-soft mt-1">
              Пользователь должен быть зарегистрирован
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors p-1 -m-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@example.com"
              className="w-full px-3.5 py-2.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
              Роль
            </label>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all duration-200 ${
                    role === r.value
                      ? 'border-coral bg-coral-soft'
                      : 'border-hairline dark:border-navy-hairline bg-canvas-soft dark:bg-navy-soft hover:border-coral/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="sr-only"
                  />
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                    role === r.value ? 'border-coral bg-coral' : 'border-hairline dark:border-navy-hairline'
                  }`}>
                    {role === r.value && <div className="w-full h-full rounded-full bg-white scale-50" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink dark:text-canvas">{r.label}</div>
                    <div className="text-xs text-ink-muted dark:text-ink-muted-soft mt-0.5">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
            >
              {inviteMutation.isPending ? 'Отправка...' : 'Пригласить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default InviteMemberModal
