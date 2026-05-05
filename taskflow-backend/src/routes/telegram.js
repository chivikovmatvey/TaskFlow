import express from 'express'
import crypto from 'crypto'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { isTelegramEnabled } from '../telegram.js'

const router = express.Router()
router.use(authMiddleware)

// Статус подключения текущего пользователя
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

// Сгенерировать новый код привязки
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

// Отвязать
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

// Включить / отключить уведомления
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
