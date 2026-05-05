import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess } from '../utils/boardAccess.js'

const router = express.Router()
router.use(authMiddleware)

// Сводка по доске
router.get('/board/:id/summary', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const tasks = await query(
      `SELECT priority, is_archived, due_date, column_id, assigned_to, created_at
       FROM dbo.tasks WHERE board_id = @bid`,
      { bid: req.params.id }
    )
    const cols = await query(
      `SELECT c.id, c.title, c.position,
        (SELECT COUNT(*) FROM dbo.tasks t WHERE t.column_id = c.id AND t.is_archived = 0) AS active_count
       FROM dbo.columns c WHERE c.board_id = @bid ORDER BY c.position`,
      { bid: req.params.id }
    )
    const t = tasks.recordset
    const now = new Date()
    const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 }
    let overdue = 0
    let dueWeek = 0
    for (const x of t) {
      if (x.is_archived) continue
      if (x.priority && byPriority[x.priority] !== undefined) byPriority[x.priority]++
      if (x.due_date) {
        const d = new Date(x.due_date)
        if (d < now) overdue++
        else if ((d - now) / 86400000 <= 7) dueWeek++
      }
    }
    res.json({
      total: t.length,
      active: t.filter(x => !x.is_archived).length,
      archived: t.filter(x => x.is_archived).length,
      byPriority,
      overdue,
      dueWeek,
      columns: cols.recordset,
    })
  } catch (err) {
    console.error('Insights summary error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

// История действий
router.get('/board/:id/history', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const limit = Math.min(parseInt(req.query.limit) || 100, 500)
    const r = await query(
      `SELECT TOP(${limit}) a.*, u.email AS user_email, u.full_name AS user_full_name
       FROM dbo.activity_log a
       LEFT JOIN dbo.users u ON u.id = a.user_id
       WHERE a.board_id = @bid
       ORDER BY a.created_at DESC`,
      { bid: req.params.id }
    )
    res.json(r.recordset)
  } catch (err) {
    console.error('Insights history error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

// Исполнители + их задачи
router.get('/board/:id/assignees', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const r = await query(
      `SELECT u.id AS user_id, u.email, u.full_name,
        SUM(CASE WHEN t.is_archived = 0 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN t.is_archived = 1 THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN t.priority = 'urgent' AND t.is_archived = 0 THEN 1 ELSE 0 END) AS urgent,
        SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < SYSDATETIMEOFFSET() AND t.is_archived = 0 THEN 1 ELSE 0 END) AS overdue
       FROM dbo.tasks t
       INNER JOIN dbo.users u ON u.id = t.assigned_to
       WHERE t.board_id = @bid
       GROUP BY u.id, u.email, u.full_name
       ORDER BY active DESC`,
      { bid: req.params.id }
    )

    const tasks = await query(
      `SELECT id, title, priority, due_date, is_archived, assigned_to, column_id
       FROM dbo.tasks WHERE board_id = @bid AND assigned_to IS NOT NULL
       ORDER BY position`,
      { bid: req.params.id }
    )

    const tasksByUser = {}
    for (const task of tasks.recordset) {
      const uid = task.assigned_to
      if (!tasksByUser[uid]) tasksByUser[uid] = []
      tasksByUser[uid].push(task)
    }

    res.json({
      assignees: r.recordset.map(a => ({ ...a, tasks: tasksByUser[a.user_id] || [] })),
    })
  } catch (err) {
    console.error('Insights assignees error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
