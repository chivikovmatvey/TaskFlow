import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { teamService } from '../../services/teamService'
import { useAuth } from '../../context/AuthContext'
import UserSearchAutocomplete from '../common/UserSearchAutocomplete'
import { useModalLock } from '../../hooks/useModalLock'
import ColorPicker from '../common/ColorPicker'

const COLORS = ['#f97316', '#f4654b', '#3b82f6', '#10b981', '#a855f7', '#eab308', '#ec4899', '#64748b']

function TeamDetailModal({ teamId, onClose }) {
  useModalLock(true)
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamService.get(teamId),
  })

  const updateTeam = useMutation({
    mutationFn: (patch) => teamService.update(teamId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', teamId] })
      qc.invalidateQueries({ queryKey: ['teams'] })
      setEditing(false)
      toast.success('Сохранено')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const addMember = useMutation({
    mutationFn: ({ userId }) => teamService.addMember(teamId, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', teamId] })
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Участник добавлен')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const removeMember = useMutation({
    mutationFn: (memberId) => teamService.removeMember(teamId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', teamId] })
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const isOwner = team?.owner_id === me?.id

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] animate-fadeIn" style={{ backgroundColor: 'var(--bg-overlay)' }} onClick={onClose}>
      <div className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        {isLoading || !team ? (
          <div className="p-10 text-center text-sm text-ink-muted-soft animate-shimmer">Загрузка...</div>
        ) : (
          <>
            <div className="p-6 border-b border-hairline dark:border-navy-hairline">
              {editing ? (
                <EditForm
                  team={team}
                  onCancel={() => setEditing(false)}
                  onSave={(patch) => updateTeam.mutate(patch)}
                  saving={updateTeam.isPending}
                  onClose={onClose}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-md flex items-center justify-center text-white font-semibold text-lg flex-shrink-0" style={{ background: team.color }}>
                    {team.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas leading-tight">{team.name}</h2>
                    {team.description && <p className="text-sm text-ink-muted dark:text-ink-muted-soft mt-1">{team.description}</p>}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-ink-muted hover:text-coral p-1 -m-1 transition-colors"
                      title="Редактировать"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <button onClick={onClose} className="text-ink-muted-soft hover:text-ink dark:hover:text-canvas p-1 -m-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              )}
            </div>

            {isOwner && (
              <div className="p-6 border-b border-hairline dark:border-navy-hairline">
                <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Добавить участника</label>
                <UserSearchAutocomplete
                  excludeIds={[team.owner_id, ...team.members.map((m) => m.user_id)]}
                  onSelect={(u) => addMember.mutate({ userId: u.id })}
                  placeholder="@username или email..."
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                {team.members.length + 1} {pluralize(team.members.length + 1, 'участник', 'участника', 'участников')}
              </p>
              <MemberRow
                user={{
                  email: team.owner_email,
                  username: team.owner_username,
                  full_name: team.owner_name,
                }}
                isOwner
                isMe={team.owner_id === me?.id}
              />
              {team.members.map((m) => (
                <MemberRow
                  key={m.id}
                  user={m}
                  isMe={m.user_id === me?.id}
                  onRemove={isOwner || m.user_id === me?.id ? () => removeMember.mutate(m.id) : null}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

function MemberRow({ user, isOwner, isMe, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-2.5 hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors group">
      <div className="w-9 h-9 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
        {(user.full_name || user.username || user.email)?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink dark:text-canvas truncate">{user.full_name || user.username || user.email}</span>
          {isMe && <span className="text-[10px] uppercase tracking-caption-up font-semibold text-coral">вы</span>}
          {isOwner && <span className="text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted">владелец</span>}
        </div>
        <div className="text-xs text-ink-muted-soft truncate">
          {user.username ? `@${user.username}` : user.email}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={() => { if (confirm('Удалить участника?')) onRemove() }}
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-ink-muted-soft hover:text-danger transition-all p-1.5"
          title="Удалить"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  )
}

function EditForm({ team, onCancel, onSave, saving }) {
  const [name, setName] = useState(team.name || '')
  const [description, setDescription] = useState(team.description || '')
  const [color, setColor] = useState(team.color || COLORS[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Введите название')
    onSave({ name: name.trim(), description: description.trim(), color })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-md flex items-center justify-center text-white font-semibold text-lg flex-shrink-0" style={{ background: color }}>
          {(name || '?')[0]?.toUpperCase()}
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="flex-1 px-3 py-2 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas focus-ring text-sm"
          placeholder="Название команды"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Описание (необязательно)"
        className="w-full px-3 py-2 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm resize-none"
      />
      <ColorPicker value={color} onChange={setColor} presets={COLORS} label={null} />

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors">Отмена</button>
        <button type="submit" disabled={saving} className="px-3.5 py-1.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02] disabled:opacity-50">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}

function pluralize(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return many
  if (m10 === 1) return one
  if (m10 >= 2 && m10 <= 4) return few
  return many
}

export default TeamDetailModal
