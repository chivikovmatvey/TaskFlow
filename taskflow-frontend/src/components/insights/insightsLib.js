export const CHART_COLORS = [
  '#cc785c',
  '#5db8a6',
  '#e8a55a',
  '#c64545',
  '#6E9473',
  '#8a8779',
  '#f4654b',
  '#1f4068',
  '#a05c7b',
  '#3aa39f',
]

export const PRIORITY_COLOR = {
  urgent: '#c64545',
  high: '#e8a55a',
  medium: '#cc785c',
  low: '#5db8a6',
}

export const PRIORITY_LABEL = {
  urgent: 'Срочно',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

export const ACTION_LABELS = {
  'task.created': 'создал задачу',
  'task.updated': 'обновил задачу',
  'task.moved': 'переместил задачу',
  'task.deleted': 'удалил задачу',
  'task.archived': 'архивировал задачу',
  'task.unarchived': 'восстановил задачу',
  'task.assigned': 'назначил исполнителя',
  'column.created': 'создал колонку',
  'column.deleted': 'удалил колонку',
  'column.updated': 'обновил колонку',
  'comment.added': 'добавил комментарий',
  'member.added': 'добавил участника',
  'member.removed': 'удалил участника',
}

export function formatHours(h) {
  if (h == null) return '—'
  if (h === 0) return '0ч'
  if (h < 1) return `${Math.round(h * 60)}м`
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`
}

export function formatDay(s) {
  if (!s) return ''
  const d = typeof s === 'string' ? new Date(s) : s
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function shortDay(s) {
  if (!s) return ''
  const d = typeof s === 'string' ? new Date(s) : s
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const PRESETS = [
  { value: 'today', label: 'Сегодня', days: 0 },
  { value: '7d', label: '7 дней', days: 6 },
  { value: '30d', label: '30 дней', days: 29 },
  { value: '90d', label: '90 дней', days: 89 },
  { value: 'year', label: 'Год', days: 364 },
  { value: 'custom', label: 'Период', days: null },
]

export function presetToRange(preset) {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date(to)
  const p = PRESETS.find(p => p.value === preset)
  if (!p || p.days === null) return null
  from.setDate(from.getDate() - p.days)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}
