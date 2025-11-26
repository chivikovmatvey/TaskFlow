import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { taskService } from '../../services/taskService'
import ConfirmModal from '../common/ConfirmModal'

function CommentItem({ comment, taskId, currentUserId }) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(comment.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isOwner = comment.user_id === currentUserId

  const updateCommentMutation = useMutation({
    mutationFn: (content) => taskService.updateComment(comment.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      toast.success('Комментарий обновлен')
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка обновления комментария')
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: () => taskService.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      toast.success('Комментарий удален')

      queryClient.refetchQueries({ queryKey: ['comments', taskId] })
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления комментария')
    },
  })

  const handleSave = () => {
    if (!editedContent.trim()) {
      toast.error('Комментарий не может быть пустым')
      return
    }

    if (editedContent === comment.content) {
      setIsEditing(false)
      return
    }

    updateCommentMutation.mutate(editedContent)
  }

  const handleDelete = () => {
    deleteCommentMutation.mutate()
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <div className="bg-white border rounded-lg p-4 hover:border-gray-300 transition">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {isOwner ? currentUserId?.[0]?.toUpperCase() : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {isOwner ? 'Вы' : 'Пользователь'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {comment.updated_at && comment.updated_at !== comment.created_at && (
                  <span className="text-xs text-gray-400 italic">
                    (изменено)
                  </span>
                )}
              </div>

              {isOwner && !isEditing && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition"
                    title="Редактировать"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Удалить"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  rows="3"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={updateCommentMutation.isPending}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {updateCommentMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedContent(comment.content)
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Удалить комментарий?"
        message="Вы уверены, что хотите удалить этот комментарий? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </>
  )
}

export default CommentItem