import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { boardService } from '../services/boardService'
import { insightsService } from '../services/insightsService'
import ThemeToggle from '../components/common/ThemeToggle'
import { useAuth } from '../context/AuthContext'

function InsightsPage() {
  const { id: boardId } = useParams()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('summary')

  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoard(boardId),
  })

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['insights-summary', boardId],
    queryFn: () => insightsService.getSummary(boardId),
    enabled: tab === 'summary',
  })

  const { data: history } = useQuery({
    queryKey: ['insights-history', boardId],
    queryFn: () => insightsService.getHistory(boardId),
    enabled: tab === 'history',
  })

  const { data: assigneesData } = useQuery({
    queryKey: ['insights-assignees', boardId],
    queryFn: () => insightsService.getAssignees(boardId),
    enabled: tab === 'assignees',
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const tabs = [
    { value: 'summary', label: 'Сводка' },
    { value: 'history', label: 'История' },
    { value: 'assignees', label: 'Исполнители' },
  ]

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy">
      <header className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to={`/board/${boardId}`}
              className="w-9 h-9 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all flex items-center justify-center group"
              title="К доске"
            >
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
                Аналитика
              </p>
              <h1 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas leading-none">
                {board?.title || '...'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="px-3 py-2 text-sm font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        {/* Tabs */}
        <div className="border-b border-hairline dark:border-navy-hairline mb-8 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'text-coral'
                  : 'text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas'
              }`}
            >
              {t.label}
              {tab === t.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral animate-fadeIn" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="animate-fadeIn">
          {tab === 'summary' && <SummaryTab data={summary} loading={sumLoading} />}
          {tab === 'history' && <HistoryTab items={history} />}
          {tab === 'assignees' && <AssigneesTab data={assigneesData} />}
        </div>
      </div>
    </div>
  )
}

// ─── Summary ──────────────────────────────────────────────────
function SummaryTab({ data, loading }) {
  if (loading || !data) {
    return <div className="text-center py-20 text-ink-muted-soft animate-shimmer text-sm">Загрузка</div>
  }

  const StatCard = ({ label, value, accent }) => (
    <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 hover:border-coral/30 transition-colors">
      <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
        {label}
      </p>
      <p className={`font-display text-4xl tracking-display-md ${accent ? 'text-coral' : 'text-ink dark:text-canvas'}`}>
        {value}
      </p>
    </div>
  )

  const priorityRows = [
    { key: 'urgent', label: 'Срочно', dot: 'bg-danger' },
    { key: 'high', label: 'Высокий', dot: 'bg-amber' },
    { key: 'medium', label: 'Средний', dot: 'bg-coral' },
    { key: 'low', label: 'Низкий', dot: 'bg-teal' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Всего задач" value={data.total} />
        <StatCard label="Активных" value={data.active} />
        <StatCard label="Просрочено" value={data.overdue} accent={data.overdue > 0} />
        <StatCard label="Сроки на неделе" value={data.dueWeek} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Priorities */}
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5">
          <h3 className="font-display text-xl tracking-display-md text-ink dark:text-canvas mb-4">
            По приоритету
          </h3>
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
                    <div
                      className={`h-full ${p.dot} transition-all duration-700 ease-smooth`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Columns */}
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5">
          <h3 className="font-display text-xl tracking-display-md text-ink dark:text-canvas mb-4">
            По колонкам
          </h3>
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
                    <div
                      className="h-full bg-coral transition-all duration-700 ease-smooth"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────
const ACTION_LABELS = {
  'task.created': 'создал задачу',
  'task.updated': 'обновил задачу',
  'task.moved': 'переместил задачу',
  'task.deleted': 'удалил задачу',
  'task.archived': 'архивировал задачу',
  'task.unarchived': 'восстановил задачу',
  'column.created': 'создал колонку',
  'column.deleted': 'удалил колонку',
  'comment.added': 'добавил комментарий',
}

function HistoryTab({ items }) {
  if (!items) {
    return <div className="text-center py-20 text-ink-muted-soft animate-shimmer text-sm">Загрузка</div>
  }
  if (items.length === 0) {
    return <div className="text-center py-20 text-ink-muted-soft text-sm">Истории действий пока нет</div>
  }
  return (
    <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg overflow-hidden">
      {items.map((it, i) => (
        <div
          key={it.id}
          className={`flex items-start gap-3 p-4 ${i > 0 ? 'border-t border-hairline dark:border-navy-hairline' : ''} hover:bg-canvas dark:hover:bg-navy-elevated transition-colors`}
        >
          <div className="w-8 h-8 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
            {it.user_email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink dark:text-canvas">
              <span className="font-medium">{it.user_email || 'Аноним'}</span>
              <span className="text-ink-muted dark:text-ink-muted-soft"> {ACTION_LABELS[it.action] || it.action}</span>
              {it.title && <span className="text-ink dark:text-canvas font-medium"> «{it.title}»</span>}
            </p>
            <p className="text-[11px] text-ink-muted-soft mt-0.5">
              {new Date(it.created_at).toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Assignees ────────────────────────────────────────────────
function AssigneesTab({ data }) {
  if (!data) {
    return <div className="text-center py-20 text-ink-muted-soft animate-shimmer text-sm">Загрузка</div>
  }
  if (data.assignees.length === 0) {
    return <div className="text-center py-20 text-ink-muted-soft text-sm">Назначенных задач нет</div>
  }

  return (
    <div className="space-y-3">
      {data.assignees.map((a) => (
        <details
          key={a.user_id}
          className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg group/d"
        >
          <summary className="p-4 flex items-center gap-3 cursor-pointer list-none hover:bg-canvas dark:hover:bg-navy-elevated transition-colors rounded-lg">
            <div className="w-10 h-10 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
              {a.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink dark:text-canvas truncate">{a.email}</p>
              {a.full_name && <p className="text-xs text-ink-muted-soft truncate">{a.full_name}</p>}
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <Stat label="Активные" value={a.active} />
              <Stat label="Готово" value={a.done} muted />
              {a.urgent > 0 && <Stat label="Срочно" value={a.urgent} accent="text-danger" />}
              {a.overdue > 0 && <Stat label="Просрочено" value={a.overdue} accent="text-danger" />}
            </div>
            <svg className="w-4 h-4 text-ink-muted-soft transition-transform group-open/d:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>

          <div className="px-4 pb-4 pt-1 space-y-1 border-t border-hairline dark:border-navy-hairline">
            {a.tasks.length === 0 ? (
              <p className="text-xs text-ink-muted-soft text-center py-3">Задач нет</p>
            ) : a.tasks.map((t) => {
              const overdue = t.due_date && new Date(t.due_date) < new Date()
              return (
                <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    t.priority === 'urgent' ? 'bg-danger' :
                    t.priority === 'high' ? 'bg-amber' :
                    t.priority === 'medium' ? 'bg-coral' : 'bg-teal'
                  }`} />
                  <span className={`flex-1 truncate ${t.is_archived ? 'line-through text-ink-muted-soft' : 'text-ink dark:text-canvas'}`}>
                    {t.title}
                  </span>
                  {t.due_date && (
                    <span className={`text-[11px] tabular-nums ${overdue && !t.is_archived ? 'text-danger' : 'text-ink-muted-soft'}`}>
                      {new Date(t.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}

function Stat({ label, value, accent, muted }) {
  return (
    <div className="text-center">
      <p className={`tabular-nums font-semibold ${accent || (muted ? 'text-ink-muted-soft' : 'text-ink dark:text-canvas')}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-caption-up text-ink-muted-soft">{label}</p>
    </div>
  )
}

export default InsightsPage
