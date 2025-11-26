import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useBoardPermissions(boardId) {
  const { user } = useAuth()

  const { data: permissions } = useQuery({
    queryKey: ['board-permissions', boardId, user?.id],
    queryFn: async () => {
      if (!boardId || !user?.id) return null

      // Получаем информацию о доске
      const { data: board } = await supabase
        .from('boards')
        .select('owner_id')
        .eq('id', boardId)
        .single()

      // Проверяем роль пользователя
      const { data: member } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single()

      const isOwner = board?.owner_id === user.id
      const role = member?.role || (isOwner ? 'owner' : null)

      return {
        isOwner,
        isAdmin: role === 'admin' || isOwner,
        canManageColumns: role === 'admin' || isOwner,
        canManageMembers: isOwner,
        canManageTasks: true, // Все участники
        role,
      }
    },
    enabled: !!boardId && !!user?.id,
    staleTime: 60000, // Кэшируем на минуту
  })

  return permissions || {
    isOwner: false,
    isAdmin: false,
    canManageColumns: false,
    canManageMembers: false,
    canManageTasks: false,
    role: null,
  }
}