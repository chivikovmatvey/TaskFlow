import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { boardMemberService } from '../../services/boardMemberService'
import { useAuth } from '../../context/AuthContext'
import InviteMemberModal from './InviteMemberModal'
import ConfirmModal from '../common/ConfirmModal'

function BoardMembers({ boardId, isOwner }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState(null)

  const { data: members, isLoading, error } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => boardMemberService.getBoardMembers(boardId),
    retry: 1,
  })

  const removeMemberMutation = useMutation({
    mutationFn: boardMemberService.removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setMemberToRemove(null)
      queryClient.refetchQueries({ queryKey: ['board-members', boardId] })
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления участника')
    },
  })

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 border border-purple-300">Владелец</span>
      case 'admin':
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 border border-blue-300">Админ</span>
      case 'member':
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 border border-green-300">Участник</span>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-red-600">Ошибка загрузки участников</p>
      </div>
    )
  }

  if (!isOwner) {
    return null
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Участники ({(members?.length || 0) + 1})
          </h3>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Пригласить
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 text-white flex items-center justify-center font-semibold">
                {user?.email?.[0]?.toUpperCase() || 'В'}
              </div>
              <div>
                <div className="font-medium text-gray-900">{user?.email || 'Владелец'}</div>
                <div className="text-xs text-gray-500">Вы</div>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
              Владелец
            </span>
          </div>

          {members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold">
                  {member.profiles?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {member.profiles?.email || 'Неизвестный пользователь'}
                    {member.user_id === user?.id && (
                      <span className="ml-2 text-xs text-gray-500">(Вы)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Присоединился {new Date(member.invited_at || member.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {getRoleBadge(member.role)}

                {member.role !== 'owner' && (
                  <button
                    onClick={() => setMemberToRemove(member)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Удалить участника"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInviteModal && (
        <InviteMemberModal
          boardId={boardId}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => removeMemberMutation.mutate(memberToRemove.id)}
        title="Удалить участника?"
        message={`Вы уверены, что хотите удалить ${memberToRemove?.profiles?.email || 'участника'} из доски?`}
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </>
  )
}

export default BoardMembers