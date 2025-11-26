import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useCheckBoardAccess(boardId) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const channelRef = useRef(null)
  const lastCheckRef = useRef(null)

  useEffect(() => {
    if (!boardId || !user) return

    // Проверяем доступ при монтировании
    const checkAccess = async () => {
      const { data: board } = await supabase
        .from('boards')
        .select('id, owner_id')
        .eq('id', boardId)
        .single()

      if (!board) {
        toast.error('Доска не найдена')
        navigate('/dashboard')
        return false
      }

      // Если не владелец, проверяем участие
      if (board.owner_id !== user.id) {
        const { data: member } = await supabase
          .from('board_members')
          .select('id')
          .eq('board_id', boardId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!member) {
          toast.error('У вас больше нет доступа к этой доске')
          navigate('/dashboard')
          return false
        }
      }

      return true
    }

    checkAccess()

    // Подписка на изменения
    const channel = supabase
      .channel(`board-access-${boardId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'board_members',
          filter: `board_id=eq.${boardId}`,
        },
        async (payload) => {
          console.log('🔄 Member deleted from board:', payload.old)
          
          // Проверяем, есть ли у нас всё ещё доступ
          // Это работает даже если payload.old пустой
          const { data: myMembership } = await supabase
            .from('board_members')
            .select('id')
            .eq('board_id', boardId)
            .eq('user_id', user.id)
            .maybeSingle()

          // Также проверяем, не владелец ли мы
          const { data: board } = await supabase
            .from('boards')
            .select('owner_id')
            .eq('id', boardId)
            .single()

          if (!myMembership && board?.owner_id !== user.id) {
            console.log('❌ You no longer have access to this board')
            toast.error('Вас удалили из доски')
            queryClient.invalidateQueries({ queryKey: ['boards'] })
            navigate('/dashboard')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'boards',
          filter: `id=eq.${boardId}`,
        },
        () => {
          toast.error('Доска была удалена')
          queryClient.invalidateQueries({ queryKey: ['boards'] })
          navigate('/dashboard')
        }
      )
      .subscribe((status) => {
        console.log('🔄 Board access check status:', status)
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [boardId, user, navigate, queryClient])
}
