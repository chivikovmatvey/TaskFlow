import express from 'express'
import { query, sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess, getBoardMemberIds } from '../utils/boardAccess.js'
import { emitBoardChanged, emitToUser } from '../realtime.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT b.* FROM dbo.boards b
       LEFT JOIN dbo.board_members m ON m.board_id = b.id
       WHERE b.owner_id = @userId OR m.user_id = @userId
       ORDER BY b.created_at DESC`,
      { userId: req.user.id }
    )
    res.json(result.recordset)
  } catch (err) {
    console.error('Get boards error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const board = await query(
      `SELECT * FROM dbo.boards WHERE id = @id`,
      { id: req.params.id }
    )
    if (!board.recordset.length) return res.status(404).json({ error: 'Не найдено' })

    const columns = await query(
      `SELECT * FROM dbo.columns WHERE board_id = @id ORDER BY position`,
      { id: req.params.id }
    )
    const tasks = await query(
      `SELECT * FROM dbo.tasks WHERE board_id = @id ORDER BY position`,
      { id: req.params.id }
    )
    const result = board.recordset[0]
    result.columns = columns.recordset.map((c) => ({
      ...c,
      tasks: tasks.recordset.filter((t) => t.column_id === c.id),
    }))
    res.json(result)
  } catch (err) {
    console.error('Get board error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/:id/permissions', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) {
      return res.json({
        isOwner: false, isAdmin: false, canManageColumns: false,
        canManageMembers: false, canManageTasks: false, role: null,
      })
    }
    res.json({
      isOwner: access.isOwner,
      isAdmin: access.role === 'admin' || access.isOwner,
      canManageColumns: access.canManageColumns,
      canManageMembers: access.canManageMembers,
      canManageTasks: true,
      role: access.role,
    })
  } catch (err) {
    console.error('Permissions error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, description, background_color } = req.body
    if (!title) return res.status(400).json({ error: 'Название обязательно' })
    const result = await query(
      `INSERT INTO dbo.boards (title, description, background_color, owner_id)
       OUTPUT INSERTED.*
       VALUES (@title, @description, @bg, @ownerId)`,
      {
        title,
        description: description || null,
        bg: background_color || '#3b82f6',
        ownerId: req.user.id,
      }
    )
    const board = result.recordset[0]
    const defaults = [
      { title: 'Нужно сделать', position: 0 },
      { title: 'В работе', position: 1 },
      { title: 'Готово', position: 2 },
    ]
    for (const c of defaults) {
      await query(
        `INSERT INTO dbo.columns (board_id, title, position) VALUES (@bid, @title, @pos)`,
        { bid: board.id, title: c.title, pos: c.position }
      )
    }
    emitToUser(req.user.id, 'dashboard:changed', { boardId: board.id })
    res.status(201).json(board)
  } catch (err) {
    console.error('Create board error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access?.isOwner) return res.status(403).json({ error: 'Только владелец может изменять' })
    const { title, description, background_color } = req.body
    const result = await query(
      `UPDATE dbo.boards SET
         title = COALESCE(@title, title),
         description = COALESCE(@description, description),
         background_color = COALESCE(@bg, background_color),
         updated_at = SYSDATETIMEOFFSET()
       OUTPUT INSERTED.*
       WHERE id = @id`,
      {
        id: req.params.id,
        title: title ?? null,
        description: description ?? null,
        bg: background_color ?? null,
      }
    )
    const memberIds = await getBoardMemberIds(req.params.id)
    emitBoardChanged(req.params.id, memberIds)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Update board error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access?.isOwner) return res.status(403).json({ error: 'Только владелец может удалять' })
    const memberIds = await getBoardMemberIds(req.params.id)
    await query(`DELETE FROM dbo.boards WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(req.params.id, memberIds)
    for (const uid of memberIds) emitToUser(uid, 'board:deleted', { boardId: req.params.id })
    res.status(204).end()
  } catch (err) {
    console.error('Delete board error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/:id/duplicate', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const orig = await query(`SELECT * FROM dbo.boards WHERE id = @id`, { id: req.params.id })
    if (!orig.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const o = orig.recordset[0]

    const newBoard = await query(
      `INSERT INTO dbo.boards (title, description, background_color, owner_id)
       OUTPUT INSERTED.*
       VALUES (@title, @description, @bg, @ownerId)`,
      {
        title: `${o.title} (копия)`,
        description: o.description,
        bg: o.background_color,
        ownerId: req.user.id,
      }
    )
    const nb = newBoard.recordset[0]

    const cols = await query(
      `SELECT * FROM dbo.columns WHERE board_id = @id ORDER BY position`,
      { id: req.params.id }
    )
    for (const c of cols.recordset) {
      const newCol = await query(
        `INSERT INTO dbo.columns (board_id, title, position)
         OUTPUT INSERTED.id
         VALUES (@bid, @title, @pos)`,
        { bid: nb.id, title: c.title, pos: c.position }
      )
      const newColId = newCol.recordset[0].id

      const tasks = await query(
        `SELECT * FROM dbo.tasks WHERE column_id = @cid ORDER BY position`,
        { cid: c.id }
      )
      for (const t of tasks.recordset) {
        await query(
          `INSERT INTO dbo.tasks (board_id, column_id, title, description, position, priority, due_date, created_by)
           VALUES (@bid, @cid, @title, @description, @pos, @priority, @due, @createdBy)`,
          {
            bid: nb.id,
            cid: newColId,
            title: t.title,
            description: t.description,
            pos: t.position,
            priority: t.priority,
            due: t.due_date,
            createdBy: req.user.id,
          }
        )
      }
    }
    emitToUser(req.user.id, 'dashboard:changed', { boardId: nb.id })
    res.status(201).json(nb)
  } catch (err) {
    console.error('Duplicate error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
