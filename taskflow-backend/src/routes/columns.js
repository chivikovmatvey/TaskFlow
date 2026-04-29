import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess } from '../utils/boardAccess.js'
import { emitBoardChanged } from '../realtime.js'

const router = express.Router()
router.use(authMiddleware)

router.post('/', async (req, res) => {
  try {
    const { board_id, title, position } = req.body
    if (!board_id || !title) return res.status(400).json({ error: 'board_id и title обязательны' })
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access?.canManageColumns) return res.status(403).json({ error: 'Нет прав' })

    const result = await query(
      `INSERT INTO dbo.columns (board_id, title, position)
       OUTPUT INSERTED.*
       VALUES (@bid, @title, @pos)`,
      { bid: board_id, title, pos: position ?? 0 }
    )
    emitBoardChanged(board_id)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Create column error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const col = await query(`SELECT board_id FROM dbo.columns WHERE id = @id`, { id: req.params.id })
    if (!col.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const boardId = col.recordset[0].board_id
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access?.canManageColumns) return res.status(403).json({ error: 'Нет прав' })

    const { title, position } = req.body
    const result = await query(
      `UPDATE dbo.columns SET
         title = COALESCE(@title, title),
         position = COALESCE(@pos, position)
       OUTPUT INSERTED.*
       WHERE id = @id`,
      { id: req.params.id, title: title ?? null, pos: position ?? null }
    )
    emitBoardChanged(boardId)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Update column error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const col = await query(`SELECT board_id FROM dbo.columns WHERE id = @id`, { id: req.params.id })
    if (!col.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const boardId = col.recordset[0].board_id
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access?.canManageColumns) return res.status(403).json({ error: 'Нет прав' })

    await query(`DELETE FROM dbo.tasks WHERE column_id = @id`, { id: req.params.id })
    await query(`DELETE FROM dbo.columns WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(boardId)
    res.status(204).end()
  } catch (err) {
    console.error('Delete column error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/reorder', async (req, res) => {
  try {
    const { board_id, columnIds } = req.body
    if (!board_id || !Array.isArray(columnIds)) {
      return res.status(400).json({ error: 'Неверные данные' })
    }
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access?.canManageColumns) return res.status(403).json({ error: 'Нет прав' })

    for (let i = 0; i < columnIds.length; i++) {
      await query(
        `UPDATE dbo.columns SET position = @pos WHERE id = @id AND board_id = @bid`,
        { id: columnIds[i], pos: i, bid: board_id }
      )
    }
    emitBoardChanged(board_id)
    res.json({ ok: true })
  } catch (err) {
    console.error('Reorder columns error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
