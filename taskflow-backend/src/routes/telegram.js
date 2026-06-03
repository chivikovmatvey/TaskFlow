import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { authMiddleware, signToken } from '../middleware/auth.js'
import { isTelegramEnabled } from '../telegram.js'
import { sendVerificationEmail } from '../email.js'

const router = express.Router()

const REG_TTL_MIN = 30
const CODE_TTL_MIN = 15

function generateCode() {
  return String(crypto.randomInt(100000, 1000000))
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeUsername(u) {
  return String(u || '').trim().replace(/^@/, '').toLowerCase()
}

function sanitizeUser(u) {
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

router.post('/register/start', async (req, res) => {
  try {
    if (!isTelegramEnabled()) {
      return res.status(503).json({ error: 'Telegram-бот не настроен на сервере' })
    }
    const code = `reg_${crypto.randomBytes(8).toString('hex')}`
    await query(
      `INSERT INTO dbo.tg_register_sessions (code, status, expires_at, purpose)
       VALUES (@code, 'pending', DATEADD(MINUTE, @ttl, SYSDATETIMEOFFSET()), 'register')`,
      { code, ttl: REG_TTL_MIN }
    )
    const botUsername = process.env.TELEGRAM_BOT_USERNAME
    res.json({
      code,
      botUsername,
      url: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
      command: `/start ${code}`,
      expiresInMin: REG_TTL_MIN,
    })
  } catch (err) {
    console.error('tg register/start:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/login/start', async (req, res) => {
  try {
    if (!isTelegramEnabled()) {
      return res.status(503).json({ error: 'Telegram-бот не настроен на сервере' })
    }
    const code = `login_${crypto.randomBytes(8).toString('hex')}`
    await query(
      `INSERT INTO dbo.tg_register_sessions (code, status, expires_at, purpose)
       VALUES (@code, 'pending', DATEADD(MINUTE, @ttl, SYSDATETIMEOFFSET()), 'login')`,
      { code, ttl: REG_TTL_MIN }
    )
    const botUsername = process.env.TELEGRAM_BOT_USERNAME
    res.json({
      code,
      botUsername,
      url: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
      command: `/start ${code}`,
      expiresInMin: REG_TTL_MIN,
    })
  } catch (err) {
    console.error('tg login/start:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/login/status', async (req, res) => {
  try {
    const code = String(req.query.code || '').trim()
    if (!code) return res.status(400).json({ error: 'code обязателен' })
    const r = await query(
      `SELECT TOP 1 * FROM dbo.tg_register_sessions WHERE code = @code`,
      { code }
    )
    if (!r.recordset.length) return res.status(404).json({ error: 'Сессия не найдена' })
    const row = r.recordset[0]
    if (new Date(row.expires_at) < new Date()) return res.json({ status: 'expired' })

    if (row.status === 'logged_in' && row.user_id) {
      const u = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: row.user_id })
      const user = u.recordset[0]
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
      await query(`UPDATE dbo.tg_register_sessions SET status = 'completed' WHERE id = @id`, { id: row.id })
      const safe = sanitizeUser(user)
      const token = signToken(safe)
      return res.json({ status: 'logged_in', user: safe, token })
    }
    res.json({ status: row.status })
  } catch (err) {
    console.error('tg login/status:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.get('/register/status', async (req, res) => {
  try {
    const code = String(req.query.code || '').trim()
    if (!code) return res.status(400).json({ error: 'code обязателен' })
    const r = await query(
      `SELECT TOP 1 * FROM dbo.tg_register_sessions WHERE code = @code`,
      { code }
    )
    if (!r.recordset.length) return res.status(404).json({ error: 'Сессия не найдена' })
    const row = r.recordset[0]
    if (new Date(row.expires_at) < new Date()) {
      return res.json({ status: 'expired' })
    }
    if (row.status === 'logged_in' && row.user_id) {
      const u = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: row.user_id })
      const user = u.recordset[0]
      if (user) {
        await query(`UPDATE dbo.tg_register_sessions SET status = 'completed' WHERE id = @id`, { id: row.id })
        const safe = sanitizeUser(user)
        const token = signToken(safe)
        return res.json({ status: 'logged_in', user: safe, token })
      }
    }
    res.json({
      status: row.status,
      telegramUsername: row.telegram_username,
      telegramFirstName: row.telegram_first_name,
    })
  } catch (err) {
    console.error('tg register/status:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/register/email', async (req, res) => {
  try {
    const tgCode = String(req.body.code || '').trim()
    const email = normalizeEmail(req.body.email)
    const fullName = req.body.fullName || null
    const username = req.body.username ? normalizeUsername(req.body.username) : null

    if (!tgCode || !email) return res.status(400).json({ error: 'code и email обязательны' })
    if (!username) return res.status(400).json({ error: 'Username обязателен' })
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username: 3-30 латинских букв, цифр или _' })
    }

    const sess = await query(
      `SELECT * FROM dbo.tg_register_sessions WHERE code = @code AND status = 'telegram_verified'`,
      { code: tgCode }
    )
    const session = sess.recordset[0]
    if (!session) return res.status(400).json({ error: 'TG-сессия не верифицирована' })
    if (new Date(session.expires_at) < new Date()) {
      return res.status(400).json({ error: 'TG-сессия истекла' })
    }

    const existsEmail = await query(`SELECT id FROM dbo.users WHERE email = @email`, { email })
    if (existsEmail.recordset.length) {
      return res.status(409).json({ error: 'Email уже используется' })
    }
    if (username) {
      const taken = await query(
        `SELECT id FROM dbo.users WHERE LOWER(username) = @u`,
        { u: username }
      )
      if (taken.recordset.length) {
        return res.status(409).json({ error: 'Username уже занят' })
      }
    }

    const verifyCode = generateCode()
    const payload = JSON.stringify({
      fullName,
      username,
      telegramChatId: Number(session.telegram_chat_id),
      telegramUsername: session.telegram_username,
      tgSessionId: session.id,
    })

    await query(
      `DELETE FROM dbo.email_verification_codes
       WHERE email = @email AND purpose = 'telegram-register' AND used_at IS NULL`,
      { email }
    )
    await query(
      `INSERT INTO dbo.email_verification_codes (email, code, purpose, payload, expires_at)
       VALUES (@email, @code, 'telegram-register', @payload, DATEADD(MINUTE, @ttl, SYSDATETIMEOFFSET()))`,
      { email, code: verifyCode, payload, ttl: CODE_TTL_MIN }
    )
    await sendVerificationEmail(email, verifyCode, 'telegram-register')
    res.json({ ok: true, expiresInMin: CODE_TTL_MIN })
  } catch (err) {
    console.error('tg register/email:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/register/verify', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const code = String(req.body.code || '').trim()
    if (!email || !code) return res.status(400).json({ error: 'email и code обязательны' })

    const r = await query(
      `SELECT TOP 1 * FROM dbo.email_verification_codes
       WHERE email = @email AND purpose = 'telegram-register' AND used_at IS NULL
       ORDER BY created_at DESC`,
      { email }
    )
    const row = r.recordset[0]
    if (!row) return res.status(400).json({ error: 'Код не найден' })
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Код истёк' })
    }
    if (row.attempts >= 5) {
      return res.status(400).json({ error: 'Слишком много попыток' })
    }
    if (row.code !== code) {
      await query(
        `UPDATE dbo.email_verification_codes SET attempts = attempts + 1 WHERE id = @id`,
        { id: row.id }
      )
      return res.status(400).json({ error: 'Неверный код' })
    }
    const data = JSON.parse(row.payload || '{}')

    const ins = await query(
      `INSERT INTO dbo.users (email, full_name, username, email_verified, auth_provider,
                               telegram_chat_id, telegram_username)
       OUTPUT INSERTED.*
       VALUES (@email, @fullName, @username, 1, 'telegram', @chatId, @tgUsername)`,
      {
        email,
        fullName: data.fullName,
        username: data.username,
        chatId: data.telegramChatId,
        tgUsername: data.telegramUsername,
      }
    )
    await query(
      `UPDATE dbo.email_verification_codes SET used_at = SYSDATETIMEOFFSET() WHERE id = @id`,
      { id: row.id }
    )
    if (data.tgSessionId) {
      await query(
        `UPDATE dbo.tg_register_sessions SET status = 'completed' WHERE id = @id`,
        { id: data.tgSessionId }
      )
    }
    const user = sanitizeUser(ins.recordset[0])
    const token = signToken(user)
    res.status(201).json({ user, token })
  } catch (err) {
    console.error('tg register/verify:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.use(authMiddleware)

router.get('/status', async (req, res) => {
  try {
    const r = await query(
      `SELECT telegram_username, telegram_chat_id, notify_telegram, telegram_link_code
       FROM dbo.users WHERE id = @id`,
      { id: req.user.id }
    )
    const u = r.recordset[0]
    if (!u) return res.status(404).json({ error: 'Не найден' })
    res.json({
      botEnabled: isTelegramEnabled(),
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      connected: !!u.telegram_chat_id,
      username: u.telegram_username,
      notifyEnabled: !!u.notify_telegram,
      pendingCode: u.telegram_link_code,
    })
  } catch (err) {
    console.error('Telegram status error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/link-code', async (req, res) => {
  try {
    const code = crypto.randomBytes(8).toString('hex')
    await query(
      `UPDATE dbo.users SET telegram_link_code = @code WHERE id = @id`,
      { code, id: req.user.id }
    )
    res.json({
      code,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      command: `/start ${code}`,
      url: process.env.TELEGRAM_BOT_USERNAME
        ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${code}`
        : null,
    })
  } catch (err) {
    console.error('Telegram link-code error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/unlink', async (req, res) => {
  try {
    await query(
      `UPDATE dbo.users SET
         telegram_chat_id = NULL,
         telegram_username = NULL,
         telegram_link_code = NULL
       WHERE id = @id`,
      { id: req.user.id }
    )
    res.status(204).end()
  } catch (err) {
    console.error('Unlink error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.patch('/preferences', async (req, res) => {
  try {
    const { notifyEnabled, username } = req.body
    await query(
      `UPDATE dbo.users SET
         notify_telegram = COALESCE(@notify, notify_telegram),
         telegram_username = COALESCE(@username, telegram_username)
       WHERE id = @id`,
      {
        id: req.user.id,
        notify: typeof notifyEnabled === 'boolean' ? (notifyEnabled ? 1 : 0) : null,
        username: username !== undefined ? username : null,
      }
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Preferences error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
