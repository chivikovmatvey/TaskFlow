import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { insightsService } from '../../services/insightsService'
import { Card, Loading, Empty, UserAvatar } from './shared'
import { formatHours } from './insightsLib'
import { exportCSV } from '../../utils/csv'
import UserDetailModal from './UserDetailModal'

const SORT_KEYS = [
  { key: 'activity_score', label: 'Активность' },
  { key: 'created', label: 'Создано' },
  { key: 'closed', label: 'Закрыто' },
  { key: 'commented', label: 'Комм.' },
  { key: 'hours', label: 'Часы' },
  { key: 'active', label: 'В работе' },
  { key: 'overdue', label: 'Просрочено' },
  { key: 'cycle_hours', label: 'Срок' },
]

function SortHeader({ keyName, label, sort, setSort }) {
  const active = sort.key === keyName
  return (
    <button
      onClick={() => setSort(s => ({
        key: keyName,
        dir: s.key === keyName ? (s.dir === 'asc' ? 'desc' : 'asc') : 'desc',
      }))}
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-caption-up font-semibold transition-colors ${
        active ? 'text-coral' : 'text-ink-muted-soft hover:text-ink-body'
      }`}
    >
      {label}
      {active && (
        <svg className={`w-3 h-3 transition-transform ${sort.dir === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  )
}

function UsersTab({ boardId, range }) {
  const [sort, setSort] = useState({ key: 'activity_score', dir: 'desc' })
  const [openUserId, setOpenUserId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['insights-users', boardId, range?.from, range?.to],
    queryFn: () => insightsService.getUsers(boardId, range),
  })

  const sorted = useMemo(() => {
    if (!data?.users) return []
    const arr = [...data.users]
    arr.sort((a, b) => {
      const va = a[sort.key] ?? -Infinity
      const vb = b[sort.key] ?? -Infinity
      if (va === vb) return 0
      return sort.dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return arr
  }, [data, sort])

  const handleExport = () => {
    exportCSV(`taskflow-users-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'full_name', label: 'Имя', value: u => u.full_name || u.username || u.email },
      { key: 'email', label: 'Email' },
      { key: 'created', label: 'Создано' },
      { key: 'closed', label: 'Закрыто' },
      { key: 'moved', label: 'Перемещений' },
      { key: 'commented', label: 'Комментарии' },
      { key: 'active', label: 'В работе' },
      { key: 'overdue', label: 'Просрочено' },
      { key: 'urgent', label: 'Срочно' },
      { key: 'hours', label: 'Часы' },
      { key: 'cycle_hours', label: 'Срок выполнения, ч' },
      { key: 'activity_score', label: 'Активность' },
    ], sorted)
  }

  if (isLoading || !data) return <Loading />
  if (!data.users.length) return <Empty>Нет участников</Empty>

  const max = Math.max(...sorted.map(u => u.activity_score), 1)

  return (
    <>
      <Card
        title="Активность по пользователям"
        action={
          <button
            onClick={handleExport}
            className="text-xs font-medium text-ink-muted hover:text-coral transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            CSV
          </button>
        }
      >
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-hairline dark:border-navy-hairline">
                <th className="text-left py-2 pr-3 font-normal">
                  <span className="text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">Пользователь</span>
                </th>
                {SORT_KEYS.map(s => (
                  <th key={s.key} className="text-right py-2 px-2 font-normal whitespace-nowrap">
                    <SortHeader keyName={s.key} label={s.label} sort={sort} setSort={setSort} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(u => (
                <tr
                  key={u.user_id}
                  onClick={() => setOpenUserId(u.user_id)}
                  className="border-b border-hairline-soft dark:border-navy-hairline cursor-pointer hover:bg-canvas dark:hover:bg-navy-elevated transition-colors"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar user={u} size={28} />
                      <div className="min-w-0">
                        <div className="text-sm text-ink dark:text-canvas truncate">
                          {u.full_name || u.username || u.email}
                        </div>
                        {u.username && (
                          <div className="text-[11px] text-ink-muted-soft truncate">@{u.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-right tabular-nums px-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-12 h-1 bg-canvas dark:bg-navy-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-coral" style={{ width: `${(u.activity_score / max) * 100}%` }} />
                      </div>
                      <span className="font-medium text-ink dark:text-canvas">{u.activity_score}</span>
                    </div>
                  </td>
                  <td className="text-right tabular-nums px-2 text-ink-body dark:text-ink-muted">{u.created}</td>
                  <td className="text-right tabular-nums px-2 text-teal font-medium">{u.closed}</td>
                  <td className="text-right tabular-nums px-2 text-ink-body dark:text-ink-muted">{u.commented}</td>
                  <td className="text-right tabular-nums px-2 text-ink dark:text-canvas font-medium">{formatHours(u.hours)}</td>
                  <td className="text-right tabular-nums px-2 text-ink-body dark:text-ink-muted">{u.active}</td>
                  <td className={`text-right tabular-nums px-2 ${u.overdue > 0 ? 'text-danger font-medium' : 'text-ink-muted-soft'}`}>{u.overdue}</td>
                  <td className="text-right tabular-nums px-2 text-ink-muted-soft">
                    {u.cycle_hours != null ? formatHours(u.cycle_hours) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-ink-muted-soft mt-3">
          Клик по строке — карточка пользователя. Активность = взвешенная сумма событий (закрытие × 5, создание × 3, комм. × 2, перемещение × 1).
        </p>
      </Card>

      {openUserId && (
        <UserDetailModal
          boardId={boardId}
          userId={openUserId}
          range={range}
          onClose={() => setOpenUserId(null)}
        />
      )}
    </>
  )
}

export default UsersTab
