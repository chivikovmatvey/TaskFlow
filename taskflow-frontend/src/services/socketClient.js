import { io } from 'socket.io-client'
import { getToken } from './apiClient'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export function getSocket() {
  if (socket) return socket

  const token = getToken()
  if (!token) return null

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] connect_error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
