import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { insightsService } from '../../services/insightsService'
import { Card, Loading } from './shared'
import { formatHours } from './insightsLib'

function deltaPct(curr, prev) {
  if (prev === 0) return curr === 0 ? 0 : 100
  return Math.round(((curr - prev) / prev) * 100)
}

function DeltaRow({ label, p1, p2, fmt = (v) => v, invertColor = false }) {
  const delta = deltaPct(p1, p2)
  const up = delta > 0
  const good = invertColor ? !up : up
  const color = delta === 0 ? 'text-ink-muted-soft' : good ? 'text-teal' : 'text-danger'
  return (
    <div className="flex items-center justify-between py-3 border-b border-hairline-soft dark:border-navy-hairline last:border-0">
      <span className="text-sm text-ink-body dark:text-ink-muted">{label}</span>
      <div className="flex items-baseline gap-3">
        <span className="text-xs text-ink-muted-soft tabular-nums">{fmt(p2)}</span>
        <svg className="w-3 h-3 text-ink-muted-soft" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium tabular-nums text-ink dark:text-canvas min-w-[60px] text-right">{fmt(p1)}</span>
        <span className={`text-xs font-medium tabular-nums min-w-[55px] text-right ${color}`}>
          {delta > 0 && '+'}{delta}%
        </span>
      </div>
    </div>
  )
}

function CompareTab({ boardId, range }) {
  const periods = useMemo(() => {
    if (!range?.from || !range?.to) return null
    const len = range.to - range.from
    const p1 = { from: range.from, to: range.to }
    const p2 = { from: new Date(range.from.getTime() - len), to: new Date(range.from.getTime() - 1) }
    return { p1, p2 }
  }, [range])

  const { data, isLoading } = useQuery({
    queryKey: ['insights-compare', boardId, range?.from, range?.to],
    queryFn: () => insightsService.compare(boardId, periods.p1, periods.p2),
    enabled: !!periods,
  })

  if (isLoading || !data) return <Loading />

  const { period1, period2 } = data
  const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <Card title="Сравнение с предыдущим периодом">
      <div className="grid grid-cols-2 gap-3 mb-5 text-center">
        <div className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md p-3">
          <p className="text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">Предыдущий</p>
          <p className="text-sm font-medium text-ink-body dark:text-ink-muted mt-1">
            {fmtDate(period2.from)} — {fmtDate(period2.to)}
          </p>
        </div>
        <div className="bg-coral-soft border border-coral/30 rounded-md p-3">
          <p className="text-[10px] uppercase tracking-caption-up font-semibold text-coral">Текущий</p>
          <p className="text-sm font-medium text-ink mt-1">
            {fmtDate(period1.from)} — {fmtDate(period1.to)}
          </p>
        </div>
      </div>

      <div>
        <DeltaRow label="Создано задач" p1={period1.created} p2={period2.created} />
        <DeltaRow label="Закрыто задач" p1={period1.closed} p2={period2.closed} />
        <DeltaRow label="Часы работы" p1={period1.hours} p2={period2.hours} fmt={formatHours} />
        <DeltaRow label="События в логе" p1={period1.events} p2={period2.events} />
        <DeltaRow label="Активных пользователей" p1={period1.activeUsers} p2={period2.activeUsers} />
      </div>
    </Card>
  )
}

export default CompareTab
