import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()
router.use(authMiddleware)

function normalizeUsername(u) {
  return String(u || '').trim().replace(/^@/, '').toLowerCase()
}

async function getTeamWithMembers(teamId) {
  const t = await query(
    `SELECT t.*, u.email AS owner_email, u.username AS owner_username, u.full_name AS owner_name
     FROM dbo.teams t INNER JOIN dbo.users u ON u.id = t.owner_id
     WHERE t.id = @id`,
    { id: teamId }
  )
  if (!t.recordset.length) return null
  const team = t.recordset[0]
  const m = await query(
    `SELECT tm.id, tm.role, tm.created_at, u.id AS user_id, u.email, u.username, u.full_name, u.avatar_url
     FROM dbo.team_members tm
     INNER JOIN dbo.users u ON u.id = tm.user_id
     WHERE tm.team_id = @id
     ORDER BY tm.created_at`,
    { id: teamId }
  )
  return { ...team, members: m.recordset }
}

async function isTeamOwner(teamId, userId) {
  const r = await query(
    `SELECT 1 FROM dbo.teams WHERE id = @id AND owner_id = @uid`,
    { id: teamId, uid: userId }
  )
  return r.recordset.length > 0
}

async function isTeamMember(teamId, userId) {
  const r = await query(
    `SELECT 1 FROM dbo.teams WHERE id = @id AND owner_id = @uid
     UNION
     SELECT 1 FROM dbo.team_members WHERE team_id = @id AND user_id = @uid`,
    { id: teamId, uid: userId }
  )
  return r.recordset.length > 0
}

router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT DISTINCT t.*,
              (SELECT COUNT(*) FROM dbo.team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM dbo.teams t
       LEFT JOIN dbo.team_members tm ON tm.team_id = t.id
       WHERE t.owner_id = @uid OR tm.user_id = @uid
       ORDER BY t.created_at DESC`,
      { uid: req.user.id }
    )
    res.json(r.recordset)
  } catch (err) {
    console.error('teams list:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (!(await isTeamMember(req.params.id, req.user.id))) {
      return res.status(403).json({ error: 'Нет доступа' })
    }
    const team = await getTeamWithMembers(req.params.id)
    if (!team) return res.status(404).json({ error: 'Команда не найдена' })
    res.json(team)
  } catch (err) {
    console.error('team get:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, color, memberIds } = req.body
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Название обязательно' })
    }
    const r = await query(
      `INSERT INTO dbo.teams (name, description, color, owner_id)
       OUTPUT INSERTED.*
       VALUES (@name, @desc, @color, @uid)`,
      {
        name: String(name).trim(),
        desc: description || null,
        color: color || '#f97316',
        uid: req.user.id,
      }
    )
    const team = r.recordset[0]

    if (Array.isArray(memberIds) && memberIds.length) {
      for (const mid of memberIds) {
        if (!mid || mid === req.user.id) continue
        try {
          await query(
            `INSERT INTO dbo.team_members (team_id, user_id, role) VALUES (@tid, @uid, 'member')`,
            { tid: team.id, uid: mid }
          )
        } catch (e) {
          console.warn('team member add (create) skip:', e.message)
        }
      }
    }

    const full = await getTeamWithMembers(team.id)
    res.status(201).json(full || team)
  } catch (err) {
    console.error('team create:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    if (!(await isTeamOwner(req.params.id, req.user.id))) {
      return res.status(403).json({ error: 'Только владелец может редактировать' })
    }
    const { name, description, color } = req.body
    const r = await query(
      `UPDATE dbo.teams SET
         name = COALESCE(@name, name),
         description = COALESCE(@desc, description),
         color = COALESCE(@color, color),
         updated_at = SYSDATETIMEOFFSET()
       OUTPUT INSERTED.*
       WHERE id = @id`,
      {
        id: req.params.id,
        name: name?.trim() || null,
        desc: description !== undefined ? description : null,
        color: color || null,
      }
    )
    res.json(r.recordset[0])
  } catch (err) {
    console.error('team update:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!(await isTeamOwner(req.params.id, req.user.id))) {
      return res.status(403).json({ error: 'Только владелец может удалить' })
    }
    await query(`DELETE FROM dbo.teams WHERE id = @id`, { id: req.params.id })
    res.status(204).end()
  } catch (err) {
    console.error('team delete:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/:id/members', async (req, res) => {
  try {
    if (!(await isTeamOwner(req.params.id, req.user.id))) {
      return res.status(403).json({ error: 'Только владелец может добавлять' })
    }
    const { username, email, userId } = req.body
    let user = null
    if (userId) {
      const r = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: userId })
      user = r.recordset[0]
    } else if (username) {
      const u = normalizeUsername(username)
      const r = await query(`SELECT * FROM dbo.users WHERE LOWER(username) = @u`, { u })
      user = r.recordset[0]
    } else if (email) {
      const r = await query(
        `SELECT * FROM dbo.users WHERE LOWER(email) = LOWER(@email)`,
        { email: String(email).trim() }
      )
      user = r.recordset[0]
    }
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Вы уже владелец команды' })
    }
    const exists = await query(
      `SELECT id FROM dbo.team_members WHERE team_id = @tid AND user_id = @uid`,
      { tid: req.params.id, uid: user.id }
    )
    if (exists.recordset.length) {
      return res.status(409).json({ error: 'Пользователь уже в команде' })
    }
    await query(
      `INSERT INTO dbo.team_members (team_id, user_id, role) VALUES (@tid, @uid, 'member')`,
      { tid: req.params.id, uid: user.id }
    )
    const team = await getTeamWithMembers(req.params.id)
    res.status(201).json(team)
  } catch (err) {
    console.error('team member add:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const isOwner = await isTeamOwner(req.params.id, req.user.id)
    const m = await query(
      `SELECT * FROM dbo.team_members WHERE id = @id AND team_id = @tid`,
      { id: req.params.memberId, tid: req.params.id }
    )
    if (!m.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const member = m.recordset[0]
    if (!isOwner && member.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет прав' })
    }
    await query(`DELETE FROM dbo.team_members WHERE id = @id`, { id: req.params.memberId })
    res.status(204).end()
  } catch (err) {
    console.error('team member delete:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
