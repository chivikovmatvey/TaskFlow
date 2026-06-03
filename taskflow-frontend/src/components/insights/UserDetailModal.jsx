import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { insightsService } from '../../services/insightsService'
import { UserAvatar, Loading, Empty } from './shared'
import { formatHours, shortDay } from './insightsLib'
import { useModalLock } from '../../hooks/useModalLock'

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e8e6df',
  borderRadius: 8,
  fontSize: 12,
  color: '#141413',
}

const DOW_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function ActivityHeatmap({ grid }) {
  if (!grid || !grid.length) return <Empty>Нет событий</Empty>
  const max = Math.max(...grid.map(g => g.cnt), 1)
  const byCell = new Map()
  for (const g of grid) byCell.set(`${g.dow}-${g.hr}`, g.cnt)

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="w-10"></th>
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="text-[9px] text-ink-muted-soft text-center font-normal w-5">
                {h % 3 === 0 ? h : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[2, 3, 4, 5, 6, 7, 1].map(dow => (
            <tr key={dow}>
              <td className="text-[10px] text-ink-muted-soft pr-1.5 align-middle">{DOW_NAMES[dow - 1]}</td>
              {Array.from({ length: 24 }, (_, h) => {
                const v = byCell.get(`${dow}-${h}`) || 0
                const op = v === 0 ? 0.05 : Math.min(0.15 + (v / max) * 0.85, 1)
                return (
                  <td
                    key={h}
                    title={v ? `${DOW_NAMES[dow - 1]} ${h}:00 — ${v}` : ''}
                    className="w-5 h-5 rounded-sm"
                    style={{ backgroundColor: `rgba(204, 120, 92, ${op})` }}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserDetailModal({ boardId, userId, range, onClose }) {
  useModalLock(true)

  const { data, isLoading } = useQuery({
    queryKey: ['insights-user', boardId, userId, range?.from, range?.to],
    queryFn: () => insightsService.getUser(boardId, userId, range),
  })

  const { data: heat } = useQuery({
    queryKey: ['insights-user-heatmap', boardId, userId, range?.from, range?.to],
    queryFn: () => insightsService.getHeatmap(boardId, range, userId),
  })

  const series = useMemo(() => {
    if (!data?.daily) return []
    const byDay = new Map()
    for (const d of data.daily) {
      const key = String(d.day).slice(0, 10)
      if (!byDay.has(key)) byDay.set(key, { day: key, created: 0, closed: 0, moved: 0, commented: 0 })
      const row = byDay.get(key)
      if (d.action === 'task.created') row.created += d.cnt
      else if (d.action === 'task.archived') row.closed += d.cnt
      else if (d.action === 'task.moved') row.moved += d.cnt
      else if (d.action === 'comment.added') row.commented += d.cnt
    }
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)).map(s => ({ ...s, day: shortDay(s.day) }))
  }, [data])

  const hoursSeries = useMemo(() => {
    if (!data?.dailyHours) return []
    return data.dailyHours.map(d => ({ day: shortDay(d.day), hours: d.hours }))
  }, [data])

  const totals = useMemo(() => {
    if (!data?.daily) return { created: 0, closed: 0, moved: 0, commented: 0 }
    const t = { created: 0, closed: 0, moved: 0, commented: 0 }
    for (const d of data.daily) {
      if (d.action === 'task.created') t.created += d.cnt
      else if (d.action === 'task.archived') t.closed += d.cnt
      else if (d.action === 'task.moved') t.moved += d.cnt
      else if (d.action === 'comment.added') t.commented += d.cnt
    }
    return t
  }, [data])

  const totalHours = (data?.dailyHours || []).reduce((s, d) => s + d.hours, 0)

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[70] animate-fadeIn"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg w-full max-w-3xl max-h-[92vh] flex flex-col animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-hairline dark:border-navy-hairline flex items-center gap-3 flex-shrink-0">
          {data?.profile && <UserAvatar user={data.profile} size={48} />}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl tracking-display-md text-ink dark:text-canvas truncate">
              {data?.profile?.full_name || data?.profile?.username || data?.profile?.email || '...'}
            </h2>
            <p className="text-xs text-ink-muted-soft truncate">
              {data?.profile?.username && `@${data.profile.username} · `}{data?.profile?.email}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-muted-soft hover:text-ink dark:hover:text-canvas p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin space-y-5">
          {isLoading || !data ? <Loading /> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MiniStat label="Создал" value={totals.created} />
                <MiniStat label="Закрыл" value={totals.closed} accent="text-teal" />
                <MiniStat label="Переместил" value={totals.moved} />
                <MiniStat label="Комм." value={totals.commented} />
                <MiniStat label="Часов" value={formatHours(totalHours)} accent="text-coral" />
              </div>

              <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4">
                <h3 className="text-sm font-medium text-ink dark:text-canvas mb-3">Активность по дням</h3>
                {series.length === 0 ? <Empty>За период активности нет</Empty> : (
                  <div className="w-full h-56">
                    <ResponsiveContainer>
                      <LineChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8a8779' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#8a8779' }} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="created" name="Создал" stroke="#cc785c" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="closed" name="Закрыл" stroke="#5db8a6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="commented" name="Комм." stroke="#e8a55a" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4">
                <h3 className="text-sm font-medium text-ink dark:text-canvas mb-3">Часы по дням</h3>
                {hoursSeries.length === 0 ? <Empty>Таймер не запускали</Empty> : (
                  <div className="w-full h-44">
                    <ResponsiveContainer>
                      <AreaChart data={hoursSeries} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#cc785c" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#cc785c" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8a8779' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#8a8779' }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="hours" name="Часы" stroke="#cc785c" fill="url(#hoursGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4">
                <h3 className="text-sm font-medium text-ink dark:text-canvas mb-3">Когда работает (день × час)</h3>
                <ActivityHeatmap grid={heat?.grid} />
              </div>

              <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4">
                <h3 className="text-sm font-medium text-ink dark:text-canvas mb-3">Сейчас в работе ({data.wip.length})</h3>
                {data.wip.length === 0 ? <Empty>Назначенных задач нет</Empty> : (
                  <div className="space-y-1">
                    {data.wip.map(t => {
                      const overdue = t.due_date && new Date(t.due_date) < new Date()
                      return (
                        <div key={t.id} className="flex items-center gap-3 py-1.5 text-sm">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            t.priority === 'urgent' ? 'bg-danger' :
                            t.priority === 'high' ? 'bg-amber' :
                            t.priority === 'medium' ? 'bg-coral' : 'bg-teal'
                          }`} />
                          <span className="flex-1 truncate text-ink dark:text-canvas">{t.title}</span>
                          {t.due_date && (
                            <span className={`text-[11px] tabular-nums ${overdue ? 'text-danger' : 'text-ink-muted-soft'}`}>
                              {new Date(t.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md p-3">
      <p className="text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-1">{label}</p>
      <p className={`font-display text-2xl tracking-display-md ${accent || 'text-ink dark:text-canvas'}`}>{value}</p>
    </div>
  )
}

export default UserDetailModal
