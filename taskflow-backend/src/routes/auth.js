import express from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { authMiddleware, signToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' })
    }

    const existing = await query(
      `SELECT id FROM dbo.users WHERE email = @email`,
      { email }
    )
    if (existing.recordset.length) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await query(
      `INSERT INTO dbo.users (email, password_hash, full_name)
       OUTPUT INSERTED.id, INSERTED.email, INSERTED.full_name, INSERTED.created_at
       VALUES (@email, @passwordHash, @fullName)`,
      { email, passwordHash, fullName: fullName || null }
    )
    const user = result.recordset[0]
    const token = signToken(user)
    res.status(201).json({ user, token })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Ошибка регистрации' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' })
    }
    const result = await query(
      `SELECT id, email, password_hash, full_name FROM dbo.users WHERE email = @email`,
      { email }
    )
    const user = result.recordset[0]
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }
    const safeUser = { id: user.id, email: user.email, full_name: user.full_name }
    const token = signToken(safeUser)
    res.json({ user: safeUser, token })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Ошибка входа' })
  }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, created_at FROM dbo.users WHERE id = @id`,
      { id: req.user.id }
    )
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }
    res.json({ user: result.recordset[0] })
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/lookup', authMiddleware, async (req, res) => {
  try {
    const { email, id } = req.query
    if (email) {
      const r = await query(
        `SELECT id, email, full_name FROM dbo.users WHERE email = @email`,
        { email }
      )
      return res.json({ user: r.recordset[0] || null })
    }
    if (id) {
      const r = await query(
        `SELECT id, email, full_name FROM dbo.users WHERE id = @id`,
        { id }
      )
      return res.json({ user: r.recordset[0] || null })
    }
    res.status(400).json({ error: 'Укажите email или id' })
  } catch (err) {
    console.error('Lookup error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
