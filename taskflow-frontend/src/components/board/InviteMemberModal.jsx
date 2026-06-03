import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { boardMemberService } from '../../services/boardMemberService'
import { teamService } from '../../services/teamService'
import UserSearchAutocomplete from '../common/UserSearchAutocomplete'
import { useModalLock } from '../../hooks/useModalLock'

function InviteMemberModal({ boardId, onClose }) {
  useModalLock(true)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('user')
  const [role, setRole] = useState('member')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [excluded, setExcluded] = useState(() => new Set())

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamService.list,
  })

  const { data: teamDetail } = useQuery({
    queryKey: ['team', selectedTeamId],
    queryFn: () => teamService.get(selectedTeamId),
    enabled: tab === 'team' && !!selectedTeamId,
  })

  useEffect(() => {
    setExcluded(new Set())
  }, [selectedTeamId])

  const teamCandidates = teamDetail
    ? [
        { id: teamDetail.owner_id, full_name: teamDetail.owner_name, username: teamDetail.owner_username, email: teamDetail.owner_email, isOwner: true },
        ...teamDetail.members.map((m) => ({
          id: m.user_id, full_name: m.full_name, username: m.username, email: m.email, avatar_url: m.avatar_url,
        })),
      ]
    : []
  const selectedCount = teamCandidates.length - excluded.size
  const toggleCandidate = (id) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (tab === 'team' && teams.length === 1 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id)
    }
  }, [tab, teams, selectedTeamId])

  const inviteUser = useMutation({
    mutationFn: ({ userId }) => boardMemberService.inviteMember(boardId, { userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
      toast.success('Участник добавлен')
      onClose()
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const inviteTeam = useMutation({
    mutationFn: ({ userIds }) => boardMemberService.inviteTeam(boardId, selectedTeamId, role, userIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
      const added = data.added?.length || 0
      const skipped = data.skipped?.length || 0
      if (added) toast.success(`Добавлено: ${added}${skipped ? ` (пропущено: ${skipped})` : ''}`)
      else toast(`Никого не добавлено${skipped ? ` — все уже на доске или это вы (${skipped})` : ''}`, { icon: 'ℹ️' })
      onClose()
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const submit = (e) => {
    e.preventDefault()
    if (tab === 'user') {
      if (!selectedUser) return toast.error('Выберите пользователя')
      inviteUser.mutate({ userId: selectedUser.id })
    } else {
      if (!selectedTeamId) return toast.error('Выберите команду')
      const userIds = teamCandidates.filter((c) => !excluded.has(c.id)).map((c) => c.id)
      if (!userIds.length) return toast.error('Выберите хотя бы одного участника')
      inviteTeam.mutate({ userIds })
    }
  }

  const roles = [
    { value: 'viewer', label: 'Наблюдатель', desc: 'Только просмотр' },
    { value: 'member', label: 'Участник', desc: 'Создание и редактирование задач' },
    { value: 'admin', label: 'Администратор', desc: 'Управление колонками и доской' },
  ]

  const isPending = inviteUser.isPending || inviteTeam.isPending

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[60] animate-fadeIn" style={{ backgroundColor: 'var(--bg-overlay)' }} onClick={onClose}>
      <div className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg max-w-md w-full max-h-[90vh] flex flex-col animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-hairline dark:border-navy-hairline flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas leading-tight">Пригласить</h2>
            <p className="text-xs text-ink-muted dark:text-ink-muted-soft mt-1">Найди по @username, email или добавь команду целиком</p>
          </div>
          <button onClick={onClose} className="text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors p-1 -m-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex border-b border-hairline dark:border-navy-hairline flex-shrink-0">
          <TabButton active={tab === 'user'} onClick={() => setTab('user')}>Пользователь</TabButton>
          <TabButton active={tab === 'team'} onClick={() => setTab('team')} count={teams.length}>Команда</TabButton>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
          {tab === 'user' ? (
            <div>
              <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Кого пригласить</label>
              {selectedUser ? (
                <div className="flex items-center gap-3 p-2.5 bg-coral-soft border border-coral/30 rounded-md">
                  <div className="w-9 h-9 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-sm">
                    {(selectedUser.full_name || selectedUser.username || selectedUser.email)?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink dark:text-canvas truncate">{selectedUser.full_name || selectedUser.username || selectedUser.email}</div>
                    <div className="text-xs text-ink-muted-soft truncate">{selectedUser.username ? `@${selectedUser.username}` : selectedUser.email}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedUser(null)} className="text-ink-muted-soft hover:text-danger p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <UserSearchAutocomplete autoFocus onSelect={setSelectedUser} />
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Какую команду</label>
              {teams.length === 0 ? (
                <div className="p-4 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-center">
                  <p className="text-sm text-ink-muted dark:text-ink-muted-soft mb-2">У тебя ещё нет команд</p>
                  <a href="/teams" className="text-xs text-coral hover:text-coral-active font-medium">Создать команду →</a>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {teams.map((t) => (
                      <label key={t.id} className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${
                        selectedTeamId === t.id
                          ? 'border-coral bg-coral-soft'
                          : 'border-hairline dark:border-navy-hairline bg-canvas-soft dark:bg-navy-soft hover:border-coral/40'
                      }`}>
                        <input type="radio" name="team" value={t.id} checked={selectedTeamId === t.id}
                               onChange={() => setSelectedTeamId(t.id)} className="sr-only" />
                        <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-semibold text-xs flex-shrink-0" style={{ background: t.color }}>
                          {t.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink dark:text-canvas truncate">{t.name}</div>
                          <div className="text-xs text-ink-muted-soft">
                            {t.member_count + 1} {plural(t.member_count + 1, 'участник', 'участника', 'участников')}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                          selectedTeamId === t.id ? 'border-coral bg-coral' : 'border-hairline dark:border-navy-hairline'
                        }`}>
                          {selectedTeamId === t.id && <div className="w-full h-full rounded-full bg-white scale-50" />}
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedTeamId && (
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
                          Кого добавить
                        </span>
                        <span className="text-[11px] text-ink-muted-soft">
                          выбрано {selectedCount} из {teamCandidates.length}
                        </span>
                      </div>
                      <div className="max-h-44 overflow-y-auto border border-hairline dark:border-navy-hairline rounded-md bg-canvas-soft dark:bg-navy-soft divide-y divide-hairline dark:divide-navy-hairline">
                        {!teamDetail && (
                          <div className="px-3 py-3 text-xs text-ink-muted-soft text-center">Загрузка...</div>
                        )}
                        {teamDetail && teamCandidates.map((c) => {
                          const checked = !excluded.has(c.id)
                          return (
                            <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-canvas dark:hover:bg-navy-elevated cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCandidate(c.id)}
                                className="w-4 h-4 accent-coral shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-ink dark:text-canvas truncate">
                                  {c.full_name || c.username || c.email}
                                  {c.isOwner && <span className="ml-1.5 text-[10px] uppercase tracking-caption-up font-semibold text-coral">владелец</span>}
                                </div>
                                <div className="text-[11px] text-ink-muted-soft truncate">
                                  {c.username ? `@${c.username} · ` : ''}{c.email}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Роль</label>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label key={r.value} className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                  role === r.value
                    ? 'border-coral bg-coral-soft'
                    : 'border-hairline dark:border-navy-hairline bg-canvas-soft dark:bg-navy-soft hover:border-coral/40'
                }`}>
                  <input type="radio" name="role" value={r.value} checked={role === r.value}
                         onChange={() => setRole(r.value)} className="sr-only" />
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors">Отмена</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02] disabled:opacity-50">
              {isPending ? 'Отправка...' : tab === 'team' ? 'Добавить команду' : 'Пригласить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
        active
          ? 'border-coral text-ink dark:text-canvas'
          : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-canvas'
      }`}
    >
      {children}
      {typeof count === 'number' && count > 0 && (
        <span className="ml-1.5 text-[10px] text-ink-muted-soft">({count})</span>
      )}
    </button>
  )
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return many
  if (m10 === 1) return one
  if (m10 >= 2 && m10 <= 4) return few
  return many
}

export default InviteMemberModal
