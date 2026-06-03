import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess } from '../utils/boardAccess.js'

const router = express.Router()
router.use(authMiddleware)

function parseRange(req, defaultDays = 30) {
  const to = req.query.to ? new Date(req.query.to) : new Date()
  const from = req.query.from
    ? new Date(req.query.from)
    : new Date(to.getTime() - defaultDays * 86400000)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { from: new Date(Date.now() - defaultDays * 86400000), to: new Date() }
  }
  return { from, to }
}

function rangeDays(from, to) {
  return Math.max(1, Math.round((to - from) / 86400000) + 1)
}

const ACTIVITY_WEIGHTS = {
  'task.created': 3,
  'task.archived': 5,
  'task.moved': 1,
  'task.updated': 1,
  'task.assigned': 2,
  'comment.added': 2,
  'column.created': 2,
  'column.deleted': 2,
}

router.get('/board/:id/summary', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { from, to } = parseRange(req, 30)

    const tasks = await query(
      `SELECT priority, is_archived, due_date, column_id, assigned_to, created_at, archived_at
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
    let createdInRange = 0
    let closedInRange = 0
    for (const x of t) {
      if (!x.is_archived) {
        if (x.priority && byPriority[x.priority] !== undefined) byPriority[x.priority]++
        if (x.due_date) {
          const d = new Date(x.due_date)
          if (d < now) overdue++
          else if ((d - now) / 86400000 <= 7) dueWeek++
        }
      }
      if (x.created_at && new Date(x.created_at) >= from && new Date(x.created_at) <= to) createdInRange++
      if (x.archived_at && new Date(x.archived_at) >= from && new Date(x.archived_at) <= to) closedInRange++
    }

    const timeRes = await query(
      `SELECT ISNULL(SUM(tt.duration), 0) AS total_seconds
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to`,
      { bid: req.params.id, from, to }
    )

    res.json({
      total: t.length,
      active: t.filter(x => !x.is_archived).length,
      archived: t.filter(x => x.is_archived).length,
      byPriority,
      overdue,
      dueWeek,
      columns: cols.recordset,
      range: { from, to },
      createdInRange,
      closedInRange,
      totalHoursInRange: Math.round((timeRes.recordset[0].total_seconds || 0) / 36) / 100,
    })
  } catch (err) {
    console.error('Insights summary error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/users', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { from, to } = parseRange(req, 30)
    const bid = req.params.id

    const members = await query(
      `SELECT u.id AS user_id, u.email, u.full_name, u.username, u.avatar_url, u.last_seen
       FROM dbo.users u
       WHERE u.id = (SELECT owner_id FROM dbo.boards WHERE id = @bid)
          OR u.id IN (SELECT user_id FROM dbo.board_members WHERE board_id = @bid)`,
      { bid }
    )

    const actions = await query(
      `SELECT user_id, action, COUNT(*) AS cnt
       FROM dbo.activity_log
       WHERE board_id = @bid AND created_at >= @from AND created_at <= @to
       GROUP BY user_id, action`,
      { bid, from, to }
    )

    const hours = await query(
      `SELECT tt.user_id, ISNULL(SUM(tt.duration), 0) AS sec
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to
       GROUP BY tt.user_id`,
      { bid, from, to }
    )

    const wip = await query(
      `SELECT assigned_to AS user_id,
              COUNT(*) AS active,
              SUM(CASE WHEN due_date IS NOT NULL AND due_date < SYSDATETIMEOFFSET() THEN 1 ELSE 0 END) AS overdue,
              SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) AS urgent
       FROM dbo.tasks
       WHERE board_id = @bid AND is_archived = 0 AND assigned_to IS NOT NULL
       GROUP BY assigned_to`,
      { bid }
    )

    const totalDone = await query(
      `SELECT assigned_to AS user_id, COUNT(*) AS cnt
       FROM dbo.tasks
       WHERE board_id = @bid AND is_archived = 1 AND assigned_to IS NOT NULL
       GROUP BY assigned_to`,
      { bid }
    )

    const cycle = await query(
      `SELECT assigned_to AS user_id,
              AVG(CAST(DATEDIFF(MINUTE, created_at, archived_at) AS FLOAT)) AS avg_min
       FROM dbo.tasks
       WHERE board_id = @bid AND is_archived = 1
         AND archived_at >= @from AND archived_at <= @to
         AND assigned_to IS NOT NULL
       GROUP BY assigned_to`,
      { bid, from, to }
    )

    const byUser = {}
    for (const m of members.recordset) {
      byUser[m.user_id] = {
        user_id: m.user_id,
        email: m.email,
        full_name: m.full_name,
        username: m.username,
        avatar_url: m.avatar_url,
        last_seen: m.last_seen,
        created: 0,
        closed: 0,
        moved: 0,
        commented: 0,
        active: 0,
        overdue: 0,
        urgent: 0,
        done_total: 0,
        hours: 0,
        cycle_hours: null,
        activity_score: 0,
      }
    }
    for (const a of actions.recordset) {
      const u = byUser[a.user_id]
      if (!u) continue
      const w = ACTIVITY_WEIGHTS[a.action] || 0
      u.activity_score += w * a.cnt
      if (a.action === 'task.created') u.created += a.cnt
      else if (a.action === 'task.archived') u.closed += a.cnt
      else if (a.action === 'task.moved') u.moved += a.cnt
      else if (a.action === 'comment.added') u.commented += a.cnt
    }
    for (const h of hours.recordset) {
      if (byUser[h.user_id]) byUser[h.user_id].hours = Math.round((h.sec || 0) / 36) / 100
    }
    for (const w of wip.recordset) {
      if (byUser[w.user_id]) {
        byUser[w.user_id].active = w.active
        byUser[w.user_id].overdue = w.overdue
        byUser[w.user_id].urgent = w.urgent
      }
    }
    for (const d of totalDone.recordset) {
      if (byUser[d.user_id]) byUser[d.user_id].done_total = d.cnt
    }
    for (const c of cycle.recordset) {
      if (byUser[c.user_id] && c.avg_min != null) {
        byUser[c.user_id].cycle_hours = Math.round((c.avg_min / 60) * 10) / 10
      }
    }

    const users = Object.values(byUser).sort((a, b) => b.activity_score - a.activity_score)
    res.json({ range: { from, to }, users })
  } catch (err) {
    console.error('Insights users error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/user/:userId', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { from, to } = parseRange(req, 30)
    const bid = req.params.id
    const uid = req.params.userId

    const profile = await query(
      `SELECT id, email, full_name, username, avatar_url, last_seen
       FROM dbo.users WHERE id = @uid`,
      { uid }
    )
    if (!profile.recordset.length) return res.status(404).json({ error: 'Пользователь не найден' })

    const daily = await query(
      `SELECT CAST(created_at AS DATE) AS day, action, COUNT(*) AS cnt
       FROM dbo.activity_log
       WHERE board_id = @bid AND user_id = @uid
         AND created_at >= @from AND created_at <= @to
       GROUP BY CAST(created_at AS DATE), action
       ORDER BY day`,
      { bid, uid, from, to }
    )

    const dailyHours = await query(
      `SELECT CAST(tt.started_at AS DATE) AS day, ISNULL(SUM(tt.duration), 0) AS sec
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       WHERE tk.board_id = @bid AND tt.user_id = @uid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to
       GROUP BY CAST(tt.started_at AS DATE)
       ORDER BY day`,
      { bid, uid, from, to }
    )

    const wip = await query(
      `SELECT id, title, priority, due_date, column_id
       FROM dbo.tasks
       WHERE board_id = @bid AND is_archived = 0 AND assigned_to = @uid
       ORDER BY due_date`,
      { bid, uid }
    )

    res.json({
      profile: profile.recordset[0],
      range: { from, to },
      daily: daily.recordset,
      dailyHours: dailyHours.recordset.map(d => ({
        day: d.day,
        hours: Math.round((d.sec || 0) / 36) / 100,
      })),
      wip: wip.recordset,
    })
  } catch (err) {
    console.error('Insights user error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/timeseries', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { from, to } = parseRange(req, 30)
    const bid = req.params.id

    const created = await query(
      `SELECT CAST(created_at AS DATE) AS day, COUNT(*) AS cnt
       FROM dbo.tasks
       WHERE board_id = @bid AND created_at >= @from AND created_at <= @to
       GROUP BY CAST(created_at AS DATE)`,
      { bid, from, to }
    )
    const closed = await query(
      `SELECT CAST(archived_at AS DATE) AS day, COUNT(*) AS cnt
       FROM dbo.tasks
       WHERE board_id = @bid AND is_archived = 1 AND archived_at IS NOT NULL
         AND archived_at >= @from AND archived_at <= @to
       GROUP BY CAST(archived_at AS DATE)`,
      { bid, from, to }
    )

    const allTasks = await query(
      `SELECT created_at, archived_at, is_archived
       FROM dbo.tasks
       WHERE board_id = @bid`,
      { bid }
    )

    const ymd = (v) => {
      if (!v) return ''
      const d = v instanceof Date ? v : new Date(v)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    }

    const days = []
    const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
    const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
    while (cur <= last) {
      days.push(new Date(cur))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }

    const createdMap = new Map(created.recordset.map(r => [ymd(r.day), r.cnt]))
    const closedMap = new Map(closed.recordset.map(r => [ymd(r.day), r.cnt]))

    const result = days.map(d => {
      const key = ymd(d)
      const dayEnd = new Date(d)
      dayEnd.setUTCHours(23, 59, 59, 999)
      let active = 0
      for (const t of allTasks.recordset) {
        const c = t.created_at ? new Date(t.created_at) : null
        const a = t.archived_at ? new Date(t.archived_at) : null
        if (c && c <= dayEnd) {
          if (!a || a > dayEnd) active++
        }
      }
      return {
        day: key,
        created: createdMap.get(key) || 0,
        closed: closedMap.get(key) || 0,
        active,
      }
    })

    res.json({ range: { from, to }, series: result })
  } catch (err) {
    console.error('Insights timeseries error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/cfd', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { from, to } = parseRange(req, 30)
    const bid = req.params.id

    const cols = await query(
      `SELECT id, title, position FROM dbo.columns WHERE board_id = @bid ORDER BY position`,
      { bid }
    )

    const tasks = await query(
      `SELECT id, column_id, created_at, archived_at, is_archived
       FROM dbo.tasks WHERE board_id = @bid`,
      { bid }
    )

    const moves = await query(
      `SELECT entity_id, details, created_at
       FROM dbo.activity_log
       WHERE board_id = @bid AND action = 'task.moved'
       ORDER BY created_at ASC`,
      { bid }
    )

    const history = new Map()
    for (const t of tasks.recordset) {
      history.set(t.id, [{ at: t.created_at, column_id: t.column_id }])
    }
    for (const m of moves.recordset) {
      try {
        const d = m.details ? JSON.parse(m.details) : null
        if (d && d.column_id && history.has(m.entity_id)) {
          history.get(m.entity_id).push({ at: m.created_at, column_id: d.column_id })
        }
      } catch { }
    }

    function columnAt(taskId, atDate, task) {
      if (task.is_archived && task.archived_at && new Date(task.archived_at) <= atDate) return null
      const h = history.get(taskId) || []
      let col = null
      for (const ev of h) {
        if (new Date(ev.at) <= atDate) col = ev.column_id
      }
      return col || task.column_id
    }

    const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

    const days = []
    const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
    const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
    while (cur <= last) {
      days.push(new Date(cur))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }

    const series = days.map(d => {
      const end = new Date(d); end.setUTCHours(23, 59, 59, 999)
      const counts = {}
      for (const c of cols.recordset) counts[c.id] = 0
      for (const t of tasks.recordset) {
        const c = t.created_at ? new Date(t.created_at) : null
        if (!c || c > end) continue
        const col = columnAt(t.id, end, t)
        if (col && counts[col] !== undefined) counts[col]++
      }
      const row = { day: ymd(d) }
      for (const c of cols.recordset) row[c.title] = counts[c.id]
      return row
    })

    res.json({ range: { from, to }, columns: cols.recordset.map(c => c.title), series })
  } catch (err) {
    console.error('Insights cfd error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/time-summary', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { from, to } = parseRange(req, 30)
    const bid = req.params.id

    const byPriority = await query(
      `SELECT tk.priority, ISNULL(SUM(tt.duration), 0) AS sec
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to
       GROUP BY tk.priority`,
      { bid, from, to }
    )

    const byColumn = await query(
      `SELECT c.title, ISNULL(SUM(tt.duration), 0) AS sec
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       INNER JOIN dbo.columns c ON c.id = tk.column_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to
       GROUP BY c.title`,
      { bid, from, to }
    )

    const byUser = await query(
      `SELECT u.id AS user_id, u.email, u.full_name, u.username, u.avatar_url,
              ISNULL(SUM(tt.duration), 0) AS sec
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       INNER JOIN dbo.users u ON u.id = tt.user_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to
       GROUP BY u.id, u.email, u.full_name, u.username, u.avatar_url
       ORDER BY sec DESC`,
      { bid, from, to }
    )

    const byTask = await query(
      `SELECT TOP 20 tk.id, tk.title, tk.priority,
              ISNULL(SUM(tt.duration), 0) AS sec
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to
       GROUP BY tk.id, tk.title, tk.priority
       ORDER BY sec DESC`,
      { bid, from, to }
    )

    const byLabel = await query(
      `SELECT l.name, l.color, ISNULL(SUM(tt.duration), 0) AS sec
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       INNER JOIN dbo.task_labels tl ON tl.task_id = tk.id
       INNER JOIN dbo.labels l ON l.id = tl.label_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
         AND tt.started_at >= @from AND tt.started_at <= @to
       GROUP BY l.name, l.color
       ORDER BY sec DESC`,
      { bid, from, to }
    )

    const toHours = (sec) => Math.round((sec || 0) / 36) / 100

    res.json({
      range: { from, to },
      byPriority: byPriority.recordset.map(r => ({ priority: r.priority, hours: toHours(r.sec) })),
      byColumn: byColumn.recordset.map(r => ({ column: r.title, hours: toHours(r.sec) })),
      byUser: byUser.recordset.map(r => ({
        user_id: r.user_id,
        email: r.email,
        full_name: r.full_name,
        username: r.username,
        avatar_url: r.avatar_url,
        hours: toHours(r.sec),
      })),
      byTask: byTask.recordset.map(r => ({
        task_id: r.id, title: r.title, priority: r.priority, hours: toHours(r.sec),
      })),
      byLabel: byLabel.recordset.map(r => ({ name: r.name, color: r.color, hours: toHours(r.sec) })),
    })
  } catch (err) {
    console.error('Insights time-summary error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/active-sessions', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const bid = req.params.id

    const r = await query(
      `SELECT tt.id, tt.started_at, tt.task_id,
              tk.title AS task_title, tk.priority,
              u.id AS user_id, u.email, u.full_name, u.username, u.avatar_url
       FROM dbo.time_tracking tt
       INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
       INNER JOIN dbo.users u ON u.id = tt.user_id
       WHERE tk.board_id = @bid AND tt.ended_at IS NULL
       ORDER BY tt.started_at`,
      { bid }
    )
    res.json({ sessions: r.recordset })
  } catch (err) {
    console.error('Insights active-sessions error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/heatmap', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const { from, to } = parseRange(req, 90)
    const bid = req.params.id
    const userId = req.query.userId || null

    const r = await query(
      `SELECT DATEPART(WEEKDAY, created_at) AS dow,
              DATEPART(HOUR, created_at) AS hr,
              COUNT(*) AS cnt
       FROM dbo.activity_log
       WHERE board_id = @bid
         AND created_at >= @from AND created_at <= @to
         AND (@uid IS NULL OR user_id = @uid)
       GROUP BY DATEPART(WEEKDAY, created_at), DATEPART(HOUR, created_at)`,
      { bid, from, to, uid: userId }
    )

    const calendar = await query(
      `SELECT CAST(created_at AS DATE) AS day, COUNT(*) AS cnt
       FROM dbo.activity_log
       WHERE board_id = @bid
         AND created_at >= @from AND created_at <= @to
         AND (@uid IS NULL OR user_id = @uid)
       GROUP BY CAST(created_at AS DATE)
       ORDER BY day`,
      { bid, from, to, uid: userId }
    )

    res.json({
      range: { from, to },
      grid: r.recordset,
      calendar: calendar.recordset.map(c => ({ day: c.day, count: c.cnt })),
    })
  } catch (err) {
    console.error('Insights heatmap error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/tasks-detailed', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const bid = req.params.id

    const r = await query(
      `SELECT t.id, t.title, t.priority, t.created_at, t.archived_at, t.is_archived,
              t.due_date, t.column_id, c.title AS column_title,
              t.created_by, t.assigned_to,
              uc.email AS created_email, uc.full_name AS created_full_name, uc.avatar_url AS created_avatar,
              ua.email AS assigned_email, ua.full_name AS assigned_full_name, ua.avatar_url AS assigned_avatar,
              (SELECT ISNULL(SUM(duration), 0) FROM dbo.time_tracking tt
                 WHERE tt.task_id = t.id AND tt.ended_at IS NOT NULL) AS total_sec,
              (SELECT COUNT(*) FROM dbo.comments cm WHERE cm.task_id = t.id) AS comment_count,
              (SELECT COUNT(*) FROM dbo.checklist_items ci WHERE ci.task_id = t.id) AS checklist_total,
              (SELECT COUNT(*) FROM dbo.checklist_items ci WHERE ci.task_id = t.id AND ci.is_completed = 1) AS checklist_done
       FROM dbo.tasks t
       LEFT JOIN dbo.columns c ON c.id = t.column_id
       LEFT JOIN dbo.users uc ON uc.id = t.created_by
       LEFT JOIN dbo.users ua ON ua.id = t.assigned_to
       WHERE t.board_id = @bid
       ORDER BY t.created_at DESC`,
      { bid }
    )

    const tasks = r.recordset.map(t => {
      const days_open = t.archived_at
        ? Math.max(0, Math.round((new Date(t.archived_at) - new Date(t.created_at)) / 86400000))
        : Math.max(0, Math.round((Date.now() - new Date(t.created_at).getTime()) / 86400000))
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        column: t.column_title,
        is_archived: t.is_archived,
        created_at: t.created_at,
        archived_at: t.archived_at,
        due_date: t.due_date,
        days_open,
        hours: Math.round((t.total_sec || 0) / 36) / 100,
        comments: t.comment_count,
        checklist: t.checklist_total > 0 ? `${t.checklist_done}/${t.checklist_total}` : '',
        creator: t.created_by ? {
          id: t.created_by, email: t.created_email,
          full_name: t.created_full_name, avatar_url: t.created_avatar,
        } : null,
        assignee: t.assigned_to ? {
          id: t.assigned_to, email: t.assigned_email,
          full_name: t.assigned_full_name, avatar_url: t.assigned_avatar,
        } : null,
      }
    })
    res.json({ tasks })
  } catch (err) {
    console.error('Insights tasks-detailed error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/history', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const bid = req.params.id
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000)
    const userId = req.query.userId || null
    const action = req.query.action || null
    const search = req.query.search ? `%${req.query.search}%` : null
    const { from, to } = parseRange(req, 60)

    const r = await query(
      `SELECT TOP(${limit}) a.*, u.email AS user_email, u.full_name AS user_full_name,
              u.username AS user_username, u.avatar_url AS user_avatar_url
       FROM dbo.activity_log a
       LEFT JOIN dbo.users u ON u.id = a.user_id
       WHERE a.board_id = @bid
         AND a.created_at >= @from AND a.created_at <= @to
         AND (@uid IS NULL OR a.user_id = @uid)
         AND (@act IS NULL OR a.action = @act)
         AND (@s IS NULL OR a.title LIKE @s)
       ORDER BY a.created_at DESC`,
      { bid, from, to, uid: userId, act: action, s: search }
    )
    res.json(r.recordset)
  } catch (err) {
    console.error('Insights history error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/compare', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const bid = req.params.id

    const p1from = req.query.p1from ? new Date(req.query.p1from) : new Date(Date.now() - 30 * 86400000)
    const p1to = req.query.p1to ? new Date(req.query.p1to) : new Date()
    const p2from = req.query.p2from ? new Date(req.query.p2from) : new Date(p1from.getTime() - 30 * 86400000)
    const p2to = req.query.p2to ? new Date(req.query.p2to) : new Date(p1from.getTime() - 1)

    async function periodStats(from, to) {
      const created = await query(
        `SELECT COUNT(*) AS cnt FROM dbo.tasks
         WHERE board_id = @bid AND created_at >= @from AND created_at <= @to`,
        { bid, from, to }
      )
      const closed = await query(
        `SELECT COUNT(*) AS cnt FROM dbo.tasks
         WHERE board_id = @bid AND is_archived = 1 AND archived_at >= @from AND archived_at <= @to`,
        { bid, from, to }
      )
      const hours = await query(
        `SELECT ISNULL(SUM(tt.duration), 0) AS sec
         FROM dbo.time_tracking tt
         INNER JOIN dbo.tasks tk ON tk.id = tt.task_id
         WHERE tk.board_id = @bid AND tt.ended_at IS NOT NULL
           AND tt.started_at >= @from AND tt.started_at <= @to`,
        { bid, from, to }
      )
      const events = await query(
        `SELECT COUNT(*) AS cnt FROM dbo.activity_log
         WHERE board_id = @bid AND created_at >= @from AND created_at <= @to`,
        { bid, from, to }
      )
      const activeUsers = await query(
        `SELECT COUNT(DISTINCT user_id) AS cnt FROM dbo.activity_log
         WHERE board_id = @bid AND created_at >= @from AND created_at <= @to AND user_id IS NOT NULL`,
        { bid, from, to }
      )
      return {
        from, to,
        created: created.recordset[0].cnt,
        closed: closed.recordset[0].cnt,
        hours: Math.round((hours.recordset[0].sec || 0) / 36) / 100,
        events: events.recordset[0].cnt,
        activeUsers: activeUsers.recordset[0].cnt,
      }
    }

    const p1 = await periodStats(p1from, p1to)
    const p2 = await periodStats(p2from, p2to)
    res.json({ period1: p1, period2: p2 })
  } catch (err) {
    console.error('Insights compare error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/board/:id/assignees', async (req, res) => {
  try {
    const access = await getBoardAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const r = await query(
      `SELECT u.id AS user_id, u.email, u.full_name, u.avatar_url,
        SUM(CASE WHEN t.is_archived = 0 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN t.is_archived = 1 THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN t.priority = 'urgent' AND t.is_archived = 0 THEN 1 ELSE 0 END) AS urgent,
        SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < SYSDATETIMEOFFSET() AND t.is_archived = 0 THEN 1 ELSE 0 END) AS overdue
       FROM dbo.tasks t
       INNER JOIN dbo.users u ON u.id = t.assigned_to
       WHERE t.board_id = @bid
       GROUP BY u.id, u.email, u.full_name, u.avatar_url
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
