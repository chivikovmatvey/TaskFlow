import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { query, getPool } from '../src/db.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'))
const AVATARS_DIR = path.join(UPLOAD_DIR, 'avatars')

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

function mimeFromName(name) {
  const ext = path.extname(name).toLowerCase()
  return MIME_BY_EXT[ext] || 'application/octet-stream'
}

async function migrateAvatars() {
  if (!fs.existsSync(AVATARS_DIR)) {
    console.log('• Папки avatars нет — пропускаю')
    return
  }
  const users = await query(
    `SELECT id, avatar_url FROM dbo.users
     WHERE avatar_url IS NOT NULL AND avatar_url LIKE '%/uploads/avatars/%' AND avatar_data IS NULL`
  )
  let ok = 0, miss = 0
  for (const u of users.recordset) {
    const fileName = path.basename(u.avatar_url.split('?')[0])
    const fp = path.join(AVATARS_DIR, fileName)
    if (!fs.existsSync(fp)) { miss++; continue }
    const buffer = fs.readFileSync(fp)
    const mime = mimeFromName(fileName)
    const baseUrl = process.env.SERVER_URL || 'http://localhost:5000'
    const newUrl = `${baseUrl}/api/auth/avatar/${u.id}?v=${Date.now()}`
    await query(
      `UPDATE dbo.users SET avatar_data = @data, avatar_mime = @mime, avatar_url = @url WHERE id = @id`,
      { data: buffer, mime, url: newUrl, id: u.id }
    )
    ok++
  }
  console.log(`✅ Аватары: перенесено ${ok}, не найдено на диске ${miss}`)
}

async function migrateAttachments() {
  const rows = await query(
    `SELECT id, file_path FROM dbo.task_attachments
     WHERE file_data IS NULL AND file_path IS NOT NULL`
  )
  let ok = 0, miss = 0
  for (const r of rows.recordset) {
    const fp = path.join(UPLOAD_DIR, r.file_path)
    if (!fs.existsSync(fp)) { miss++; continue }
    const buffer = fs.readFileSync(fp)
    await query(
      `UPDATE dbo.task_attachments SET file_data = @data WHERE id = @id`,
      { data: buffer, id: r.id }
    )
    ok++
  }
  console.log(`✅ Вложения: перенесено ${ok}, не найдено на диске ${miss}`)
}

async function main() {
  await getPool()
  console.log('🔄 Миграция файлов с диска в БД...')
  await migrateAvatars()
  await migrateAttachments()
  console.log('✨ Готово. Папку uploads/ можно удалить вручную после проверки.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Ошибка миграции:', err)
  process.exit(1)
})
