import express from 'express'
import multer from 'multer'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getBoardAccess, getTaskBoardId } from '../utils/boardAccess.js'
import { emitBoardChanged } from '../realtime.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

const router = express.Router()
router.use(authMiddleware)

router.get('/task/:taskId', async (req, res) => {
  try {
    const boardId = await getTaskBoardId(req.params.taskId)
    if (!boardId) return res.status(404).json({ error: 'Не найдено' })
    const access = await getBoardAccess(boardId, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    const result = await query(
      `SELECT id, task_id, file_name, file_size, file_type, uploaded_by, created_at
       FROM dbo.task_attachments WHERE task_id = @tid ORDER BY created_at DESC`,
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

    const result = await query(
      `INSERT INTO dbo.task_attachments (task_id, file_name, file_path, file_size, file_type, uploaded_by, file_data)
       OUTPUT INSERTED.id, INSERTED.task_id, INSERTED.file_name, INSERTED.file_size, INSERTED.file_type, INSERTED.uploaded_by, INSERTED.created_at
       VALUES (@tid, @name, NULL, @size, @type, @uid, @data)`,
      {
        tid: req.params.taskId,
        name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        size: req.file.size,
        type: req.file.mimetype,
        uid: req.user.id,
        data: req.file.buffer,
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
      `SELECT a.id, a.file_name, a.file_type, a.file_data, t.board_id
       FROM dbo.task_attachments a
       INNER JOIN dbo.tasks t ON t.id = a.task_id WHERE a.id = @id`,
      { id: req.params.id }
    )
    if (!a.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const att = a.recordset[0]
    const access = await getBoardAccess(att.board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    if (!att.file_data) return res.status(404).json({ error: 'Файл отсутствует' })

    res.setHeader('Content-Type', att.file_type || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.file_name)}`)
    res.send(att.file_data)
  } catch (err) {
    console.error('Download error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const a = await query(
      `SELECT a.id, t.board_id FROM dbo.task_attachments a
       INNER JOIN dbo.tasks t ON t.id = a.task_id WHERE a.id = @id`,
      { id: req.params.id }
    )
    if (!a.recordset.length) return res.status(404).json({ error: 'Не найдено' })
    const att = a.recordset[0]
    const access = await getBoardAccess(att.board_id, req.user.id)
    if (!access) return res.status(403).json({ error: 'Нет доступа' })
    await query(`DELETE FROM dbo.task_attachments WHERE id = @id`, { id: req.params.id })
    emitBoardChanged(att.board_id)
    res.status(204).end()
  } catch (err) {
    console.error('Delete attachment error:', err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

export default router
