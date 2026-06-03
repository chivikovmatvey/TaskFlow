import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess } from '../utils/boardAccess.js'
import { emitBoardChanged, emitToUser, getOnlineUserIds } from '../realtime.js'

const router = express.Router()
router.use(authMiddleware)

function normalizeUsername(u) {
  return String(u || '').trim().replace(/^@/, '').toLowerCase()
}
function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase()
}

async function findUserByIdentifier({ userId, username, email }) {
  if (userId) {
    const r = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: userId })
    return r.recordset[0] || null
  }
  if (username) {
    const r = await query(
      `SELECT * FROM dbo.users WHERE LOWER(username) = @u`,
      { u: normalizeUsername(username) }
    )
    return r.recordset[0] || null
  }
  if (email) {
    const r = await query(
      `SELECT * FROM dbo.users WHERE LOWER(email) = @e`,
      { e: normalizeEmail(email) }
    )
    return r.recordset[0] || null
  }
  return null
}

router.get('/', async (req, res) => {
  try {
    const { board_id } = req.query
    if (!board_id) return res.status(400).json({ error: 'board_id обязателен' })
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })

    const result = await query(
      `SELECT m.id, m.board_id, m.user_id, m.role, m.user_email, m.created_at,
              u.email, u.full_name, u.username, u.avatar_url, u.last_seen
       FROM dbo.board_members m
       INNER JOIN dbo.users u ON u.id = m.user_id
       WHERE m.board_id = @bid`,
      { bid: board_id }
    )
    const ownerRes = await query(
      `SELECT b.owner_id, u.email, u.full_name, u.username, u.avatar_url, u.last_seen
       FROM dbo.boards b
       INNER JOIN dbo.users u ON u.id = b.owner_id
       WHERE b.id = @bid`,
      { bid: board_id }
    )
    const online = getOnlineUserIds()
    const all = []
    const seen = new Set()
    if (ownerRes.recordset.length) {
      const o = ownerRes.recordset[0]
      seen.add(o.owner_id)
      all.push({
        id: `owner:${o.owner_id}`,
        board_id,
        user_id: o.owner_id,
        role: 'owner',
        user_email: o.email,
        online: online.has(o.owner_id),
        last_seen: o.last_seen,
        profiles: {
          email: o.email,
          full_name: o.full_name,
          username: o.username,
          avatar_url: o.avatar_url,
        },
      })
    }
    for (const m of result.recordset) {
      if (seen.has(m.user_id)) continue
      seen.add(m.user_id)
      all.push({
        id: m.id,
        board_id: m.board_id,
        user_id: m.user_id,
        role: m.role,
        user_email: m.user_email,
        created_at: m.created_at,
        online: online.has(m.user_id),
        last_seen: m.last_seen,
        profiles: {
          email: m.email,
          full_name: m.full_name,
          username: m.username,
          avatar_url: m.avatar_url,
        },
      })
    }
    res.json(all)
  } catch (err) {
    console.error('Get members error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { board_id, email, username, user_id, role } = req.body
    if (!board_id) return res.status(400).json({ error: 'board_id обязателен' })
    if (!email && !username && !user_id) {
      return res.status(400).json({ error: 'Укажите email, username или user_id' })
    }
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access?.canManageMembers) return res.status(403).json({ error: 'Только владелец может приглашать' })

    const user = await findUserByIdentifier({ userId: user_id, username, email })
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' })

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Вы не можете пригласить себя' })
    }

    const exists = await query(
      `SELECT id FROM dbo.board_members WHERE board_id = @bid AND user_id = @uid`,
      { bid: board_id, uid: user.id }
    )
    if (exists.recordset.length) {
      return res.status(409).json({ error: 'Пользователь уже является участником доски' })
    }

    const result = await query(
      `INSERT INTO dbo.board_members (board_id, user_id, user_email, role)
       OUTPUT INSERTED.*
       VALUES (@bid, @uid, @email, @role)`,
      { bid: board_id, uid: user.id, email: user.email, role: role || 'member' }
    )
    emitBoardChanged(board_id)
    emitToUser(user.id, 'dashboard:changed', { boardId: board_id })
    res.status(201).json({
      ...result.recordset[0],
      profiles: {
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        avatar_url: user.avatar_url,
      },
    })
  } catch (err) {
    console.error('Invite error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/invite-team', async (req, res) => {
  try {
    const { board_id, team_id, role, userIds } = req.body
    if (!board_id || !team_id) return res.status(400).json({ error: 'board_id и team_id обязательны' })
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access?.canManageMembers) return res.status(403).json({ error: 'Нет прав' })

    const inTeam = await query(
      `SELECT 1 FROM dbo.teams WHERE id = @tid AND owner_id = @uid
       UNION
       SELECT 1 FROM dbo.team_members WHERE team_id = @tid AND user_id = @uid`,
      { tid: team_id, uid: req.user.id }
    )
    if (!inTeam.recordset.length) return res.status(403).json({ error: 'Вы не в этой команде' })

    const usersRes = await query(
      `SELECT id, email, full_name, username, avatar_url FROM dbo.users WHERE id = (
         SELECT owner_id FROM dbo.teams WHERE id = @tid
       )
       UNION
       SELECT u.id, u.email, u.full_name, u.username, u.avatar_url
       FROM dbo.team_members tm INNER JOIN dbo.users u ON u.id = tm.user_id
       WHERE tm.team_id = @tid`,
      { tid: team_id }
    )

    let candidates = usersRes.recordset
    if (Array.isArray(userIds) && userIds.length) {
      const allowed = new Set(userIds.map((x) => String(x).toLowerCase()))
      candidates = candidates.filter((u) => allowed.has(String(u.id).toLowerCase()))
    }

    const added = []
    const skipped = []
    for (const user of candidates) {
      if (user.id === req.user.id) {
        skipped.push({ user, reason: 'self' })
        continue
      }
      const exists = await query(
        `SELECT id FROM dbo.board_members WHERE board_id = @bid AND user_id = @uid`,
        { bid: board_id, uid: user.id }
      )
      if (exists.recordset.length) {
        skipped.push({ user, reason: 'already_member' })
        continue
      }
      const ins = await query(
        `INSERT INTO dbo.board_members (board_id, user_id, user_email, role)
         OUTPUT INSERTED.*
         VALUES (@bid, @uid, @email, @role)`,
        { bid: board_id, uid: user.id, email: user.email, role: role || 'member' }
      )
      added.push({ ...ins.recordset[0], profiles: user })
      emitToUser(user.id, 'dashboard:changed', { boardId: board_id })
    }
    if (added.length) emitBoardChanged(board_id)
    res.status(201).json({ added, skipped })
  } catch (err) {
    console.error('invite-team:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const m = await query(
      `SELECT * FROM dbo.board_members WHERE id = @id`,
      { id: req.params.id }
    )
    if (!m.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const member = m.recordset[0]
    const access = await getBoardAccess(member.board_id, req.user.id)
    if (!access?.canManageMembers) return res.status(403).json({ error: 'Нет прав' })
    await query(`DELETE FROM dbo.board_members WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(member.board_id)
    emitToUser(member.user_id, 'board:access-revoked', { boardId: member.board_id })
    res.status(204).end()
  } catch (err) {
    console.error('Remove member error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { role } = req.body
    const m = await query(
      `SELECT * FROM dbo.board_members WHERE id = @id`,
      { id: req.params.id }
    )
    if (!m.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(m.recordset[0].board_id, req.user.id)
    if (!access?.canManageMembers) return res.status(403).json({ error: 'Нет прав' })
    const result = await query(
      `UPDATE dbo.board_members SET role = @role
       OUTPUT INSERTED.* WHERE id = @id`,
      { id: req.params.id, role }
    )
    emitBoardChanged(m.recordset[0].board_id)
    res.json(result.recordset[0])
  } catch (err) {
    console.error('Update role error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
