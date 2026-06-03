import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { insightsService } from '../../services/insightsService'
import { Card, Loading, Empty, UserAvatar } from './shared'
import { ACTION_LABELS } from './insightsLib'
import { exportCSV } from '../../utils/csv'
import Select from '../common/Select'

const ACTION_OPTIONS = [
  { value: '', label: 'Все действия' },
  { value: 'task.created', label: 'Создание задач' },
  { value: 'task.archived', label: 'Закрытие задач' },
  { value: 'task.moved', label: 'Перемещение' },
  { value: 'task.updated', label: 'Обновление' },
  { value: 'task.assigned', label: 'Назначение' },
  { value: 'comment.added', label: 'Комментарии' },
  { value: 'column.created', label: 'Создание колонок' },
  { value: 'column.deleted', label: 'Удаление колонок' },
]

function HistoryTab({ boardId, range }) {
  const [filters, setFilters] = useState({ userId: '', action: '', search: '' })
  const [limit, setLimit] = useState(200)

  const { data: items, isLoading } = useQuery({
    queryKey: ['insights-history', boardId, range?.from, range?.to, filters, limit],
    queryFn: () => insightsService.getHistory(boardId, {
      range, limit,
      userId: filters.userId || undefined,
      action: filters.action || undefined,
      search: filters.search || undefined,
    }),
  })

  const { data: usersData } = useQuery({
    queryKey: ['insights-users', boardId, range?.from, range?.to],
    queryFn: () => insightsService.getUsers(boardId, range),
  })

  const userOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Все пользователи' }]
    for (const u of usersData?.users || []) {
      opts.push({
        value: u.user_id,
        label: u.full_name || u.username || u.email,
        user: u,
      })
    }
    return opts
  }, [usersData])

  const handleExport = () => {
    if (!items) return
    exportCSV(`taskflow-history-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'created_at', label: 'Когда', value: r => new Date(r.created_at).toLocaleString('ru-RU') },
      { key: 'user_email', label: 'Пользователь' },
      { key: 'action', label: 'Действие', value: r => ACTION_LABELS[r.action] || r.action },
      { key: 'title', label: 'Объект' },
    ], items)
  }

  return (
    <Card
      title="История действий"
      action={
        <button
          onClick={handleExport}
          disabled={!items?.length}
          className="text-xs font-medium text-ink-muted hover:text-coral disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          CSV
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <Select
          value={filters.action}
          onChange={(v) => setFilters(f => ({ ...f, action: v }))}
          options={ACTION_OPTIONS}
        />
        <Select
          value={filters.userId}
          onChange={(v) => setFilters(f => ({ ...f, userId: v }))}
          options={userOptions}
          renderOption={(opt) => (
            opt.user ? (
              <span className="flex items-center gap-2">
                <UserAvatar user={opt.user} size={20} />
                <span className="truncate">{opt.label}</span>
              </span>
            ) : opt.label
          )}
          renderTrigger={(opt) => (
            opt.user ? (
              <span className="flex items-center gap-2">
                <UserAvatar user={opt.user} size={20} />
                <span className="truncate">{opt.label}</span>
              </span>
            ) : opt.label
          )}
        />
        <div className="relative">
          <svg className="w-3.5 h-3.5 text-ink-muted-soft absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Поиск по названию"
            className="w-full pl-8 pr-2.5 py-2 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-sm text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring transition-colors hover:border-coral/50"
          />
        </div>
      </div>

      {isLoading || !items ? <Loading /> : items.length === 0 ? <Empty>Записей нет</Empty> : (
        <>
          <div className="divide-y divide-hairline-soft dark:divide-navy-hairline">
            {items.map((it) => (
              <div key={it.id} className="flex items-start gap-3 py-3">
                <UserAvatar user={{ avatar_url: it.user_avatar_url, full_name: it.user_full_name, username: it.user_username, email: it.user_email }} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink dark:text-canvas">
                    <span className="font-medium">{it.user_full_name || it.user_username || it.user_email || 'Аноним'}</span>
                    <span className="text-ink-muted dark:text-ink-muted-soft"> {ACTION_LABELS[it.action] || it.action}</span>
                    {it.title && <span className="text-ink dark:text-canvas"> «{it.title}»</span>}
                  </p>
                  <p className="text-[11px] text-ink-muted-soft mt-0.5">
                    {new Date(it.created_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {items.length >= limit && (
            <div className="text-center pt-4">
              <button
                onClick={() => setLimit(l => l + 200)}
                className="text-xs font-medium text-coral hover:text-coral-active"
              >
                Показать ещё
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default HistoryTab
