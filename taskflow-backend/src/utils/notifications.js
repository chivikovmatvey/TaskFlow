import { query } from '../db.js'
import { sendTelegram } from '../telegram.js'

const PRIORITY_LABEL = {
  urgent: 'Срочно',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

function escapeHtml(s) {
  if (!s) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function actorLabel(name, email, username) {
  const display = name || username || email || 'Кто-то'
  return `<b>${escapeHtml(display)}</b>`
}

function formatDate(d) {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tom = new Date(today); tom.setDate(tom.getDate() + 1)
  const target = new Date(dt); target.setHours(0, 0, 0, 0)
  const fmt = dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  if (target.getTime() === today.getTime()) return `сегодня, ${fmt}`
  if (target.getTime() === tom.getTime()) return `завтра, ${fmt}`
  if (target < today) return `${fmt} (просрочено)`
  return fmt
}

function truncate(s, n = 250) {
  if (!s) return ''
  const str = String(s).trim()
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

function taskHeading(taskTitle, taskUrl) {
  if (!taskTitle) return ''
  const inner = `<b>${escapeHtml(taskTitle)}</b>`
  return taskUrl ? `«<a href="${taskUrl}">${inner}</a>»` : `«${inner}»`
}

function kv(label, value) {
  if (value == null || value === '') return null
  return `${label}: ${value}`
}

function buildMessage({
  action, actor, taskTitle, taskUrl, boardTitle, columnTitle,
  priority, dueDate, assigneeName, creatorName,
  changes, commentText, fromColumn, toColumn,
}) {
  const sections = []
  const heading = taskHeading(taskTitle, taskUrl)

  switch (action) {
    case 'task.created': {
      sections.push(`Новая задача · ${actor}`)
      if (heading) sections.push(heading)
      const meta = [
        priority ? kv('Приоритет', `<b>${PRIORITY_LABEL[priority] || priority}</b>`) : null,
        assigneeName ? kv('Исполнитель', escapeHtml(assigneeName)) : null,
        dueDate ? kv('Срок', `<b>${formatDate(dueDate)}</b>`) : null,
        columnTitle ? kv('Колонка', `<i>${escapeHtml(columnTitle)}</i>`) : null,
      ].filter(Boolean)
      if (meta.length) sections.push(meta.join('\n'))
      break
    }

    case 'task.moved':
      sections.push(`Перемещение · ${actor}`)
      if (heading) sections.push(heading)
      if (fromColumn && toColumn) sections.push(`<i>${escapeHtml(fromColumn)}</i> → <b>${escapeHtml(toColumn)}</b>`)
      else if (toColumn) sections.push(`В колонку <b>${escapeHtml(toColumn)}</b>`)
      break

    case 'task.assigned': {
      sections.push(`Назначение · ${actor}`)
      if (heading) sections.push(heading)
      const meta = [
        assigneeName ? kv('Исполнитель', `<b>${escapeHtml(assigneeName)}</b>`) : null,
        priority ? kv('Приоритет', PRIORITY_LABEL[priority] || priority) : null,
        dueDate ? kv('Срок', formatDate(dueDate)) : null,
      ].filter(Boolean)
      if (meta.length) sections.push(meta.join('\n'))
      break
    }

    case 'task.updated': {
      sections.push(`Изменения · ${actor}`)
      if (heading) sections.push(heading)
      const diff = formatChanges(changes)
      if (diff.length) sections.push(diff.join('\n'))
      break
    }

    case 'task.archived':
      sections.push(`Закрыта · ${actor}`)
      if (heading) sections.push(heading)
      {
        const meta = [
          columnTitle ? kv('Из колонки', `<i>${escapeHtml(columnTitle)}</i>`) : null,
          creatorName ? kv('Автор', escapeHtml(creatorName)) : null,
        ].filter(Boolean)
        if (meta.length) sections.push(meta.join('\n'))
      }
      break

    case 'task.unarchived':
      sections.push(`Восстановлена · ${actor}`)
      if (heading) sections.push(heading)
      if (columnTitle) sections.push(kv('В колонку', `<i>${escapeHtml(columnTitle)}</i>`))
      break

    case 'task.deleted':
      sections.push(`Удалена · ${actor}`)
      if (heading) sections.push(heading)
      break

    case 'comment.added':
      sections.push(`Комментарий · ${actor}`)
      if (heading) sections.push(heading)
      if (commentText) sections.push(`<blockquote>${escapeHtml(truncate(commentText, 350))}</blockquote>`)
      break

    default:
      sections.push(`${escapeHtml(action)} · ${actor}`)
      if (heading) sections.push(heading)
  }

  if (boardTitle) sections.push(`<i>${escapeHtml(boardTitle)}</i>`)

  return sections.join('\n\n')
}

function formatChanges(changes) {
  if (!changes || typeof changes !== 'object') return []
  const out = []
  for (const [field, val] of Object.entries(changes)) {
    if (val == null) continue
    if (field === 'title') {
      out.push(`Название: <s>${escapeHtml(val.from || '—')}</s> → <b>${escapeHtml(val.to || '—')}</b>`)
    } else if (field === 'description') {
      out.push('Описание обновлено')
    } else if (field === 'priority') {
      const f = PRIORITY_LABEL[val.from] || val.from || '—'
      const t = PRIORITY_LABEL[val.to] || val.to || '—'
      out.push(`Приоритет: ${escapeHtml(f)} → <b>${escapeHtml(t)}</b>`)
    } else if (field === 'due_date') {
      const f = val.from ? formatDate(val.from) : 'без срока'
      const t = val.to ? formatDate(val.to) : 'без срока'
      out.push(`Срок: ${escapeHtml(f)} → <b>${escapeHtml(t)}</b>`)
    } else if (field === 'assignee') {
      const f = val.from || 'никто'
      const t = val.to || 'никто'
      out.push(`Исполнитель: ${escapeHtml(f)} → <b>${escapeHtml(t)}</b>`)
    } else if (field === 'column') {
      out.push(`Колонка: <i>${escapeHtml(val.from || '—')}</i> → <b>${escapeHtml(val.to || '—')}</b>`)
    }
  }
  return out
}

async function loadRecipients({ taskId, boardId, actorId, action, extraRecipients }) {
  const set = new Set()
  let boardTitle = null

  if (boardId) {
    const r = await query(
      `SELECT b.owner_id, b.title FROM dbo.boards b WHERE b.id = @bid`,
      { bid: boardId }
    )
    if (r.recordset.length) {
      boardTitle = r.recordset[0].title
      const ownerId = r.recordset[0].owner_id
      if (ownerId && ownerId !== actorId) set.add(ownerId)
    }
  }

  if (taskId) {
    const r = await query(
      `SELECT assigned_to, created_by FROM dbo.tasks WHERE id = @tid`,
      { tid: taskId }
    )
    const row = r.recordset[0]
    if (row) {
      if (row.assigned_to && row.assigned_to !== actorId) set.add(row.assigned_to)
      if (row.created_by && row.created_by !== actorId && action !== 'task.created') set.add(row.created_by)
    }
  }

  if (Array.isArray(extraRecipients)) {
    for (const id of extraRecipients) if (id && id !== actorId) set.add(id)
  }

  return { recipients: [...set], boardTitle }
}

async function loadActor(actorId, fallbackEmail) {
  if (!actorId) return actorLabel(null, fallbackEmail, null)
  const r = await query(
    `SELECT email, full_name, username FROM dbo.users WHERE id = @id`,
    { id: actorId }
  )
  const u = r.recordset[0] || {}
  return actorLabel(u.full_name, u.email || fallbackEmail, u.username)
}

export async function notify(params) {
  try {
    const {
      actorId, actorEmail,
      boardId, action,
      taskId, title, boardTitle: boardTitleArg,
      extraRecipients,
      taskUrl,
      columnTitle, priority, dueDate,
      assigneeName, creatorName,
      changes, commentText,
      fromColumn, toColumn,
    } = params

    const { recipients, boardTitle: foundBoardTitle } = await loadRecipients({
      taskId, boardId, actorId, action, extraRecipients,
    })
    if (recipients.length === 0) return

    const actor = await loadActor(actorId, actorEmail)
    const boardTitle = boardTitleArg || foundBoardTitle

    const msg = buildMessage({
      action, actor,
      taskTitle: title, taskUrl, boardTitle, columnTitle,
      priority, dueDate, assigneeName, creatorName,
      changes, commentText, fromColumn, toColumn,
    })

    const placeholders = recipients.map((_, i) => `@u${i}`).join(',')
    const paramsObj = {}
    recipients.forEach((id, i) => { paramsObj[`u${i}`] = id })

    const r = await query(
      `SELECT id, telegram_chat_id FROM dbo.users
       WHERE id IN (${placeholders}) AND telegram_chat_id IS NOT NULL AND notify_telegram = 1`,
      paramsObj
    )

    for (const u of r.recordset) {
      sendTelegram(u.telegram_chat_id, msg)
    }
  } catch (err) {
    console.error('Notify error:', err.message)
  }
}
