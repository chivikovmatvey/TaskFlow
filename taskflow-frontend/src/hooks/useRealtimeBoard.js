import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../services/socketClient'
import { useAuth } from '../context/AuthContext'

export function useRealtimeBoard(boardId) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!boardId || !user) return
    const socket = getSocket()
    if (!socket) return

    const join = () => socket.emit('join-board', boardId)
    if (socket.connected) join()
    socket.on('connect', join)

    const onChanged = (payload) => {
      if (payload.boardId !== boardId) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['board', boardId] })
        queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
        queryClient.invalidateQueries({ queryKey: ['comments'] })
      }, 200)
    }

    socket.on('board:changed', onChanged)

    return () => {
      socket.off('connect', join)
      socket.off('board:changed', onChanged)
      socket.emit('leave-board', boardId)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [boardId, user, queryClient])
}
