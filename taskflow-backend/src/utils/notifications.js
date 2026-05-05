import { query } from '../db.js'
import { sendTelegram } from '../telegram.js'

const ACTION_TEMPLATES = {
  'task.created':    { emoji: '🆕', verb: 'создал задачу' },
  'task.updated':    { emoji: '✏️', verb: 'обновил задачу' },
  'task.moved':      { emoji: '➡️', verb: 'переместил задачу' },
  'task.deleted':    { emoji: '🗑', verb: 'удалил задачу' },
  'task.archived':   { emoji: '📦', verb: 'архивировал задачу' },
  'task.unarchived': { emoji: '♻️', verb: 'восстановил задачу' },
  'comment.added':   { emoji: '💬', verb: 'добавил комментарий' },
  'task.assigned':   { emoji: '👤', verb: 'назначил задачу' },
}

function escapeHtml(s) {
  if (!s) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Отправляет уведомления в Telegram:
 *   - Владельцу доски (если включено и не сам actor)
 *   - Исполнителю задачи (если включено и не сам actor)
 *
 * args:
 *   actorId      — кто сделал действие
 *   actorEmail   — email actor для отображения
 *   boardId      — id доски
 *   action       — task.created / task.updated / ...
 *   taskId       — id задачи (для получения assigned_to)
 *   title        — название (задачи / колонки)
 *   boardTitle   — название доски (опционально, иначе подгрузим)
 */
export async function notify({ actorId, actorEmail, boardId, action, taskId, title, boardTitle }) {
  try {
    const tpl = ACTION_TEMPLATES[action] || { emoji: 'ℹ️', verb: action }

    // Кто получит уведомление
    const recipients = new Set()

    // Владелец доски
    if (boardId) {
      const ownerR = await query(
        `SELECT b.owner_id, b.title FROM dbo.boards b WHERE b.id = @bid`,
        { bid: boardId }
      )
      if (ownerR.recordset.length) {
        if (!boardTitle) boardTitle = ownerR.recordset[0].title
        const ownerId = ownerR.recordset[0].owner_id
        if (ownerId && ownerId !== actorId) recipients.add(ownerId)
      }
    }

    // Исполнитель задачи
    if (taskId) {
      const t = await query(
        `SELECT assigned_to FROM dbo.tasks WHERE id = @tid`,
        { tid: taskId }
      )
      const assignee = t.recordset[0]?.assigned_to
      if (assignee && assignee !== actorId) recipients.add(assignee)
    }

    if (recipients.size === 0) return

    // Сообщение
    const msg =
      `${tpl.emoji} <b>${escapeHtml(actorEmail || 'Кто-то')}</b> ${tpl.verb}` +
      (title ? `\n«${escapeHtml(title)}»` : '') +
      (boardTitle ? `\n\n📋 Доска: ${escapeHtml(boardTitle)}` : '')

    // Получаем chat_id для всех получателей
    const ids = [...recipients]
    if (ids.length === 0) return
    const placeholders = ids.map((_, i) => `@u${i}`).join(',')
    const params = {}
    ids.forEach((id, i) => { params[`u${i}`] = id })

    const r = await query(
      `SELECT id, telegram_chat_id FROM dbo.users
       WHERE id IN (${placeholders}) AND telegram_chat_id IS NOT NULL AND notify_telegram = 1`,
      params
    )

    for (const u of r.recordset) {
      sendTelegram(u.telegram_chat_id, msg)
    }
  } catch (err) {
    console.error('Notify error:', err.message)
  }
}
