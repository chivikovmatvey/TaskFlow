import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../services/socketClient'
import { useAuth } from '../context/AuthContext'

export function useRealtimeDashboard() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return

    const join = () => socket.emit('join-dashboard')
    if (socket.connected) join()
    socket.on('connect', join)

    const onChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
    }
    socket.on('dashboard:changed', onChanged)
    socket.on('board:deleted', onChanged)
    socket.on('board:access-revoked', onChanged)

    return () => {
      socket.off('connect', join)
      socket.off('dashboard:changed', onChanged)
      socket.off('board:deleted', onChanged)
      socket.off('board:access-revoked', onChanged)
    }
  }, [user, queryClient])
}
