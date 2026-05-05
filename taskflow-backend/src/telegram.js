import TelegramBot from 'node-telegram-bot-api'
import { query } from './db.js'

let bot = null
const TOKEN = process.env.TELEGRAM_BOT_TOKEN

export function initTelegram() {
  if (!TOKEN) {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram notifications disabled')
    return null
  }
  try {
    bot = new TelegramBot(TOKEN, { polling: true })
    bot.on('polling_error', (err) => {
      console.error('Telegram polling error:', err.message)
    })

    // /start <code> — привязать аккаунт
    bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id
      const code = match[1]?.trim()
      const username = msg.from.username || null

      if (!code) {
        await bot.sendMessage(
          chatId,
          '👋 Привет! Это бот TaskFlow.\n\nЧтобы получать уведомления, перейди в TaskFlow → Настройки → Telegram, и нажми «Подключить». Тебе дадут команду со специальным кодом — отправь её сюда.'
        )
        return
      }

      try {
        const r = await query(
          `SELECT id, email, full_name FROM dbo.users WHERE telegram_link_code = @code`,
          { code }
        )
        if (!r.recordset.length) {
          await bot.sendMessage(chatId, '❌ Код недействителен или уже использован. Получи новый в TaskFlow.')
          return
        }
        const user = r.recordset[0]
        await query(
          `UPDATE dbo.users SET
             telegram_chat_id = @chatId,
             telegram_username = @username,
             telegram_link_code = NULL
           WHERE id = @id`,
          { chatId, username, id: user.id }
        )
        await bot.sendMessage(
          chatId,
          `✅ Аккаунт ${user.email} подключён!\nТеперь ты будешь получать уведомления о задачах.`
        )
      } catch (err) {
        console.error('Telegram /start error:', err)
        await bot.sendMessage(chatId, '⚠️ Произошла ошибка. Попробуй ещё раз.')
      }
    })

    bot.onText(/\/stop/, async (msg) => {
      const chatId = msg.chat.id
      try {
        await query(
          `UPDATE dbo.users SET telegram_chat_id = NULL, notify_telegram = 0
           WHERE telegram_chat_id = @chatId`,
          { chatId }
        )
        await bot.sendMessage(chatId, '🔕 Уведомления отключены. Чтобы вернуться, заново подключи аккаунт.')
      } catch (err) {
        console.error('/stop error:', err)
      }
    })

    bot.onText(/\/me/, async (msg) => {
      const chatId = msg.chat.id
      const r = await query(
        `SELECT email, full_name FROM dbo.users WHERE telegram_chat_id = @chatId`,
        { chatId }
      )
      if (r.recordset.length) {
        const u = r.recordset[0]
        await bot.sendMessage(chatId, `👤 Подключён как: ${u.email}${u.full_name ? `\nИмя: ${u.full_name}` : ''}`)
      } else {
        await bot.sendMessage(chatId, '🚫 Аккаунт не подключён.')
      }
    })

    console.log('✅ Telegram bot started')
    return bot
  } catch (err) {
    console.error('❌ Telegram init failed:', err.message)
    return null
  }
}

export async function sendTelegram(chatId, text) {
  if (!bot || !chatId) return
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true })
  } catch (err) {
    console.error('sendTelegram error:', err.message)
  }
}

export function isTelegramEnabled() {
  return !!bot
}
