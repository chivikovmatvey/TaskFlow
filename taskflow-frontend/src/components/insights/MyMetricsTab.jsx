import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { insightsService } from '../../services/insightsService'
import { useAuth } from '../../context/AuthContext'
import { Card, Loading, Empty } from './shared'
import { formatHours, shortDay } from './insightsLib'

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e8e6df',
  borderRadius: 8,
  fontSize: 12,
  color: '#141413',
}

function MyMetricsTab({ boardId, range }) {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['insights-user', boardId, user?.id, range?.from, range?.to],
    queryFn: () => insightsService.getUser(boardId, user.id, range),
    enabled: !!user?.id,
  })

  const { data: usersData } = useQuery({
    queryKey: ['insights-users', boardId, range?.from, range?.to],
    queryFn: () => insightsService.getUsers(boardId, range),
  })

  const me = useMemo(() => usersData?.users.find(u => u.user_id === user?.id), [usersData, user])
  const rank = useMemo(() => {
    if (!usersData?.users) return null
    const idx = usersData.users.findIndex(u => u.user_id === user?.id)
    return idx >= 0 ? idx + 1 : null
  }, [usersData, user])

  const series = useMemo(() => {
    if (!data?.daily) return []
    const byDay = new Map()
    for (const d of data.daily) {
      const key = String(d.day).slice(0, 10)
      if (!byDay.has(key)) byDay.set(key, { day: key, created: 0, closed: 0, commented: 0, moved: 0 })
      const row = byDay.get(key)
      if (d.action === 'task.created') row.created += d.cnt
      else if (d.action === 'task.archived') row.closed += d.cnt
      else if (d.action === 'task.moved') row.moved += d.cnt
      else if (d.action === 'comment.added') row.commented += d.cnt
    }
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)).map(s => ({ ...s, day: shortDay(s.day) }))
  }, [data])

  const totalHours = (data?.dailyHours || []).reduce((s, d) => s + d.hours, 0)

  if (isLoading || !data) return <Loading />

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Создал" value={me?.created ?? 0} />
        <Stat label="Закрыл" value={me?.closed ?? 0} accent="text-teal" />
        <Stat label="Часов" value={formatHours(totalHours)} accent="text-coral" />
        <Stat
          label="Место в рейтинге"
          value={rank ? `#${rank}` : '—'}
          hint={usersData?.users ? `из ${usersData.users.length}` : ''}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Текущая нагрузка">
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
                      <span className={`text-[11px] tabular-nums ${overdue ? 'text-danger font-medium' : 'text-ink-muted-soft'}`}>
                        {new Date(t.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Активность по дням">
          {series.length === 0 ? <Empty>За период активности нет</Empty> : (
            <div className="w-full h-64">
              <ResponsiveContainer>
                <BarChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8a8779' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8a8779' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="created" name="Создал" stackId="a" fill="#cc785c" />
                  <Bar dataKey="closed" name="Закрыл" stackId="a" fill="#5db8a6" />
                  <Bar dataKey="commented" name="Комм." stackId="a" fill="#e8a55a" />
                  <Bar dataKey="moved" name="Перемещ." stackId="a" fill="#8a8779" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, accent, hint }) {
  return (
    <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-2">{label}</p>
      <p className={`font-display text-3xl sm:text-4xl tracking-display-md ${accent || 'text-ink dark:text-canvas'}`}>{value}</p>
      {hint && <p className="text-[11px] text-ink-muted-soft mt-1">{hint}</p>}
    </div>
  )
}

export default MyMetricsTab
