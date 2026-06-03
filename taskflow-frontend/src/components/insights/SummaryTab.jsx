import { useQuery } from '@tanstack/react-query'
import { insightsService } from '../../services/insightsService'
import { Card, StatCard, Loading } from './shared'
import { formatHours } from './insightsLib'

function SummaryTab({ boardId, range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['insights-summary', boardId, range?.from, range?.to],
    queryFn: () => insightsService.getSummary(boardId, range),
  })

  if (isLoading || !data) return <Loading />

  const priorityRows = [
    { key: 'urgent', label: 'Срочно', dot: 'bg-danger' },
    { key: 'high', label: 'Высокий', dot: 'bg-amber' },
    { key: 'medium', label: 'Средний', dot: 'bg-coral' },
    { key: 'low', label: 'Низкий', dot: 'bg-teal' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Всего" value={data.total} hint="Все задачи" />
        <StatCard label="Активных" value={data.active} />
        <StatCard label="Просрочено" value={data.overdue} accent={data.overdue > 0} />
        <StatCard label="Срок ≤ 7 дн" value={data.dueWeek} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Создано за период" value={data.createdInRange} />
        <StatCard label="Закрыто за период" value={data.closedInRange} accent />
        <StatCard label="Часы за период" value={formatHours(data.totalHoursInRange)} />
        <StatCard label="Завершено всего" value={data.archived} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="По приоритету">
          <div className="space-y-3">
            {priorityRows.map((p) => {
              const count = data.byPriority[p.key] || 0
              const max = Math.max(...Object.values(data.byPriority), 1)
              const pct = (count / max) * 100
              return (
                <div key={p.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                      <span className="text-sm text-ink-body dark:text-ink-muted">{p.label}</span>
                    </div>
                    <span className="text-sm tabular-nums text-ink dark:text-canvas font-medium">{count}</span>
                  </div>
                  <div className="h-1 bg-canvas dark:bg-navy-elevated rounded-full overflow-hidden">
                    <div className={`h-full ${p.dot} transition-all duration-700 ease-smooth`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="По колонкам">
          <div className="space-y-3">
            {data.columns.map((col) => {
              const max = Math.max(...data.columns.map(c => c.active_count), 1)
              const pct = (col.active_count / max) * 100
              return (
                <div key={col.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-ink-body dark:text-ink-muted truncate pr-2">{col.title}</span>
                    <span className="text-sm tabular-nums text-ink dark:text-canvas font-medium">{col.active_count}</span>
                  </div>
                  <div className="h-1 bg-canvas dark:bg-navy-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-coral transition-all duration-700 ease-smooth" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SummaryTab
