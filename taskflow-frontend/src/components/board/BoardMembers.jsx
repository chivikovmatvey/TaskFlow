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
    const styles = {
      owner: 'bg-coral-soft text-coral border-coral/30',
      admin: 'bg-canvas-card dark:bg-navy-elevated text-ink-body dark:text-ink-muted border-hairline dark:border-navy-hairline',
      member: 'bg-canvas-card dark:bg-navy-elevated text-ink-muted dark:text-ink-muted-soft border-hairline dark:border-navy-hairline',
    }
    const labels = { owner: 'Владелец', admin: 'Админ', member: 'Участник' }
    if (!labels[role]) return null
    return (
      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${styles[role]}`}>
        {labels[role]}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-3 mb-3 animate-shimmer">
        <div className="h-12" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-danger/5 border border-danger/30 rounded-lg p-3 mb-3">
        <p className="text-sm text-danger">Ошибка загрузки участников</p>
      </div>
    )
  }

  if (!isOwner) return null

  const totalMembers = (members?.length || 0) + 1

  return (
    <>
      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 mb-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-lg tracking-display-md text-ink dark:text-canvas">
              Участники
            </h3>
            <span className="text-xs tabular-nums text-ink-muted dark:text-ink-muted-soft font-medium">
              {totalMembers}
            </span>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 bg-coral text-white text-xs font-medium rounded-md hover:bg-coral-active transition-colors flex items-center gap-1.5 shadow-coral"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Пригласить
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 bg-canvas dark:bg-navy-elevated rounded-md border border-hairline dark:border-navy-hairline">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-sm">
                {user?.email?.[0]?.toUpperCase() || 'В'}
              </div>
              <div>
                <div className="text-sm font-medium text-ink dark:text-canvas">{user?.email || 'Владелец'}</div>
                <div className="text-[11px] text-ink-muted-soft">Вы</div>
              </div>
            </div>
            {getRoleBadge('owner')}
          </div>

          {members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 bg-canvas dark:bg-navy-elevated rounded-md border border-hairline dark:border-navy-hairline hover:border-coral/40 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-canvas-card dark:bg-navy-soft border border-hairline dark:border-navy-hairline text-ink-body dark:text-ink-muted flex items-center justify-center font-semibold text-sm">
                  {member.profiles?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink dark:text-canvas">
                    {member.profiles?.email || 'Неизвестный'}
                    {member.user_id === user?.id && (
                      <span className="ml-2 text-[11px] text-ink-muted-soft">(Вы)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-muted-soft">
                    {new Date(member.invited_at || member.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getRoleBadge(member.role)}
                {member.role !== 'owner' && (
                  <button
                    onClick={() => setMemberToRemove(member)}
                    className="p-1 text-ink-muted-soft hover:text-danger rounded transition-colors"
                    title="Удалить участника"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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