import { useState, useEffect } from 'react'
import { getSocket } from '../../services/socketClient'
import { useAuth } from '../../context/AuthContext'

function OnlineUsers({ boardId }) {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!boardId || !user) return
    const socket = getSocket()
    if (!socket) return

    const onState = (presences) => {
      setOnlineUsers(presences)
    }
    const onJoin = (p) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === p.userId)) return prev
        return [...prev, p]
      })
    }
    const onLeave = (p) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== p.userId))
    }

    socket.on('presence:state', onState)
    socket.on('presence:join', onJoin)
    socket.on('presence:leave', onLeave)

    return () => {
      socket.off('presence:state', onState)
      socket.off('presence:join', onJoin)
      socket.off('presence:leave', onLeave)
    }
  }, [boardId, user])

  if (onlineUsers.length === 0) return null

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center -space-x-2">
        {onlineUsers.slice(0, 5).map((onlineUser, index) => (
          <div
            key={onlineUser.userId || index}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold text-xs border-2 border-white dark:border-gray-800 shadow-sm"
            title={onlineUser.email}
          >
            {onlineUser.email?.[0]?.toUpperCase()}
          </div>
        ))}
        {onlineUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-semibold text-xs border-2 border-white dark:border-gray-800 shadow-sm">
            +{onlineUsers.length - 5}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {onlineUsers.length} {onlineUsers.length === 1 ? 'онлайн' : 'онлайн'}
        </span>
      </div>
    </div>
  )
}

export default OnlineUsers
