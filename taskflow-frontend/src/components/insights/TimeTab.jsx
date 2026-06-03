import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { insightsService } from '../../services/insightsService'
import { Card, Loading, Empty, UserAvatar } from './shared'
import { formatHours, CHART_COLORS, PRIORITY_LABEL, PRIORITY_COLOR } from './insightsLib'

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e8e6df',
  borderRadius: 8,
  fontSize: 12,
  color: '#141413',
}

function fmtElapsed(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime()
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}ч ${m}м` : `${m}м ${String(s).padStart(2, '0')}с`
}

function ActiveSessions({ boardId }) {
  const { data } = useQuery({
    queryKey: ['insights-active', boardId],
    queryFn: () => insightsService.getActiveSessions(boardId),
    refetchInterval: 10000,
  })

  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const sessions = data?.sessions || []
  return (
    <Card title={`Сейчас работают (${sessions.length})`}>
      {sessions.length === 0 ? <Empty>Никто не запустил таймер</Empty> : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-2.5 bg-canvas dark:bg-navy-elevated border border-hairline-soft dark:border-navy-hairline rounded-md">
              <div className="relative">
                <UserAvatar user={{ avatar_url: s.avatar_url, full_name: s.full_name, username: s.username, email: s.email }} size={32} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal border-2 border-canvas dark:border-navy-elevated animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink dark:text-canvas truncate">{s.full_name || s.username || s.email}</div>
                <div className="text-[11px] text-ink-muted-soft truncate">{s.task_title}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-coral">{fmtElapsed(s.started_at)}</div>
                <div className="text-[10px] text-ink-muted-soft">с {new Date(s.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function TimeTab({ boardId, range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['insights-time-summary', boardId, range?.from, range?.to],
    queryFn: () => insightsService.getTimeSummary(boardId, range),
  })

  if (isLoading || !data) return <Loading />

  const totalHours = (data.byUser || []).reduce((s, u) => s + u.hours, 0)
  const prData = (data.byPriority || []).filter(p => p.hours > 0).map(p => ({
    name: PRIORITY_LABEL[p.priority] || p.priority || '—',
    value: p.hours,
    color: PRIORITY_COLOR[p.priority] || '#8a8779',
  }))

  return (
    <div className="space-y-5">
      <ActiveSessions boardId={boardId} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-2">Всего часов</p>
          <p className="font-display text-3xl sm:text-4xl tracking-display-md text-coral">{formatHours(totalHours)}</p>
        </div>
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-2">Участников</p>
          <p className="font-display text-3xl sm:text-4xl tracking-display-md text-ink dark:text-canvas">{data.byUser?.length || 0}</p>
        </div>
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-2">Задач с временем</p>
          <p className="font-display text-3xl sm:text-4xl tracking-display-md text-ink dark:text-canvas">{data.byTask?.length || 0}</p>
        </div>
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-2">Среднее/чел</p>
          <p className="font-display text-3xl sm:text-4xl tracking-display-md text-ink dark:text-canvas">
            {data.byUser?.length ? formatHours(totalHours / data.byUser.length) : '—'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Часы по пользователям">
          {data.byUser.length === 0 ? <Empty>Нет данных</Empty> : (
            <div className="space-y-2">
              {data.byUser.map((u, i) => {
                const max = Math.max(...data.byUser.map(x => x.hours), 0.1)
                return (
                  <div key={u.user_id} className="flex items-center gap-3">
                    <UserAvatar user={u} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm text-ink dark:text-canvas truncate pr-2">
                          {u.full_name || u.username || u.email}
                        </span>
                        <span className="text-xs tabular-nums text-ink dark:text-canvas font-medium">{formatHours(u.hours)}</span>
                      </div>
                      <div className="h-1.5 bg-canvas dark:bg-navy-elevated rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${(u.hours / max) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Часы по приоритетам">
          {prData.length === 0 ? <Empty>Нет данных</Empty> : (
            <div className="w-full h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={prData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {prData.map(p => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatHours(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Часы по колонкам">
          {data.byColumn.length === 0 ? <Empty>Нет данных</Empty> : (
            <div className="w-full h-64">
              <ResponsiveContainer>
                <BarChart data={data.byColumn} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8a8779' }} />
                  <YAxis type="category" dataKey="column" tick={{ fontSize: 11, fill: '#5d5b54' }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatHours(v)} />
                  <Bar dataKey="hours" fill="#cc785c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Часы по лейблам">
          {data.byLabel.length === 0 ? <Empty>Нет лейблов с временем</Empty> : (
            <div className="space-y-2">
              {data.byLabel.map(l => {
                const max = Math.max(...data.byLabel.map(x => x.hours), 0.1)
                return (
                  <div key={l.name}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="inline-flex items-center gap-1.5 text-sm text-ink dark:text-canvas">
                        <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                        {l.name}
                      </span>
                      <span className="text-xs tabular-nums font-medium">{formatHours(l.hours)}</span>
                    </div>
                    <div className="h-1.5 bg-canvas dark:bg-navy-elevated rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${(l.hours / max) * 100}%`, backgroundColor: l.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="Топ-20 задач по часам">
        {data.byTask.length === 0 ? <Empty>Нет данных</Empty> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-hairline dark:border-navy-hairline">
                  <th className="text-left py-2 pr-3 text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">Задача</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">Приоритет</th>
                  <th className="text-right py-2 px-2 text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">Часы</th>
                </tr>
              </thead>
              <tbody>
                {data.byTask.map(t => (
                  <tr key={t.task_id} className="border-b border-hairline-soft dark:border-navy-hairline">
                    <td className="py-2 pr-3 text-ink dark:text-canvas truncate max-w-[400px]">{t.title}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] || '#8a8779' }} />
                        {PRIORITY_LABEL[t.priority] || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums font-medium text-ink dark:text-canvas">{formatHours(t.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default TimeTab
