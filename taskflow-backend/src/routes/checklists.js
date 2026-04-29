import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess, getTaskBoardId } from '../utils/boardAccess.js'
import { emitBoardChanged } from '../realtime.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/task/:taskId', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT * FROM dbo.checklist_items WHERE task_id = @tid ORDER BY position`,
      { tid: req.params.taskId }
    )
    res.json(result.recordset)
  } catch (err) {
    console.error('Get checklist error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/task/:taskId', async (req, res) => {
  try {
    const { title, position } = req.body
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `INSERT INTO dbo.checklist_items (task_id, title, position, is_completed)
       OUTPUT INSERTED.*
       VALUES (@tid, @title, @pos, 0)`,
      { tid: req.params.taskId, title, pos: position ?? 0 }
    )
    emitBoardChanged(boardId)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Create checklist error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const item = await query(
      `SELECT ci.*, t.board_id FROM dbo.checklist_items ci
       INNER JOIN dbo.tasks t ON t.id = ci.task_id WHERE ci.id = @id`,
      { id: req.params.id }
    )
    if (!item.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(item.recordset[0].board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { title, position, is_completed } = req.body
    const result = await query(
      `UPDATE dbo.checklist_items SET
         title = COALESCE(@title, title),
         position = COALESCE(@pos, position),
         is_completed = COALESCE(@done, is_completed)
       OUTPUT INSERTED.* WHERE id = @id`,
      {
        id: req.params.id,
        title: title ?? null,
        pos: position ?? null,
        done: typeof is_completed === 'boolean' ? is_completed : null,
      }
    )
    emitBoardChanged(item.recordset[0].board_id)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Update checklist error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const item = await query(
      `SELECT ci.*, t.board_id FROM dbo.checklist_items ci
       INNER JOIN dbo.tasks t ON t.id = ci.task_id WHERE ci.id = @id`,
      { id: req.params.id }
    )
    if (!item.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(item.recordset[0].board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    await query(`DELETE FROM dbo.checklist_items WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(item.recordset[0].board_id)
    res.status(204).end()
  } catch (err) {
    console.error('Delete checklist error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
