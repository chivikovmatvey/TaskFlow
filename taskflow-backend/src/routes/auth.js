import express from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import multer from 'multer'
import { query } from '../db.js'
import { authMiddleware, signToken } from '../middleware/auth.js'
import { sendVerificationEmail } from '../email.js'

const router = express.Router()

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.mimetype)) cb(null, true)
    else cb(new Error('Только изображения'))
  },
})

function avatarUrlFor(userId) {
  const baseUrl = process.env.SERVER_URL || 'http://localhost:5000'
  return `${baseUrl}/api/auth/avatar/${userId}?v=${Date.now()}`
}

const CODE_TTL_MIN = 15
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/
const RESERVED_USERNAMES = new Set([
  'admin', 'root', 'system', 'support', 'taskflow', 'me', 'user', 'users',
  'api', 'auth', 'login', 'register', 'settings', 'help', 'null', 'undefined',
])

function generateCode() {
  return String(crypto.randomInt(100000, 1000000))
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeUsername(username) {
  return String(username || '').trim().replace(/^@/, '').toLowerCase()
}

async function isUsernameTaken(username, excludeUserId = null) {
  const r = await query(
    `SELECT id FROM dbo.users WHERE LOWER(username) = @u ${excludeUserId ? 'AND id <> @ex' : ''}`,
    excludeUserId ? { u: username, ex: excludeUserId } : { u: username }
  )
  return r.recordset.length > 0
}

async function isEmailTaken(email) {
  const r = await query(`SELECT id FROM dbo.users WHERE email = @email`, { email })
  return r.recordset.length > 0
}

function sanitizeUser(u) {
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    username: u.username,
    avatar_url: u.avatar_url,
    email_verified: !!u.email_verified,
    auth_provider: u.auth_provider,
    is_admin: !!u.is_admin,
  }
}

router.get('/check-username', async (req, res) => {
  try {
    const raw = normalizeUsername(req.query.username)
    if (!raw) return res.json({ available: false, reason: 'empty' })
    if (!USERNAME_RE.test(raw)) {
      return res.json({ available: false, reason: 'format' })
    }
    if (RESERVED_USERNAMES.has(raw)) {
      return res.json({ available: false, reason: 'reserved' })
    }
    const taken = await isUsernameTaken(raw)
    res.json({ available: !taken, reason: taken ? 'taken' : 'ok' })
  } catch (err) {
    console.error('check-username:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/register/start', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const { password, fullName, username } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' })
    }
    if (!username) {
      return res.status(400).json({ error: 'Username обязателен' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' })
    }
    if (await isEmailTaken(email)) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' })
    }

    const normalizedUsername = normalizeUsername(username)
    if (!USERNAME_RE.test(normalizedUsername)) {
      return res.status(400).json({ error: 'Username должен содержать 3-30 латинских букв, цифр или _' })
    }
    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      return res.status(400).json({ error: 'Этот username зарезервирован' })
    }
    if (await isUsernameTaken(normalizedUsername)) {
      return res.status(409).json({ error: 'Username уже занят' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const code = generateCode()
    const payload = JSON.stringify({
      passwordHash,
      fullName: fullName || null,
      username: normalizedUsername,
    })

    await query(
      `DELETE FROM dbo.email_verification_codes
       WHERE email = @email AND purpose = 'register' AND used_at IS NULL`,
      { email }
    )
    await query(
      `INSERT INTO dbo.email_verification_codes (email, code, purpose, payload, expires_at)
       VALUES (@email, @code, 'register', @payload, DATEADD(MINUTE, @ttl, SYSDATETIMEOFFSET()))`,
      { email, code, payload, ttl: CODE_TTL_MIN }
    )

    await sendVerificationEmail(email, code, 'register')
    res.json({ ok: true, email, expiresInMin: CODE_TTL_MIN })
  } catch (err) {
    console.error('register/start:', err)
    res.status(500).json({ error: 'Ошибка регистрации' })
  }
})

router.post('/register/verify', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const code = String(req.body.code || '').trim()
    if (!email || !code) return res.status(400).json({ error: 'Email и код обязательны' })

    const r = await query(
      `SELECT TOP 1 * FROM dbo.email_verification_codes
       WHERE email = @email AND purpose = 'register' AND used_at IS NULL
       ORDER BY created_at DESC`,
      { email }
    )
    const row = r.recordset[0]
    if (!row) return res.status(400).json({ error: 'Код не найден или уже использован' })
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Код истёк, запросите новый' })
    }
    if (row.attempts >= 5) {
      return res.status(400).json({ error: 'Слишком много попыток, запросите новый код' })
    }
    if (row.code !== code) {
      await query(
        `UPDATE dbo.email_verification_codes SET attempts = attempts + 1 WHERE id = @id`,
        { id: row.id }
      )
      return res.status(400).json({ error: 'Неверный код' })
    }

    if (await isEmailTaken(email)) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' })
    }

    const data = JSON.parse(row.payload || '{}')
    const result = await query(
      `INSERT INTO dbo.users (email, password_hash, full_name, username, email_verified, auth_provider)
       OUTPUT INSERTED.*
       VALUES (@email, @passwordHash, @fullName, @username, 1, 'email')`,
      {
        email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        username: data.username,
      }
    )
    await query(
      `UPDATE dbo.email_verification_codes SET used_at = SYSDATETIMEOFFSET() WHERE id = @id`,
      { id: row.id }
    )

    const user = sanitizeUser(result.recordset[0])
    const token = signToken(user)
    res.status(201).json({ user, token })
  } catch (err) {
    console.error('register/verify:', err)
    res.status(500).json({ error: 'Ошибка подтверждения' })
  }
})

router.post('/register/resend', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (!email) return res.status(400).json({ error: 'Email обязателен' })

    const r = await query(
      `SELECT TOP 1 payload FROM dbo.email_verification_codes
       WHERE email = @email AND purpose = 'register' AND used_at IS NULL
       ORDER BY created_at DESC`,
      { email }
    )
    if (!r.recordset.length) {
      return res.status(400).json({ error: 'Нет активного запроса регистрации' })
    }
    const code = generateCode()
    await query(
      `UPDATE dbo.email_verification_codes
       SET code = @code, attempts = 0, expires_at = DATEADD(MINUTE, @ttl, SYSDATETIMEOFFSET())
       WHERE email = @email AND purpose = 'register' AND used_at IS NULL`,
      { code, email, ttl: CODE_TTL_MIN }
    )
    await sendVerificationEmail(email, code, 'register')
    res.json({ ok: true, expiresInMin: CODE_TTL_MIN })
  } catch (err) {
    console.error('register/resend:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/register', async (req, res) => {
  req.url = '/register/start'
  router.handle(req, res)
})

router.post('/login', async (req, res) => {
  try {
    const identifier = String(req.body.email || req.body.identifier || '').trim()
    const password = req.body.password
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Введите email/username и пароль' })
    }

    const isUsername = identifier.startsWith('@') || !identifier.includes('@')
    const sql = isUsername
      ? `SELECT * FROM dbo.users WHERE LOWER(username) = @v`
      : `SELECT * FROM dbo.users WHERE LOWER(email) = @v`
    const value = isUsername ? normalizeUsername(identifier) : normalizeEmail(identifier)

    const result = await query(sql, { v: value })
    const user = result.recordset[0]
    if (!user) {
      return res.status(401).json({ error: 'Неверные учётные данные' })
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: `Аккаунт привязан к ${user.auth_provider}. Войдите через эту службу.` })
    }
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'Неверные учётные данные' })
    }
    const safe = sanitizeUser(user)
    const token = signToken(safe)
    res.json({ user: safe, token })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Ошибка входа' })
  }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM dbo.users WHERE id = @id`,
      { id: req.user.id }
    )
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }
    res.json({ user: sanitizeUser(result.recordset[0]) })
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/lookup', authMiddleware, async (req, res) => {
  try {
    const { email, id, username } = req.query
    if (email) {
      const r = await query(
        `SELECT id, email, full_name, username, avatar_url FROM dbo.users WHERE email = @email`,
        { email: normalizeEmail(email) }
      )
      return res.json({ user: r.recordset[0] || null })
    }
    if (username) {
      const r = await query(
        `SELECT id, email, full_name, username, avatar_url FROM dbo.users WHERE LOWER(username) = @u`,
        { u: normalizeUsername(username) }
      )
      return res.json({ user: r.recordset[0] || null })
    }
    if (id) {
      const r = await query(
        `SELECT id, email, full_name, username, avatar_url FROM dbo.users WHERE id = @id`,
        { id }
      )
      return res.json({ user: r.recordset[0] || null })
    }
    res.status(400).json({ error: 'Укажите email, username или id' })
  } catch (err) {
    console.error('Lookup error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().replace(/^@/, '').toLowerCase()
    const sql = q
      ? `SELECT TOP 20 id, email, full_name, username, avatar_url
         FROM dbo.users
         WHERE id <> @me AND (
           LOWER(username) LIKE @q OR LOWER(email) LIKE @q OR LOWER(full_name) LIKE @q
         )
         ORDER BY username, email`
      : `SELECT TOP 50 id, email, full_name, username, avatar_url
         FROM dbo.users
         WHERE id <> @me
         ORDER BY full_name, username, email`
    const r = await query(sql, q ? { me: req.user.id, q: `%${q}%` } : { me: req.user.id })
    res.json({ users: r.recordset })
  } catch (err) {
    console.error('Search error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/username', authMiddleware, async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username)
    if (!username) return res.status(400).json({ error: 'Username не указан' })
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username должен содержать 3-30 латинских букв, цифр или _' })
    }
    if (RESERVED_USERNAMES.has(username)) {
      return res.status(400).json({ error: 'Этот username зарезервирован' })
    }
    if (await isUsernameTaken(username, req.user.id)) {
      return res.status(409).json({ error: 'Username уже занят' })
    }
    const r = await query(
      `UPDATE dbo.users SET username = @u WHERE id = @id;
       SELECT * FROM dbo.users WHERE id = @id;`,
      { u: username, id: req.user.id }
    )
    res.json({ user: sanitizeUser(r.recordset[0]) })
  } catch (err) {
    console.error('username update:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, currentPassword, newPassword } = req.body
    const updates = []
    const params = { id: req.user.id }

    if (full_name !== undefined) {
      updates.push('full_name = @full_name')
      params.full_name = String(full_name).trim() || null
    }

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' })
      }
      const cur = await query(`SELECT password_hash FROM dbo.users WHERE id = @id`, { id: req.user.id })
      const row = cur.recordset[0]
      if (!row) return res.status(404).json({ error: 'Пользователь не найден' })
      if (row.password_hash) {
        if (!currentPassword) return res.status(400).json({ error: 'Укажите текущий пароль' })
        const ok = await bcrypt.compare(String(currentPassword), row.password_hash)
        if (!ok) return res.status(400).json({ error: 'Текущий пароль неверен' })
      }
      updates.push('password_hash = @password_hash')
      params.password_hash = await bcrypt.hash(String(newPassword), 10)
    }

    if (!updates.length) return res.status(400).json({ error: 'Нет полей для обновления' })

    await query(`UPDATE dbo.users SET ${updates.join(', ')} WHERE id = @id`, params)
    const r = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: req.user.id })
    res.json({ user: sanitizeUser(r.recordset[0]) })
  } catch (err) {
    console.error('profile patch:', err)
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

router.get('/avatar/:userId', async (req, res) => {
  try {
    const r = await query(
      `SELECT avatar_data, avatar_mime FROM dbo.users WHERE id = @id`,
      { id: req.params.userId }
    )
    const row = r.recordset[0]
    if (!row || !row.avatar_data) return res.status(404).end()
    res.setHeader('Content-Type', row.avatar_mime || 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(row.avatar_data)
  } catch (err) {
    console.error('avatar get:', err)
    res.status(500).end()
  }
})

router.post('/avatar', authMiddleware, (req, res) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки' })
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })
    try {
      const url = avatarUrlFor(req.user.id)
      await query(
        `UPDATE dbo.users SET avatar_data = @data, avatar_mime = @mime, avatar_url = @u WHERE id = @id`,
        { data: req.file.buffer, mime: req.file.mimetype, u: url, id: req.user.id }
      )
      const r = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: req.user.id })
      res.json({ user: sanitizeUser(r.recordset[0]) })
    } catch (e) {
      console.error('avatar upload:', e)
      res.status(500).json({ error: 'Ошибка' })
    }
  })
})

router.delete('/avatar', authMiddleware, async (req, res) => {
  try {
    await query(
      `UPDATE dbo.users SET avatar_data = NULL, avatar_mime = NULL, avatar_url = NULL WHERE id = @id`,
      { id: req.user.id }
    )
    const r = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: req.user.id })
    res.json({ user: sanitizeUser(r.recordset[0]) })
  } catch (err) {
    console.error('avatar delete:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/account-links', authMiddleware, async (req, res) => {
  try {
    const r = await query(
      `SELECT password_hash, google_id, yandex_id, telegram_chat_id, telegram_username
       FROM dbo.users WHERE id = @id`,
      { id: req.user.id }
    )
    const u = r.recordset[0] || {}
    res.json({
      password: !!u.password_hash,
      google: !!u.google_id,
      yandex: !!u.yandex_id,
      telegram: !!u.telegram_chat_id,
      telegramUsername: u.telegram_username,
    })
  } catch (err) {
    console.error('account-links get:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/account-links/:provider', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.params
    let sql
    if (provider === 'google') sql = `UPDATE dbo.users SET google_id = NULL WHERE id = @id`
    else if (provider === 'yandex') sql = `UPDATE dbo.users SET yandex_id = NULL WHERE id = @id`
    else if (provider === 'telegram') sql = `UPDATE dbo.users SET telegram_chat_id = NULL, telegram_username = NULL, telegram_link_code = NULL WHERE id = @id`
    else if (provider === 'password') sql = `UPDATE dbo.users SET password_hash = NULL WHERE id = @id`
    else return res.status(400).json({ error: 'Неизвестный провайдер' })

    const r = await query(
      `SELECT password_hash, google_id, yandex_id, telegram_chat_id FROM dbo.users WHERE id = @id`,
      { id: req.user.id }
    )
    const u = r.recordset[0] || {}
    const methods = {
      password: !!u.password_hash,
      google: !!u.google_id,
      yandex: !!u.yandex_id,
      telegram: !!u.telegram_chat_id,
    }
    methods[provider] = false
    if (!Object.values(methods).some(Boolean)) {
      return res.status(400).json({ error: 'Нельзя отвязать последний способ входа' })
    }

    await query(sql, { id: req.user.id })
    res.json({ ok: true })
  } catch (err) {
    console.error('account-links delete:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
