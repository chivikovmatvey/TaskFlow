import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { timeTrackingService } from '../../services/timeTrackingService'
import { useAuth } from '../../context/AuthContext'

function TaskTimeTracking({ taskId, canEdit }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualEntry, setManualEntry] = useState({ duration: '', notes: '' })
  const [showChart, setShowChart] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-tracking', taskId],
    queryFn: () => timeTrackingService.getTaskTimeTracking(taskId),
    refetchInterval: 4000, 
  })

  const hasActive = useMemo(() => timeEntries.some((e) => !e.ended_at), [timeEntries])
  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasActive])

  const myActive = useMemo(
    () => timeEntries.find((e) => e.user_id === user?.id && !e.ended_at) || null,
    [timeEntries, user?.id]
  )

  const othersActive = useMemo(
    () => timeEntries.filter((e) => !e.ended_at && e.user_id !== user?.id),
    [timeEntries, user?.id]
  )

  const totalCompleted = useMemo(
    () => timeEntries.filter((e) => e.ended_at).reduce((s, e) => s + (e.duration || 0), 0),
    [timeEntries]
  )

  const myElapsed = myActive ? Math.max(0, Math.floor((now - new Date(myActive.started_at).getTime()) / 1000)) : 0

  const byUser = useMemo(() => {
    const map = new Map()
    for (const e of timeEntries) {
      const uid = e.user_id
      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          user: e.user,
          completed: 0,
          activeStartedAt: null,
        })
      }
      const row = map.get(uid)
      if (e.ended_at) row.completed += e.duration || 0
      else row.activeStartedAt = e.started_at
    }
    const arr = [...map.values()].map((r) => {
      const activeSeconds = r.activeStartedAt
        ? Math.max(0, Math.floor((now - new Date(r.activeStartedAt).getTime()) / 1000))
        : 0
      return { ...r, activeSeconds, total: r.completed + activeSeconds }
    })
    arr.sort((a, b) => b.total - a.total)
    return arr
  }, [timeEntries, now])

  const maxUserTotal = Math.max(1, ...byUser.map((u) => u.total))

  const startTimerMutation = useMutation({
    mutationFn: () => timeTrackingService.startTimer(taskId),
    onSuccess: () => {
      toast.success('Таймер запущен')
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const stopTimerMutation = useMutation({
    mutationFn: () => timeTrackingService.stopTimer(myActive.id),
    onSuccess: () => {
      toast.success('Таймер остановлен')
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const addManualEntryMutation = useMutation({
    mutationFn: () => {
      const timeParts = manualEntry.duration.split(':')
      if (timeParts.length !== 2) throw new Error('Формат: ЧЧ:ММ')
      const hours = parseInt(timeParts[0], 10)
      const minutes = parseInt(timeParts[1], 10)
      if (isNaN(hours) || isNaN(minutes)) throw new Error('Формат: ЧЧ:ММ')
      const seconds = hours * 3600 + minutes * 60
      return timeTrackingService.addDurationEntry(taskId, user.id, seconds, manualEntry.notes)
    },
    onSuccess: () => {
      toast.success('Запись добавлена')
      setShowManualForm(false)
      setManualEntry({ duration: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId) => timeTrackingService.deleteTimeEntry(entryId),
    onSuccess: () => {
      toast.success('Запись удалена')
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setShowChart((v) => !v)}
        className="w-full text-left bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline hover:border-coral/40 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3 transition-colors group"
        title="Нажми, чтобы увидеть статистику по участникам"
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-1 flex items-center gap-1.5">
            Учёт времени
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${showChart ? 'rotate-180' : ''} text-ink-muted-soft group-hover:text-coral`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </p>
          <p className="text-xs text-ink-muted dark:text-ink-muted-soft">
            Всего по завершённым сессиям
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-display text-3xl sm:text-4xl tracking-display-md text-ink dark:text-canvas tabular-nums leading-none">
            {formatDuration(totalCompleted + myElapsed)}
          </p>
          {myActive && (
            <p className="text-[11px] text-coral tabular-nums mt-1">+{formatDuration(myElapsed)} моя сессия</p>
          )}
        </div>
      </button>

      {showChart && byUser.length > 0 && (
        <UserChart byUser={byUser} max={maxUserTotal} />
      )}

      {myActive ? (
        <div className="bg-canvas-soft dark:bg-navy-soft border border-coral/40 rounded-lg p-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-coral animate-shimmer" />
              <span className="text-xs uppercase tracking-caption-up font-semibold text-coral">
                Идёт твоя сессия
              </span>
            </div>
            <button
              onClick={() => stopTimerMutation.mutate()}
              disabled={stopTimerMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium text-ink dark:text-canvas bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md hover:border-danger hover:text-danger transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 bg-danger rounded-sm" />
              Остановить
            </button>
          </div>
          <p className="font-display text-5xl tracking-display-md text-coral tabular-nums leading-none">
            {formatDuration(myElapsed)}
          </p>
        </div>
      ) : (
        <button
          onClick={() => startTimerMutation.mutate()}
          disabled={startTimerMutation.isPending}
          className="w-full px-4 py-3 bg-coral hover:bg-coral-active text-white font-medium rounded-lg shadow-coral transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-sm">Запустить таймер</span>
        </button>
      )}

      {othersActive.length > 0 && (
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-3 space-y-2 animate-fadeIn">
          <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
            Сейчас работают
          </p>
          {othersActive.map((e) => {
            const elapsed = Math.max(0, Math.floor((now - new Date(e.started_at).getTime()) / 1000))
            return (
              <div key={e.id} className="flex items-center gap-2.5">
                <UserAvatar user={e.user} size={24} />
                <span className="text-sm text-ink dark:text-canvas truncate flex-1">
                  {e.user?.full_name || e.user?.username || e.user?.email}
                </span>
                <span className="font-mono text-sm text-coral tabular-nums">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-coral animate-shimmer mr-1.5 align-middle" />
                  {formatDuration(elapsed)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {canEdit && (
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full text-sm text-ink-muted dark:text-ink-muted-soft hover:text-coral py-2 border border-dashed border-hairline dark:border-navy-hairline hover:border-coral/50 rounded-md transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${showManualForm ? 'rotate-45' : 'group-hover:rotate-90'}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {showManualForm ? 'Отменить' : 'Добавить время вручную'}
        </button>
      )}

      {showManualForm && (
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 animate-slideUp">
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Длительность
              </label>
              <input
                type="text"
                value={manualEntry.duration}
                onChange={(e) => setManualEntry({ ...manualEntry, duration: e.target.value })}
                placeholder="2:30"
                className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring font-mono text-base"
              />
              <p className="text-[11px] text-ink-muted-soft mt-1">Формат ЧЧ:ММ — например, 2:30</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Примечание
              </label>
              <input
                type="text"
                value={manualEntry.notes}
                onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
                placeholder="Описание работы"
                className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => addManualEntryMutation.mutate()}
                disabled={!manualEntry.duration || addManualEntryMutation.isPending}
                className="flex-1 px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addManualEntryMutation.isPending ? 'Добавление...' : 'Добавить запись'}
              </button>
              <button
                onClick={() => {
                  setShowManualForm(false)
                  setManualEntry({ duration: '', notes: '' })
                }}
                className="px-4 py-2 text-ink-body dark:text-ink-muted text-sm font-medium rounded-md hover:bg-canvas dark:hover:bg-navy-elevated transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {timeEntries.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3 mt-2">
            <h5 className="font-display text-lg tracking-display-md text-ink dark:text-canvas">История</h5>
            <span className="text-xs tabular-nums text-ink-muted dark:text-ink-muted-soft font-medium">
              {timeEntries.length}
            </span>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md p-3 hover:border-coral/40 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <UserAvatar user={entry.user} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-ink dark:text-canvas tabular-nums">
                        {formatDuration(
                          entry.duration ||
                            (entry.ended_at
                              ? 0
                              : Math.max(0, Math.floor((now - new Date(entry.started_at).getTime()) / 1000)))
                        )}
                      </span>
                      {!entry.ended_at && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-coral-soft text-coral">
                          <span className="w-1.5 h-1.5 bg-coral rounded-full animate-shimmer" />
                          Активна
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted dark:text-ink-muted-soft">
                      {formatDate(entry.started_at)}
                      {entry.ended_at && ` → ${formatDate(entry.ended_at)}`}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-ink-body dark:text-ink-muted mt-1.5 italic border-l-2 border-coral pl-2">
                        {entry.notes}
                      </p>
                    )}
                    <p className="text-[11px] text-ink-muted-soft mt-1 truncate">
                      {entry.user?.full_name || entry.user?.username || entry.user?.email || '—'}
                    </p>
                  </div>
                  {canEdit && entry.ended_at && (
                    <button
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      disabled={deleteEntryMutation.isPending}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 text-ink-muted-soft hover:text-danger rounded transition-all"
                      title="Удалить запись"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UserChart({ byUser, max }) {
  const [hover, setHover] = useState(null)
  const wrapRef = useRef(null)

  return (
    <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 animate-slideUp">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
          По участникам
        </span>
        <span className="text-[11px] text-ink-muted-soft">
          {byUser.length} {pluralize(byUser.length, 'участник', 'участника', 'участников')}
        </span>
      </div>

      <div ref={wrapRef} className="relative space-y-3 sm:space-y-2.5">
        {byUser.map((u) => {
          const pct = max > 0 ? (u.total / max) * 100 : 0
          const completedPct = max > 0 ? (u.completed / max) * 100 : 0
          const name = u.user?.full_name || u.user?.username || u.user?.email || '—'
          const initial = (name || '?')[0]?.toUpperCase()
          return (
            <div key={u.userId} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0 sm:w-28 sm:shrink-0">
                {u.user?.avatar_url ? (
                  <img
                    src={u.user.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {initial}
                  </div>
                )}
                <span className="text-xs text-ink dark:text-canvas truncate flex-1" title={name}>
                  {name}
                </span>
                <span className="sm:hidden text-xs font-mono tabular-nums text-ink dark:text-canvas flex-shrink-0">
                  {formatDuration(u.total)}
                </span>
              </div>
              <div className="relative h-5 w-full sm:flex-1 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-coral/30"
                  style={{ width: `${pct}%`, transition: 'width 0.4s ease' }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-coral"
                  style={{ width: `${completedPct}%`, transition: 'width 0.4s ease' }}
                  onMouseEnter={(e) => {
                    const rect = wrapRef.current.getBoundingClientRect()
                    setHover({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      text: `${name}: ${formatExact(u.completed)}${u.activeSeconds ? ` (+${formatExact(u.activeSeconds)} активно)` : ''}`,
                    })
                  }}
                  onMouseMove={(e) => {
                    const rect = wrapRef.current.getBoundingClientRect()
                    setHover((h) =>
                      h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : null
                    )
                  }}
                  onMouseLeave={() => setHover(null)}
                />
                {u.activeSeconds > 0 && pct > completedPct && (
                  <div
                    className="absolute inset-y-0 bg-coral/60 animate-shimmer"
                    style={{ left: `${completedPct}%`, width: `${pct - completedPct}%` }}
                  />
                )}
              </div>
              <span className="hidden sm:inline text-xs font-mono tabular-nums text-ink dark:text-canvas w-16 text-right">
                {formatDuration(u.total)}
              </span>
            </div>
          )
        })}

        {hover && (
          <div
            className="pointer-events-none absolute z-10 px-2 py-1 rounded-md bg-ink text-canvas text-[11px] font-mono whitespace-nowrap shadow-lift-lg"
            style={{ left: hover.x + 10, top: hover.y + 14 }}
          >
            {hover.text}
          </div>
        )}
      </div>

      <p className="text-[10px] text-ink-muted-soft mt-3">
        Жирная полоса — завершено · светлая часть — текущая активная сессия
      </p>
    </div>
  )
}

function UserAvatar({ user, size = 28 }) {
  if (!user) return null
  const initial = (user.full_name || user.username || user.email || '?')[0]?.toUpperCase() || '?'
  const style = { width: size, height: size, fontSize: size * 0.4 }
  return user.avatar_url ? (
    <img
      src={user.avatar_url}
      alt=""
      referrerPolicy="no-referrer"
      style={style}
      className="rounded-full object-cover shrink-0"
    />
  ) : (
    <div
      style={style}
      className="rounded-full bg-coral text-white font-semibold flex items-center justify-center shrink-0"
    >
      {initial}
    </div>
  )
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatExact(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = []
  if (h) parts.push(`${h} ч`)
  if (m) parts.push(`${m} мин`)
  if (sec || !parts.length) parts.push(`${sec} сек`)
  return parts.join(' ')
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function pluralize(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return many
  if (m10 === 1) return one
  if (m10 >= 2 && m10 <= 4) return few
  return many
}

export default TaskTimeTracking
