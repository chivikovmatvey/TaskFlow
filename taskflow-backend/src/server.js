import express from 'express'
import cors from 'cors'
import http from 'http'
import dotenv from 'dotenv'
import { getPool } from './db.js'
import { initRealtime } from './realtime.js'
import authRoutes from './routes/auth.js'
import boardRoutes from './routes/boards.js'
import columnRoutes from './routes/columns.js'
import taskRoutes from './routes/tasks.js'
import memberRoutes from './routes/members.js'
import labelRoutes from './routes/labels.js'
import checklistRoutes from './routes/checklists.js'
import timeRoutes from './routes/timeTracking.js'
import attachmentRoutes from './routes/attachments.js'
import sectionRoutes from './routes/sections.js'
import insightsRoutes from './routes/insights.js'
import telegramRoutes from './routes/telegram.js'
import { initTelegram } from './telegram.js'

dotenv.config()

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/boards', boardRoutes)
app.use('/api/columns', columnRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/labels', labelRoutes)
app.use('/api/checklists', checklistRoutes)
app.use('/api/time-tracking', timeRoutes)
app.use('/api/attachments', attachmentRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/insights', insightsRoutes)
app.use('/api/telegram', telegramRoutes)

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' })
})

const PORT = process.env.PORT || 5000
const server = http.createServer(app)
initRealtime(server)

getPool()
  .then(() => {
    initTelegram()
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
