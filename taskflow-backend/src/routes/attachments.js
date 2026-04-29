import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess, getTaskBoardId } from '../utils/boardAccess.js'
import { emitBoardChanged } from '../realtime.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'))
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const taskDir = path.join(UPLOAD_DIR, req.params.taskId)
    if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true })
    cb(null, taskDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

const router = express.Router()
router.use(authMiddleware)

router.get('/task/:taskId', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT * FROM dbo.task_attachments WHERE task_id = @tid ORDER BY created_at DESC`,
      { tid: req.params.taskId }
    )
    res.json(result.recordset)
  } catch (err) {
    console.error('Get attachments error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.post('/task/:taskId', upload.single('file'), async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

    const relPath = path.join(req.params.taskId, req.file.filename)
    const result = await query(
      `INSERT INTO dbo.task_attachments (task_id, file_name, file_path, file_size, file_type, uploaded_by)
       OUTPUT INSERTED.*
       VALUES (@tid, @name, @path, @size, @type, @uid)`,
      {
        tid: req.params.taskId,
        name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        path: relPath,
        size: req.file.size,
        type: req.file.mimetype,
        uid: req.user.id,
      }
    )
    emitBoardChanged(boardId)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Ошибка загрузки' })
  }
})

router.get('/:id/download', async (req, res) => {
  try {
    const a = await query(
      `SELECT a.*, t.board_id FROM dbo.task_attachments a
       INNER JOIN dbo.tasks t ON t.id = a.task_id WHERE a.id = @id`,
      { id: req.params.id }
    )
    if (!a.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const att = a.recordset[0]
    const access = await getBoardAccess(att.board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const fp = path.join(UPLOAD_DIR, att.file_path)
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Файл отсутствует' })
    res.download(fp, att.file_name)
  } catch (err) {
    console.error('Download error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const a = await query(
      `SELECT a.*, t.board_id FROM dbo.task_attachments a
       INNER JOIN dbo.tasks t ON t.id = a.task_id WHERE a.id = @id`,
      { id: req.params.id }
    )
    if (!a.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const att = a.recordset[0]
    const access = await getBoardAccess(att.board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const fp = path.join(UPLOAD_DIR, att.file_path)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    await query(`DELETE FROM dbo.task_attachments WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(att.board_id)
    res.status(204).end()
  } catch (err) {
    console.error('Delete attachment error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
