import express from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

async function adminGuard(req, res, next) {
  try {
    const r = await query(`SELECT is_admin FROM dbo.users WHERE id = @id`, { id: req.user.id })
    if (!r.recordset.length || !r.recordset[0].is_admin) {
      return res.status(403).json({ error: 'Доступ запрещён' })
    }
    next()
  } catch (err) {
    console.error('adminGuard:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
}
router.use(adminGuard)

function pickUser(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    username: u.username,
    avatar_url: u.avatar_url,
    email_verified: !!u.email_verified,
    auth_provider: u.auth_provider,
    is_admin: !!u.is_admin,
    has_password: !!u.password_hash,
    google_id: u.google_id,
    yandex_id: u.yandex_id,
    telegram_chat_id: u.telegram_chat_id ? String(u.telegram_chat_id) : null,
    telegram_username: u.telegram_username,
    created_at: u.created_at,
  }
}

router.get('/users', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const sql = q
      ? `SELECT * FROM dbo.users
         WHERE LOWER(email) LIKE @q OR LOWER(username) LIKE @q OR LOWER(full_name) LIKE @q
         ORDER BY created_at DESC`
      : `SELECT * FROM dbo.users ORDER BY created_at DESC`
    const r = await query(sql, q ? { q: `%${q}%` } : {})
    res.json({ users: r.recordset.map(pickUser) })
  } catch (err) {
    console.error('admin/users:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const allowed = ['email', 'full_name', 'username', 'email_verified', 'is_admin']
    const updates = []
    const params = { id }
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        let v = req.body[k]
        if (k === 'email' && v) v = String(v).trim().toLowerCase()
        if (k === 'username' && v) v = String(v).trim().replace(/^@/, '').toLowerCase()
        if (k === 'email_verified' || k === 'is_admin') v = v ? 1 : 0
        updates.push(`${k} = @${k}`)
        params[k] = v
      }
    }
    if (req.body.password) {
      const hash = await bcrypt.hash(String(req.body.password), 10)
      updates.push(`password_hash = @password_hash`)
      params.password_hash = hash
    }
    if (!updates.length) return res.status(400).json({ error: 'Нет полей для обновления' })

    await query(`UPDATE dbo.users SET ${updates.join(', ')} WHERE id = @id`, params)
    const r = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id })
    if (!r.recordset.length) return res.status(404).json({ error: 'Пользователь не найден' })
    res.json({ user: pickUser(r.recordset[0]) })
  } catch (err) {
    console.error('admin/users patch:', err)
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

router.delete('/users/:id/provider/:provider', async (req, res) => {
  try {
    const { id, provider } = req.params
    let sql
    if (provider === 'google') sql = `UPDATE dbo.users SET google_id = NULL WHERE id = @id`
    else if (provider === 'yandex') sql = `UPDATE dbo.users SET yandex_id = NULL WHERE id = @id`
    else if (provider === 'telegram') sql = `UPDATE dbo.users SET telegram_chat_id = NULL, telegram_username = NULL, telegram_link_code = NULL WHERE id = @id`
    else if (provider === 'password') sql = `UPDATE dbo.users SET password_hash = NULL WHERE id = @id`
    else return res.status(400).json({ error: 'Неизвестный провайдер' })

    await query(sql, { id })
    const r = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id })
    res.json({ user: pickUser(r.recordset[0]) })
  } catch (err) {
    console.error('admin unlink:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' })
    }
    await query(`DELETE FROM dbo.time_tracking WHERE user_id = @id`, { id })
    await query(`DELETE FROM dbo.task_attachments WHERE uploaded_by = @id`, { id })
    await query(`DELETE FROM dbo.comments WHERE user_id = @id`, { id })
    await query(`DELETE FROM dbo.board_members WHERE user_id = @id`, { id })
    await query(`DELETE FROM dbo.section_members WHERE user_id = @id`, { id })
    await query(`DELETE FROM dbo.team_members WHERE user_id = @id`, { id })
    await query(`UPDATE dbo.tasks SET assigned_to = NULL WHERE assigned_to = @id`, { id })
    await query(`UPDATE dbo.tasks SET created_by = NULL WHERE created_by = @id`, { id })
    await query(
      `UPDATE dbo.boards SET section_id = NULL
       WHERE section_id IN (SELECT id FROM dbo.sections WHERE owner_id = @id)`,
      { id }
    )
    await query(`DELETE FROM dbo.sections WHERE owner_id = @id`, { id })

    await query(`DELETE FROM dbo.users WHERE id = @id`, { id })
    res.status(204).end()
  } catch (err) {
    console.error('admin delete:', err)
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.users) AS users,
        (SELECT COUNT(*) FROM dbo.users WHERE is_admin = 1) AS admins,
        (SELECT COUNT(*) FROM dbo.users WHERE google_id IS NOT NULL) AS google_users,
        (SELECT COUNT(*) FROM dbo.users WHERE yandex_id IS NOT NULL) AS yandex_users,
        (SELECT COUNT(*) FROM dbo.users WHERE telegram_chat_id IS NOT NULL) AS telegram_users,
        (SELECT COUNT(*) FROM dbo.boards) AS boards,
        (SELECT COUNT(*) FROM dbo.tasks) AS tasks
    `)
    res.json(r.recordset[0])
  } catch (err) {
    console.error('admin stats:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
