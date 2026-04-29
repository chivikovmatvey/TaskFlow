import { useQuery } from '@tanstack/react-query'
import { boardService } from '../services/boardService'
import { useAuth } from '../context/AuthContext'

const DEFAULT = {
  isOwner: false,
  isAdmin: false,
  canManageColumns: false,
  canManageMembers: false,
  canManageTasks: false,
  role: null,
}

export function useBoardPermissions(boardId) {
  const { user } = useAuth()

  const { data: permissions } = useQuery({
    queryKey: ['board-permissions', boardId, user?.id],
    queryFn: () => boardService.getBoardPermissions(boardId),
    enabled: !!boardId && !!user?.id,
    staleTime: 60000,
  })

  return permissions || DEFAULT
}
