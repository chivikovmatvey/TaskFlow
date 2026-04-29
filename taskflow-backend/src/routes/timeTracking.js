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
      `SELECT tt.*, u.email AS user_email FROM dbo.time_tracking tt
       INNER JOIN dbo.users u ON u.id = tt.user_id
       WHERE tt.task_id = @tid ORDER BY tt.started_at DESC`,
      { tid: req.params.taskId }
    )
    const data = result.recordset.map((r) => ({
      ...r,
      user: { id: r.user_id, email: r.user_email },
    }))
    res.json(data)
  } catch (err) {
    console.error('Get time tracking error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/task/:taskId/start', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const active = await query(
      `SELECT id FROM dbo.time_tracking WHERE task_id = @tid AND user_id = @uid AND ended_at IS NULL`,
      { tid: req.params.taskId, uid: req.user.id }
    )
    if (active.recordset.length) {
      return res.status(409).json({ error: 'У вас уже запущен таймер для этой задачи' })
    }

    const result = await query(
      `INSERT INTO dbo.time_tracking (task_id, user_id, started_at)
       OUTPUT INSERTED.*
       VALUES (@tid, @uid, SYSDATETIMEOFFSET())`,
      { tid: req.params.taskId, uid: req.user.id }
    )
    emitBoardChanged(boardId)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Start timer error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/:id/stop', async (req, res) => {
  try {
    const tracking = await query(
      `SELECT tt.*, t.board_id FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks t ON t.id = tt.task_id WHERE tt.id = @id`,
      { id: req.params.id }
    )
    if (!tracking.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const tr = tracking.recordset[0]
    const result = await query(
      `UPDATE dbo.time_tracking SET
         ended_at = SYSDATETIMEOFFSET(),
         duration = DATEDIFF(SECOND, started_at, SYSDATETIMEOFFSET()),
         updated_at = SYSDATETIMEOFFSET()
       OUTPUT INSERTED.* WHERE id = @id`,
      { id: req.params.id }
    )
    emitBoardChanged(tr.board_id)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Stop timer error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/task/:taskId/manual', async (req, res) => {
  try {
    const { started_at, ended_at, duration, notes } = req.body
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Неверная длительность' })
    }
    const result = await query(
      `INSERT INTO dbo.time_tracking (task_id, user_id, started_at, ended_at, duration, notes)
       OUTPUT INSERTED.*
       VALUES (@tid, @uid, @start, @end, @dur, @notes)`,
      {
        tid: req.params.taskId,
        uid: req.user.id,
        start: started_at,
        end: ended_at,
        dur: duration,
        notes: notes || null,
      }
    )
    emitBoardChanged(boardId)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Manual entry error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const tr = await query(
      `SELECT tt.*, t.board_id FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks t ON t.id = tt.task_id WHERE tt.id = @id`,
      { id: req.params.id }
    )
    if (!tr.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const u = req.body
    const result = await query(
      `UPDATE dbo.time_tracking SET
         started_at = COALESCE(@start, started_at),
         ended_at = COALESCE(@end, ended_at),
         duration = COALESCE(@dur, duration),
         notes = COALESCE(@notes, notes),
         updated_at = SYSDATETIMEOFFSET()
       OUTPUT INSERTED.* WHERE id = @id`,
      {
        id: req.params.id,
        start: u.started_at ?? null,
        end: u.ended_at ?? null,
        dur: u.duration ?? null,
        notes: u.notes ?? null,
      }
    )
    emitBoardChanged(tr.recordset[0].board_id)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Update time error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const tr = await query(
      `SELECT tt.*, t.board_id FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks t ON t.id = tt.task_id WHERE tt.id = @id`,
      { id: req.params.id }
    )
    if (!tr.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    await query(`DELETE FROM dbo.time_tracking WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(tr.recordset[0].board_id)
    res.status(204).end()
  } catch (err) {
    console.error('Delete time error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
