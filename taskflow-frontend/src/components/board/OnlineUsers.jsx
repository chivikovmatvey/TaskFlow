import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'

function OnlineUsers({ boardId }) {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!boardId || !user) return

    const channel = supabase.channel(`board-${boardId}-presence`)

    // Отслеживаем присутствие
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state).flat()
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Добавляем себя в список онлайн пользователей
          await channel.track({
            user_id: user.id,
            email: user.email,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [boardId, user])

  if (onlineUsers.length === 0) return null

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center -space-x-2">
        {onlineUsers.slice(0, 5).map((onlineUser, index) => (
          <div
            key={onlineUser.user_id || index}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold text-xs border-2 border-white shadow-sm"
            title={onlineUser.email}
          >
            {onlineUser.email?.[0]?.toUpperCase()}
          </div>
        ))}
        {onlineUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold text-xs border-2 border-white shadow-sm">
            +{onlineUsers.length - 5}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">
          {onlineUsers.length} {onlineUsers.length === 1 ? 'онлайн' : 'онлайн'}
        </span>
      </div>
    </div>
  )
}

export default OnlineUsers