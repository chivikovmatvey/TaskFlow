import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

let io = null

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

  io.on('connection', (socket) => {
    socket.on('join-board', (boardId) => {
      if (boardId) {
        socket.join(`board:${boardId}`)
        socket.to(`board:${boardId}`).emit('presence:join', {
          userId: socket.user.id,
          email: socket.user.email,
        })
        const room = io.sockets.adapter.rooms.get(`board:${boardId}`) || new Set()
        const presences = []
        for (const sid of room) {
          const s = io.sockets.sockets.get(sid)
          if (s?.user) presences.push({ userId: s.user.id, email: s.user.email })
        }
        socket.emit('presence:state', presences)
      }
    })

    socket.on('leave-board', (boardId) => {
      if (boardId) {
        socket.leave(`board:${boardId}`)
        socket.to(`board:${boardId}`).emit('presence:leave', {
          userId: socket.user.id,
          email: socket.user.email,
        })
      }
    })

    socket.on('join-dashboard', () => {
      socket.join(`dashboard:${socket.user.id}`)
    })

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('board:')) {
          socket.to(room).emit('presence:leave', {
            userId: socket.user.id,
            email: socket.user.email,
          })
        }
      }
    })
  })

  return io
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
