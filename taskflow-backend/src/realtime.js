import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { query } from './db.js'

let io = null

async function loadProfile(userId) {
  try {
    const r = await query(
      `SELECT id, email, username, full_name, avatar_url FROM dbo.users WHERE id = @id`,
      { id: userId }
    )
    return r.recordset[0] || null
  } catch {
    return null
  }
}

async function touchLastSeen(userId) {
  try {
    await query(
      `UPDATE dbo.users SET last_seen = SYSDATETIMEOFFSET() WHERE id = @id`,
      { id: userId }
    )
  } catch (e) {
  }
}

function presencePayload(user, profile) {
  return {
    userId: user.id,
    email: profile?.email || user.email,
    username: profile?.username || null,
    full_name: profile?.full_name || null,
    avatar_url: profile?.avatar_url || null,
  }
}

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = { id: payload.sub, email: payload.email }
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    socket.profile = await loadProfile(socket.user.id)
    touchLastSeen(socket.user.id)

    io.emit('presence:online', presencePayload(socket.user, socket.profile))

    socket.on('join-board', (boardId) => {
      if (boardId) {
        socket.join(`board:${boardId}`)
        socket.to(`board:${boardId}`).emit('presence:join', presencePayload(socket.user, socket.profile))
        const room = io.sockets.adapter.rooms.get(`board:${boardId}`) || new Set()
        const presences = []
        for (const sid of room) {
          const s = io.sockets.sockets.get(sid)
          if (s?.user) presences.push(presencePayload(s.user, s.profile))
        }
        socket.emit('presence:state', presences)
      }
    })

    socket.on('leave-board', (boardId) => {
      if (boardId) {
        socket.leave(`board:${boardId}`)
        socket.to(`board:${boardId}`).emit('presence:leave', presencePayload(socket.user, socket.profile))
      }
    })

    socket.on('join-dashboard', () => {
      socket.join(`dashboard:${socket.user.id}`)
    })

    socket.on('presence:list', () => {
      const set = new Set()
      const list = []
      for (const [, s] of io.sockets.sockets) {
        if (!s.user) continue
        if (set.has(s.user.id)) continue
        set.add(s.user.id)
        list.push(presencePayload(s.user, s.profile))
      }
      socket.emit('presence:list', list)
    })

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('board:')) {
          socket.to(room).emit('presence:leave', presencePayload(socket.user, socket.profile))
        }
      }
    })

    socket.on('disconnect', () => {
      touchLastSeen(socket.user.id)
      let stillOnline = false
      for (const [, s] of io.sockets.sockets) {
        if (s.user?.id === socket.user.id) { stillOnline = true; break }
      }
      if (!stillOnline) {
        io.emit('presence:offline', { userId: socket.user.id, last_seen: new Date().toISOString() })
      }
    })
  })

  return io
}

export function getOnlineUserIds() {
  if (!io) return new Set()
  const ids = new Set()
  for (const [, s] of io.sockets.sockets) {
    if (s.user) ids.add(s.user.id)
  }
  return ids
}

export function emitToBoard(boardId, event, payload) {
  if (!io) return
  io.to(`board:${boardId}`).emit(event, payload)
}

export function emitToUser(userId, event, payload) {
  if (!io) return
  io.to(`dashboard:${userId}`).emit(event, payload)
}

export function emitBoardChanged(boardId, userIds = []) {
  if (!io) return
  emitToBoard(boardId, 'board:changed', { boardId })
  for (const uid of userIds) {
    emitToUser(uid, 'dashboard:changed', { boardId })
  }
}
