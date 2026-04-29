import express from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess } from '../utils/boardAccess.js'
import { emitBoardChanged, emitToUser } from '../realtime.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const { board_id } = req.query
    if (!board_id) return res.status(400).json({ error: 'board_id обязателен' })
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT m.*, u.email, u.full_name FROM dbo.board_members m
       INNER JOIN dbo.users u ON u.id = m.user_id
       WHERE m.board_id = @bid`,
      { bid: board_id }
    )
    const members = result.recordset.map((m) => ({
      ...m,
      profiles: { email: m.email, full_name: m.full_name },
    }))
    res.json(members)
  } catch (err) {
    console.error('Get members error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { board_id, email, role } = req.body
    if (!board_id || !email) return res.status(400).json({ error: 'board_id и email обязательны' })
    const access = await getBoardAccess(board_id, req.user.id)
    if (!access?.canManageMembers) return res.status(403).json({ error: 'Только владелец может приглашать' })

    if (req.user.email === email) {
      return res.status(400).json({ error: 'Вы не можете пригласить себя' })
    }

    const userResult = await query(
      `SELECT id FROM dbo.users WHERE email = @email`,
      { email }
    )
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' })
    }
    const userId = userResult.recordset[0].id

    const exists = await query(
      `SELECT id FROM dbo.board_members WHERE board_id = @bid AND user_id = @uid`,
      { bid: board_id, uid: userId }
    )
    if (exists.recordset.length) {
      return res.status(409).json({ error: 'Пользователь уже является участником доски' })
    }

    const result = await query(
      `INSERT INTO dbo.board_members (board_id, user_id, user_email, role)
       OUTPUT INSERTED.*
       VALUES (@bid, @uid, @email, @role)`,
      { bid: board_id, uid: userId, email, role: role || 'viewer' }
    )
    emitBoardChanged(board_id)
    emitToUser(userId, 'dashboard:changed', { boardId: board_id })
    res.status(201).json({ ...result.recordset[0], profiles: { email, full_name: null } })
  } catch (err) {
    console.error('Invite error:', err)
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
