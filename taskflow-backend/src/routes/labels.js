import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess, getTaskBoardId } from '../utils/boardAccess.js'
import { emitBoardChanged } from '../realtime.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const { board_id } = req.query
    if (!board_id) return res.status(400).json({ error: 'board_id обязателен' })
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT * FROM dbo.labels WHERE board_id = @bid ORDER BY name`,
      { bid: board_id }
    )
    res.json(result.recordset)
  } catch (err) {
    console.error('Get labels error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { board_id, name, color } = req.body
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `INSERT INTO dbo.labels (board_id, name, color)
       OUTPUT INSERTED.*
       VALUES (@bid, @name, @color)`,
      { bid: board_id, name, color }
    )
    emitBoardChanged(board_id)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Create label error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const l = await query(`SELECT board_id FROM dbo.labels WHERE id = @id`, { id: req.params.id })
    if (!l.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(l.recordset[0].board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { name, color } = req.body
    const result = await query(
      `UPDATE dbo.labels SET
         name = COALESCE(@name, name),
         color = COALESCE(@color, color)
       OUTPUT INSERTED.* WHERE id = @id`,
      { id: req.params.id, name: name ?? null, color: color ?? null }
    )
    emitBoardChanged(l.recordset[0].board_id)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Update label error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const l = await query(`SELECT board_id FROM dbo.labels WHERE id = @id`, { id: req.params.id })
    if (!l.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(l.recordset[0].board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    await query(`DELETE FROM dbo.task_labels WHERE label_id = @id`, { id: req.params.id })
    await query(`DELETE FROM dbo.labels WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(l.recordset[0].board_id)
    res.status(204).end()
  } catch (err) {
    console.error('Delete label error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/task/:taskId', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT l.* FROM dbo.task_labels tl
       INNER JOIN dbo.labels l ON l.id = tl.label_id
       WHERE tl.task_id = @tid`,
      { tid: req.params.taskId }
    )
    res.json(result.recordset)
  } catch (err) {
    console.error('Get task labels error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/task/:taskId', async (req, res) => {
  try {
    const { label_id } = req.body
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `INSERT INTO dbo.task_labels (task_id, label_id)
       OUTPUT INSERTED.*
       VALUES (@tid, @lid)`,
      { tid: req.params.taskId, lid: label_id }
    )
    emitBoardChanged(boardId)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Add task label error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/task/:taskId/:labelId', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    await query(
      `DELETE FROM dbo.task_labels WHERE task_id = @tid AND label_id = @lid`,
      { tid: req.params.taskId, lid: req.params.labelId }
    )
    emitBoardChanged(boardId)
    res.status(204).end()
  } catch (err) {
    console.error('Remove task label error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
