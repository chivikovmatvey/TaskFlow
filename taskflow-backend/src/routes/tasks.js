import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess, getTaskBoardId } from '../utils/boardAccess.js'
import { emitBoardChanged } from '../realtime.js'
import { logActivity } from '../utils/activityLog.js'
import { notify } from '../utils/notifications.js'

const router = express.Router()
router.use(authMiddleware)

function buildTaskUrl(boardId, taskId) {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000'
  return `${base}/board/${boardId}?task=${taskId}`
}

async function getUserDisplay(userId) {
  if (!userId) return null
  const r = await query(
    `SELECT email, full_name, username FROM dbo.users WHERE id = @id`,
    { id: userId }
  )
  const u = r.recordset[0]
  if (!u) return null
  return u.full_name || (u.username ? `@${u.username}` : u.email)
}

async function getColumnTitle(columnId) {
  if (!columnId) return null
  const r = await query(`SELECT title FROM dbo.columns WHERE id = @id`, { id: columnId })
  return r.recordset[0]?.title || null
}

router.post('/', async (req, res) => {
  try {
    const { column_id, board_id, title, description, position, priority, due_date, assigned_to } = req.body
    if (!column_id || !board_id || !title) {
      return res.status(400).json({ error: 'Обязательные поля отсутствуют' })
    }
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const result = await query(
      `INSERT INTO dbo.tasks (column_id, board_id, title, description, position, priority, due_date, assigned_to, created_by)
       OUTPUT INSERTED.*
       VALUES (@cid, @bid, @title, @description, @pos, @priority, @due, @assigned, @createdBy)`,
      {
        cid: column_id,
        bid: board_id,
        title,
        description: description || null,
        pos: position ?? 0,
        priority: priority || 'medium',
        due: due_date || null,
        assigned: assigned_to || null,
        createdBy: req.user.id,
      }
    )
    emitBoardChanged(board_id)
    const created = result.recordset[0]
    await logActivity({
      boardId: board_id, userId: req.user.id, action: 'task.created',
      entityType: 'task', entityId: created.id, title: created.title,
    })
    const [columnTitle, assigneeName] = await Promise.all([
      getColumnTitle(created.column_id),
      getUserDisplay(created.assigned_to),
    ])
    notify({
      actorId: req.user.id, actorEmail: req.user.email,
      boardId: board_id, action: 'task.created',
      taskId: created.id, title: created.title,
      taskUrl: buildTaskUrl(board_id, created.id),
      columnTitle, assigneeName,
      priority: created.priority, dueDate: created.due_date,
    })
    res.status(201).json(created)
  } catch (err) {
    console.error('Create task error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.id)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const before = await query(
      `SELECT title, description, priority, due_date, column_id, assigned_to, is_archived
       FROM dbo.tasks WHERE id = @id`,
      { id: req.params.id }
    )
    const old = before.recordset[0] || {}

    const u = req.body
    const result = await query(
      `UPDATE dbo.tasks SET
         title = COALESCE(@title, title),
         description = COALESCE(@description, description),
         column_id = COALESCE(@cid, column_id),
         position = COALESCE(@pos, position),
         priority = COALESCE(@priority, priority),
         due_date = CASE WHEN @dueSet = 1 THEN @due ELSE due_date END,
         assigned_to = CASE WHEN @assignedSet = 1 THEN @assigned ELSE assigned_to END,
         is_archived = COALESCE(@archived, is_archived),
         archived_at = CASE WHEN @archivedAtSet = 1 THEN @archivedAt ELSE archived_at END,
         updated_at = SYSDATETIMEOFFSET()
       OUTPUT INSERTED.*
       WHERE id = @id`,
      {
        id: req.params.id,
        title: u.title ?? null,
        description: u.description ?? null,
        cid: u.column_id ?? null,
        pos: u.position ?? null,
        priority: u.priority ?? null,
        due: u.due_date ?? null,
        dueSet: 'due_date' in u ? 1 : 0,
        assigned: u.assigned_to ?? null,
        assignedSet: 'assigned_to' in u ? 1 : 0,
        archived: typeof u.is_archived === 'boolean' ? u.is_archived : null,
        archivedAt: u.archived_at ?? null,
        archivedAtSet: 'archived_at' in u ? 1 : 0,
      }
    )
    emitBoardChanged(boardId)
    const updated = result.recordset[0]
    const action = u.is_archived === true ? 'task.archived' : (u.is_archived === false ? 'task.unarchived' : 'task.updated')
    await logActivity({
      boardId, userId: req.user.id, action,
      entityType: 'task', entityId: req.params.id, title: updated.title,
    })

    const changes = {}
    if (old.title !== updated.title) changes.title = { from: old.title, to: updated.title }
    if ((old.description || '') !== (updated.description || '')) changes.description = { from: old.description, to: updated.description }
    if (old.priority !== updated.priority) changes.priority = { from: old.priority, to: updated.priority }
    if (String(old.due_date || '') !== String(updated.due_date || '')) {
      changes.due_date = { from: old.due_date, to: updated.due_date }
    }
    if (old.column_id !== updated.column_id) {
      const [fromCol, toCol] = await Promise.all([
        getColumnTitle(old.column_id),
        getColumnTitle(updated.column_id),
      ])
      changes.column = { from: fromCol, to: toCol }
    }
    if (old.assigned_to !== updated.assigned_to) {
      const [fromA, toA] = await Promise.all([
        getUserDisplay(old.assigned_to),
        getUserDisplay(updated.assigned_to),
      ])
      changes.assignee = { from: fromA, to: toA }
    }

    const columnTitle = await getColumnTitle(updated.column_id)
    const creatorName = await getUserDisplay(updated.created_by)

    if (action === 'task.updated') {
      const hasMeaningfulChanges = Object.keys(changes).length > 0
      if (hasMeaningfulChanges) {
        notify({
          actorId: req.user.id, actorEmail: req.user.email,
          boardId, action,
          taskId: req.params.id, title: updated.title,
          taskUrl: buildTaskUrl(boardId, req.params.id),
          changes,
        })
      }
    } else {
      notify({
        actorId: req.user.id, actorEmail: req.user.email,
        boardId, action,
        taskId: req.params.id, title: updated.title,
        taskUrl: buildTaskUrl(boardId, req.params.id),
        columnTitle, creatorName,
      })
    }

    if ('assigned_to' in u && u.assigned_to && u.assigned_to !== old.assigned_to) {
      const assigneeName = await getUserDisplay(u.assigned_to)
      notify({
        actorId: req.user.id, actorEmail: req.user.email,
        boardId, action: 'task.assigned',
        taskId: req.params.id, title: updated.title,
        taskUrl: buildTaskUrl(boardId, req.params.id),
        assigneeName, priority: updated.priority, dueDate: updated.due_date,
        extraRecipients: [u.assigned_to],
      })
    }
    res.json(updated)
  } catch (err) {
    console.error('Update task error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/:id/move', async (req, res) => {
  try {
    const { column_id, position, allTaskIds } = req.body
    const boardId = await getTaskBoardId(req.params.id)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const before = await query(
      `SELECT column_id, title FROM dbo.tasks WHERE id = @id`,
      { id: req.params.id }
    )
    const oldColumnId = before.recordset[0]?.column_id
    const taskTitle = before.recordset[0]?.title

    await query(
      `UPDATE dbo.tasks SET column_id = @cid, position = @pos, updated_at = SYSDATETIMEOFFSET()
       WHERE id = @id`,
      { id: req.params.id, cid: column_id, pos: position }
    )

    if (Array.isArray(allTaskIds)) {
      for (let i = 0; i < allTaskIds.length; i++) {
        await query(
          `UPDATE dbo.tasks SET position = @pos WHERE id = @id AND column_id = @cid`,
          { id: allTaskIds[i], pos: i, cid: column_id }
        )
      }
    }
    emitBoardChanged(boardId)
    await logActivity({
      boardId, userId: req.user.id, action: 'task.moved',
      entityType: 'task', entityId: req.params.id,
      details: { column_id, position },
    })

    if (oldColumnId !== column_id) {
      const [fromColumn, toColumn] = await Promise.all([
        getColumnTitle(oldColumnId),
        getColumnTitle(column_id),
      ])
      notify({
        actorId: req.user.id, actorEmail: req.user.email,
        boardId, action: 'task.moved',
        taskId: req.params.id, title: taskTitle,
        taskUrl: buildTaskUrl(boardId, req.params.id),
        fromColumn, toColumn,
      })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Move task error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.id)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const old = await query(
      `SELECT title, assigned_to, created_by FROM dbo.tasks WHERE id = @id`,
      { id: req.params.id }
    )
    const oldTask = old.recordset[0]
    const stakeholders = oldTask ? [oldTask.assigned_to, oldTask.created_by].filter(Boolean) : []

    await query(`DELETE FROM dbo.tasks WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(boardId)
    await logActivity({
      boardId, userId: req.user.id, action: 'task.deleted',
      entityType: 'task', entityId: req.params.id, title: oldTask?.title,
    })
    if (oldTask) {
      notify({
        actorId: req.user.id, actorEmail: req.user.email,
        boardId, action: 'task.deleted',
        taskId: null, title: oldTask.title,
        extraRecipients: stakeholders,
      })
    }
    res.status(204).end()
  } catch (err) {
    console.error('Delete task error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/:id/duplicate', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.id)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const orig = await query(`SELECT * FROM dbo.tasks WHERE id = @id`, { id: req.params.id })
    if (!orig.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const t = orig.recordset[0]
    const result = await query(
      `INSERT INTO dbo.tasks (column_id, board_id, title, description, position, priority, due_date, assigned_to, created_by)
       OUTPUT INSERTED.*
       VALUES (@cid, @bid, @title, @description, @pos, @priority, @due, @assigned, @createdBy)`,
      {
        cid: t.column_id,
        bid: t.board_id,
        title: `${t.title} (копия)`,
        description: t.description,
        pos: t.position + 1,
        priority: t.priority,
        due: t.due_date,
        assigned: t.assigned_to,
        createdBy: req.user.id,
      }
    )
    emitBoardChanged(boardId)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Duplicate task error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/archived', async (req, res) => {
  try {
    const { board_id } = req.query
    if (!board_id) return res.status(400).json({ error: 'board_id обязателен' })
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT * FROM dbo.tasks WHERE board_id = @bid AND is_archived = 1 ORDER BY archived_at DESC`,
      { bid: board_id }
    )
    res.json(result.recordset)
  } catch (err) {
    console.error('Archived error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/:id/comments', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.id)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT c.*,
              u.email AS user_email, u.full_name AS user_full_name,
              u.username AS user_username, u.avatar_url AS user_avatar_url
       FROM dbo.comments c
       LEFT JOIN dbo.users u ON u.id = c.user_id
       WHERE c.task_id = @tid ORDER BY c.created_at ASC`,
      { tid: req.params.id }
    )
    res.json(result.recordset)
  } catch (err) {
    console.error('Get comments error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/:id/comments', async (req, res) => {
  try {
    const { content, parent_id } = req.body
    if (!content) return res.status(400).json({ error: 'Контент обязателен' })
    const boardId = await getTaskBoardId(req.params.id)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    let parentId = null
    if (parent_id) {
      const p = await query(
        `SELECT id, task_id, parent_id FROM dbo.comments WHERE id = @pid`,
        { pid: parent_id }
      )
      if (!p.recordset.length || p.recordset[0].task_id !== req.params.id) {
        return res.status(400).json({ error: 'Некорректный parent_id' })
      }
      parentId = p.recordset[0].parent_id || p.recordset[0].id
    }

    const result = await query(
      `INSERT INTO dbo.comments (task_id, user_id, content, parent_id)
       OUTPUT INSERTED.*
       VALUES (@tid, @uid, @content, @parent)`,
      { tid: req.params.id, uid: req.user.id, content, parent: parentId }
    )
    emitBoardChanged(boardId)
    await logActivity({
      boardId, userId: req.user.id, action: 'comment.added',
      entityType: 'comment', entityId: result.recordset[0].id,
      details: { task_id: req.params.id },
    })
    const tInfo = await query(`SELECT title FROM dbo.tasks WHERE id = @tid`, { tid: req.params.id })
    notify({
      actorId: req.user.id, actorEmail: req.user.email,
      boardId, action: 'comment.added',
      taskId: req.params.id, title: tInfo.recordset[0]?.title,
      taskUrl: buildTaskUrl(boardId, req.params.id),
      commentText: content,
    })
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Add comment error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/comments/:commentId', async (req, res) => {
  try {
    const { content } = req.body
    const c = await query(
      `SELECT c.*, t.board_id FROM dbo.comments c
       INNER JOIN dbo.tasks t ON t.id = c.task_id WHERE c.id = @id`,
      { id: req.params.commentId }
    )
    if (!c.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    if (c.recordset[0].user_id !== req.user.id) return res.status(403).json({ error: 'Только автор может редактировать' })
    const result = await query(
      `UPDATE dbo.comments SET content = @content, updated_at = SYSDATETIMEOFFSET()
       OUTPUT INSERTED.* WHERE id = @id`,
      { id: req.params.commentId, content }
    )
    emitBoardChanged(c.recordset[0].board_id)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Update comment error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/comments/:commentId', async (req, res) => {
  try {
    const c = await query(
      `SELECT c.*, t.board_id FROM dbo.comments c
       INNER JOIN dbo.tasks t ON t.id = c.task_id WHERE c.id = @id`,
      { id: req.params.commentId }
    )
    if (!c.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    if (c.recordset[0].user_id !== req.user.id) return res.status(403).json({ error: 'Только автор может удалить' })
    await query(`DELETE FROM dbo.comments WHERE parent_id = @id`, { id: req.params.commentId })
    await query(`DELETE FROM dbo.comments WHERE id = @id`, { id: req.params.commentId })
    emitBoardChanged(c.recordset[0].board_id)
    res.status(204).end()
  } catch (err) {
    console.error('Delete comment error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
