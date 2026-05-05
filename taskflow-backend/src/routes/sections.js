import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { emitToUser } from '../realtime.js'

const router = express.Router()
router.use(authMiddleware)

async function getSectionAccess(sectionId, userId) {
  const r = await query(
    `SELECT s.owner_id, sm.role
     FROM dbo.sections s
     LEFT JOIN dbo.section_members sm ON sm.section_id = s.id AND sm.user_id = @userId
     WHERE s.id = @sid`,
    { sid: sectionId, userId }
  )
  if (!r.recordset.length) return null
  const row = r.recordset[0]
  const isOwner = row.owner_id === userId
  if (!isOwner && !row.role) return null
  return {
    isOwner,
    role: isOwner ? 'owner' : row.role,
    canManage: isOwner || row.role === 'admin',
  }
}

// Список разделов пользователя
router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT DISTINCT s.*,
        (SELECT COUNT(*) FROM dbo.boards WHERE section_id = s.id) AS board_count
       FROM dbo.sections s
       LEFT JOIN dbo.section_members sm ON sm.section_id = s.id
       WHERE s.owner_id = @uid OR sm.user_id = @uid
       ORDER BY s.created_at DESC`,
      { uid: req.user.id }
    )
    res.json(r.recordset)
  } catch (err) {
    console.error('Get sections error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body
    if (!name) return res.status(400).json({ error: 'Имя обязательно' })
    const r = await query(
      `INSERT INTO dbo.sections (name, description, color, owner_id)
       OUTPUT INSERTED.*
       VALUES (@name, @description, @color, @uid)`,
      {
        name,
        description: description || null,
        color: color || '#cc785c',
        uid: req.user.id,
      }
    )
    res.status(201).json(r.recordset[0])
  } catch (err) {
    console.error('Create section error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const access = await getSectionAccess(req.params.id, req.user.id)
    if (!access?.canManage) return res.status(403).json({ error: 'Нет прав' })
    const { name, description, color } = req.body
    const r = await query(
      `UPDATE dbo.sections SET
         name = COALESCE(@name, name),
         description = COALESCE(@description, description),
         color = COALESCE(@color, color),
         updated_at = SYSDATETIMEOFFSET()
       OUTPUT INSERTED.* WHERE id = @id`,
      {
        id: req.params.id,
        name: name ?? null,
        description: description ?? null,
        color: color ?? null,
      }
    )
    res.json(r.recordset[0])
  } catch (err) {
    console.error('Update section error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const access = await getSectionAccess(req.params.id, req.user.id)
    if (!access?.isOwner) return res.status(403).json({ error: 'Только владелец может удалять' })
    // Boards удалять не нужно — просто отвязываем
    await query(`UPDATE dbo.boards SET section_id = NULL WHERE section_id = @id`, { id: req.params.id })
    await query(`DELETE FROM dbo.sections WHERE id = @id`, { id: req.params.id })
    res.status(204).end()
  } catch (err) {
    console.error('Delete section error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

// Участники раздела
router.get('/:id/members', async (req, res) => {
  try {
    const access = await getSectionAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const r = await query(
      `SELECT sm.*, u.email, u.full_name FROM dbo.section_members sm
       INNER JOIN dbo.users u ON u.id = sm.user_id
       WHERE sm.section_id = @sid`,
      { sid: req.params.id }
    )
    res.json(r.recordset)
  } catch (err) {
    console.error('Get section members error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/:id/members', async (req, res) => {
  try {
    const access = await getSectionAccess(req.params.id, req.user.id)
    if (!access?.isOwner) return res.status(403).json({ error: 'Только владелец' })
    const { email, role } = req.body
    if (!email) return res.status(400).json({ error: 'Email обязателен' })
    const u = await query(`SELECT id FROM dbo.users WHERE email = @email`, { email })
    if (!u.recordset.length) return res.status(404).json({ error: 'Пользователь не найден' })
    const userId = u.recordset[0].id
    const exists = await query(
      `SELECT id FROM dbo.section_members WHERE section_id = @sid AND user_id = @uid`,
      { sid: req.params.id, uid: userId }
    )
    if (exists.recordset.length) return res.status(409).json({ error: 'Уже участник раздела' })
    const r = await query(
      `INSERT INTO dbo.section_members (section_id, user_id, user_email, role)
       OUTPUT INSERTED.*
       VALUES (@sid, @uid, @email, @role)`,
      { sid: req.params.id, uid: userId, email, role: role || 'viewer' }
    )
    emitToUser(userId, 'dashboard:changed', { sectionId: req.params.id })
    res.status(201).json(r.recordset[0])
  } catch (err) {
    console.error('Add section member error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/:id/members/:memberId', async (req, res) => {
  try {
    const access = await getSectionAccess(req.params.id, req.user.id)
    if (!access?.isOwner) return res.status(403).json({ error: 'Только владелец' })
    const r = await query(
      `UPDATE dbo.section_members SET role = @role
       OUTPUT INSERTED.* WHERE id = @mid AND section_id = @sid`,
      { mid: req.params.memberId, sid: req.params.id, role: req.body.role }
    )
    res.json(r.recordset[0])
  } catch (err) {
    console.error('Update section member error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const access = await getSectionAccess(req.params.id, req.user.id)
    if (!access?.isOwner) return res.status(403).json({ error: 'Только владелец' })
    await query(
      `DELETE FROM dbo.section_members WHERE id = @mid AND section_id = @sid`,
      { mid: req.params.memberId, sid: req.params.id }
    )
    res.status(204).end()
  } catch (err) {
    console.error('Remove section member error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

// Доски в разделе
router.get('/:id/boards', async (req, res) => {
  try {
    const access = await getSectionAccess(req.params.id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const r = await query(
      `SELECT * FROM dbo.boards WHERE section_id = @sid ORDER BY created_at DESC`,
      { sid: req.params.id }
    )
    res.json(r.recordset)
  } catch (err) {
    console.error('Get section boards error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
