import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useRealtimeDashboard() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user) return

    console.log('🔴 Setting up Realtime for dashboard')

    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards',
        },
        (payload) => {
          console.log('🔄 Board changed:', payload.eventType)
          queryClient.invalidateQueries({ queryKey: ['boards'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_members',
        },
        (payload) => {
          console.log('🔄 Member added:', payload.new)
          if (payload.new?.user_id === user.id) {
            console.log('👤 You were added to a board, refreshing...')
            queryClient.invalidateQueries({ queryKey: ['boards'] })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'board_members',
        },
        (payload) => {
          console.log('🔄 Member removed:', payload.old)
          console.log('👤 Membership deleted, refreshing boards...')
          queryClient.invalidateQueries({ queryKey: ['boards'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'board_members',
        },
        (payload) => {
          console.log('🔄 Member updated:', payload.new)
          if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
            console.log('👤 Your membership updated, refreshing boards...')
            queryClient.invalidateQueries({ queryKey: ['boards'] })
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 Dashboard Realtime status:', status)
      })

    channelRef.current = channel

    return () => {
      console.log('🔴 Cleaning up dashboard Realtime')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, queryClient])
}
