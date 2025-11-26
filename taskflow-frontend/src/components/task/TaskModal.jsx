import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { taskService } from '../../services/taskService'
import { useAuth } from '../../context/AuthContext'
import CommentItem from './CommentItem'
import { boardMemberService } from '../../services/boardMemberService'
import ConfirmModal from '../common/ConfirmModal'

function TaskModal({ task, boardId, onClose, initialTab = 'details' }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority || 'medium')
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '')
  const [dueDate, setDueDate] = useState(
    task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', task.id],
    queryFn: () => taskService.getTaskComments(task.id),
    enabled: activeTab === 'comments',
  })

  const { data: boardMembers } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => boardMemberService.getBoardMembers(boardId),
  })
  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoard(boardId),
  })

  const isOwner = board?.owner_id === user?.id

  const { data: ownerEmail } = useQuery({
    queryKey: ['owner-email', board?.owner_id],
    queryFn: async () => {
      if (!board?.owner_id || isOwner) return null
      const { data, error } = await supabase.rpc('get_user_email_by_id', {
        user_id: board.owner_id
      })
      if (error) {
        console.error('Error fetching owner email:', error)
        return null
      }
      return data
    },
    enabled: !!board?.owner_id && !isOwner,
  })

  const getOwnerDisplayEmail = () => {
    if (isOwner && user) {
      return user.email
    }
    return ownerEmail || 'Владелец'
  }
  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== (task.description || '') ||
      priority !== (task.priority || 'medium') ||
      assignedTo !== (task.assigned_to || '') ||
      dueDate !== (task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '')

    setHasChanges(changed)
  }, [title, description, priority, assignedTo, dueDate, task])

  const updateTaskMutation = useMutation({
    mutationFn: (updates) => taskService.updateTask(task.id, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })
      const previousBoard = queryClient.getQueryData(['board', boardId])

      queryClient.setQueryData(['board', boardId], (old) => {
        if (!old) return old
        const newColumns = old.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === task.id ? { ...t, ...updates } : t)),
        }))
        return { ...old, columns: newColumns }
      })

      return { previousBoard }
    },
    onError: (error, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      toast.error(error.message || 'Ошибка обновления задачи')
    },
    onSuccess: () => {
      toast.success('Задача обновлена')
      setHasChanges(false)
      setTimeout(() => onClose(), 300)
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: (content) => taskService.addComment(task.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', task.id] })
      toast.success('Комментарий добавлен')
      setNewComment('')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка добавления комментария')
    },
  })

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Введите название задачи')
      return
    }

    if (!hasChanges) {
      onClose()
      return
    }

    updateTaskMutation.mutate({
      title,
      description,
      priority,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
    })
  }

  const handleAddComment = (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    addCommentMutation.mutate(newComment)
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [hasChanges])

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 -mx-2 flex-1"
                placeholder="Название задачи"
              />
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex space-x-1 mt-4 border-b">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'details'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Детали
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'comments'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Комментарии {comments?.length ? `(${comments.length})` : ''}
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto p-6"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {activeTab === 'details' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Добавьте описание..."
                    rows="4"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                      <option value="urgent">Срочно</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Исполнитель</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Не назначен</option>
                      {board?.owner_id && (
                        <option key={board.owner_id} value={board.owner_id}>
                          {getOwnerDisplayEmail()}
                        </option>
                      )}
                      {boardMembers?.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.profiles?.email || member.user_id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Срок выполнения</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Создано: {new Date(task.created_at).toLocaleString('ru-RU')}</div>
                    {task.updated_at && task.updated_at !== task.created_at && (
                      <div>Обновлено: {new Date(task.updated_at).toLocaleString('ru-RU')}</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleAddComment} className="bg-gray-50 rounded-lg p-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Добавить комментарий..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="3"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {addCommentMutation.isPending ? 'Отправка...' : 'Добавить'}
                    </button>
                  </div>
                </form>

                {commentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : comments && comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} taskId={task.id} currentUserId={user?.id} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>Пока нет комментариев</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {hasChanges && <span className="text-orange-600 font-medium">Есть несохраненные изменения</span>}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  {hasChanges ? 'Отмена' : 'Закрыть'}
                </button>
                {activeTab === 'details' && (
                  <button
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending || !hasChanges}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                  >
                    {updateTaskMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false)
          onClose()
        }}
        title="Закрыть без сохранения?"
        message="У вас есть несохраненные изменения. Вы уверены, что хотите закрыть окно?"
        confirmText="Закрыть"
        cancelText="Остаться"
        type="warning"
      />
    </>
  )
}

export default TaskModal