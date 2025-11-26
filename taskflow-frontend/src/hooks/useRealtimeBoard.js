import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabaseClient'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export function useRealtimeBoard(boardId) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const channelRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  useEffect(() => {
    if (!boardId || !user) {
      console.log('⚠️ [Realtime] Missing boardId or user')
      return
    }

    console.log('🔴 [Realtime] Setting up for board:', boardId)

    const setupChannel = () => {
      // Очищаем старый канал если есть
      if (channelRef.current) {
        console.log('🔄 [Realtime] Removing old channel')
        supabase.removeChannel(channelRef.current)
      }

      // Создаем новый канал
      const channel = supabase
        .channel(`board-${boardId}`, {
          config: {
            broadcast: { self: false },
          },
        })
        
        // TASKS - INSERT
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tasks', filter: `board_id=eq.${boardId}` },
          (payload) => {
            console.log('✅ [Realtime] Task INSERT:', payload.new)
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
            
            if (payload.new?.created_by !== user.id) {
              toast.success('Новая задача добавлена')
            }
          }
        )
        
        // TASKS - UPDATE
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `board_id=eq.${boardId}` },
          (payload) => {
            console.log('✅ [Realtime] Task UPDATE:', payload.new)
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
          }
        )
        
        // TASKS - DELETE
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'tasks', filter: `board_id=eq.${boardId}` },
          (payload) => {
            console.log('✅ [Realtime] Task DELETE:', payload.old)
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
            toast('Задача удалена', { icon: '🗑️' })
          }
        )
        
        // COLUMNS - INSERT
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` },
          (payload) => {
            console.log('✅ [Realtime] Column INSERT:', payload.new)
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
            toast.success('Новая колонка добавлена')
          }
        )
        
        // COLUMNS - UPDATE
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` },
          (payload) => {
            console.log('✅ [Realtime] Column UPDATE:', payload.new)
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
          }
        )
        
        // COLUMNS - DELETE
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` },
          (payload) => {
            console.log('✅ [Realtime] Column DELETE:', payload.old)
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
            toast('🗑️ Колонка удалена', { icon: '🗑️' })
          }
        )
        
        // COMMENTS - все события
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comments' },
          (payload) => {
            console.log('✅ [Realtime] Comment event:', payload.eventType, payload)
            
            // Для INSERT и UPDATE используем new, для DELETE - old
            const taskId = payload.new?.task_id || payload.old?.task_id
            
            if (taskId) {
              console.log('🔄 [Realtime] Invalidating comments for task:', taskId)
              queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
            } else {
              // Если task_id не доступен, обновляем все комментарии
              console.log('🔄 [Realtime] Invalidating all comments')
              queryClient.invalidateQueries({ queryKey: ['comments'] })
            }
          }
        )
        
        // BOARD_MEMBERS - все события
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` },
          (payload) => {
            console.log('✅ [Realtime] Member event:', payload.eventType, payload)
            queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
            
            if (payload.eventType === 'INSERT') {
              toast.success('Новый участник добавлен')
            } else if (payload.eventType === 'DELETE') {
              toast('Участник удалён', { icon: '❌' })
            }
          }
        )
        .subscribe((status, err) => {
          console.log('🔄 [Realtime] Status:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ [Realtime] Successfully subscribed!')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [Realtime] Channel error:', err)
            
            // Переподключаемся через 5 секунд
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 [Realtime] Attempting to reconnect...')
              setupChannel()
            }, 5000)
          } else if (status === 'TIMED_OUT') {
            console.error('❌ [Realtime] Connection timed out')
          } else if (status === 'CLOSED') {
            console.log('🔴 [Realtime] Connection closed')
          }
        })

      channelRef.current = channel
    }

    setupChannel()

    // Cleanup
    return () => {
      console.log('🔴 [Realtime] Cleaning up')
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [boardId, user, queryClient])
}
