import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { boardService } from '../services/boardService'
import { getSocket } from '../services/socketClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useCheckBoardAccess(boardId) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId || !user) return
    let cancelled = false

    const checkAccess = async () => {
      try {
        await boardService.getBoard(boardId)
      } catch (err) {
        if (cancelled) return
        const msg = err?.message || ''
        if (msg.includes('Нет доступа') || msg.includes('доступа')) {
          toast.error('У вас больше нет доступа к этой доске')
        } else {
          toast.error('Доска не найдена')
        }
        queryClient.invalidateQueries({ queryKey: ['boards'] })
        navigate('/dashboard')
      }
    }

    checkAccess()

    const socket = getSocket()
    if (!socket) return () => { cancelled = true }

    const onRevoked = (payload) => {
      if (payload.boardId === boardId) {
        toast.error('Вас удалили из доски')
        queryClient.invalidateQueries({ queryKey: ['boards'] })
        navigate('/dashboard')
      }
    }
    const onDeleted = (payload) => {
      if (payload.boardId === boardId) {
        toast.error('Доска была удалена')
        queryClient.invalidateQueries({ queryKey: ['boards'] })
        navigate('/dashboard')
      }
    }

    socket.on('board:access-revoked', onRevoked)
    socket.on('board:deleted', onDeleted)

    return () => {
      cancelled = true
      socket.off('board:access-revoked', onRevoked)
      socket.off('board:deleted', onDeleted)
    }
  }, [boardId, user, navigate, queryClient])
}
