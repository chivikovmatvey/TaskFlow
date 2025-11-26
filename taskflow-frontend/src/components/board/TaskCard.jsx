import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { taskService } from '../../services/taskService'
import TaskModal from '../task/TaskModal'
import ConfirmModal from '../common/ConfirmModal'

function TaskCard({ task, boardId, isDragging, onModalStateChange }) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [modalInitialTab, setModalInitialTab] = useState('details')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuButtonRef = useRef(null)

  const { data: comments } = useQuery({
    queryKey: ['comments', task.id],
    queryFn: () => taskService.getTaskComments(task.id),
    staleTime: 10000,
  })

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['comments', task.id] })
  }, [task.id, queryClient])

  const deleteTaskMutation = useMutation({
    mutationFn: taskService.deleteTask,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })
      const previousBoard = queryClient.getQueryData(['board', boardId])
      queryClient.setQueryData(['board', boardId], (old) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => t.id !== task.id)
          }))
        }
      })
      return { previousBoard }
    },
    onSuccess: () => {
      toast.success('Задача удалена')
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: (error, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      toast.error(error.message || 'Ошибка удаления задачи')
    },
  })

  const archiveTaskMutation = useMutation({
    mutationFn: taskService.archiveTask,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })
      const previousBoard = queryClient.getQueryData(['board', boardId])
      queryClient.setQueryData(['board', boardId], (old) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => t.id !== task.id)
          }))
        }
      })
      return { previousBoard }
    },
    onSuccess: () => {
      toast.success('Задача архивирована')
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['archived-tasks', boardId] })
    },
    onError: (error, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      toast.error(error.message || 'Ошибка архивирования')
    },
  })

  const duplicateTaskMutation = useMutation({
    mutationFn: taskService.duplicateTask,
    onSuccess: () => {
      toast.success('Задача скопирована')
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка копирования')
    },
  })

  const handleMenuClick = (e) => {
    e.stopPropagation()
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 140
      })
    }
    setShowMenu(!showMenu)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setDeleteConfirm(true)
    setShowMenu(false)
  }

  const handleArchive = (e) => {
    e.stopPropagation()
    archiveTaskMutation.mutate(task.id)
    setShowMenu(false)
  }

  const handleDuplicate = (e) => {
    e.stopPropagation()
    duplicateTaskMutation.mutate(task.id)
    setShowMenu(false)
  }

  const handleCardClick = (e) => {
    if (isDragging) {
      e.preventDefault()
      return
    }
    setModalInitialTab('details')
    setShowModal(true)
    if (onModalStateChange) onModalStateChange(true)
  }

  const handleCommentsClick = (e) => {
    e.stopPropagation()
    if (isDragging) return
    setModalInitialTab('comments')
    setShowModal(true)
    if (onModalStateChange) onModalStateChange(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    if (onModalStateChange) onModalStateChange(false)
  }

  const confirmDelete = () => {
    deleteTaskMutation.mutate(task.id)
    setDeleteConfirm(false)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 border-red-300 text-red-700'
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-700'
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-700'
      case 'low': return 'bg-green-100 border-green-300 text-green-700'
      default: return 'bg-gray-100 border-gray-300 text-gray-700'
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return 'Срочно'
      case 'high': return 'Высокий'
      case 'low': return 'Низкий'
      case 'medium': return 'Средний'
      default: return ''
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const commentsCount = comments?.length || 0

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer border border-gray-200 group relative"
      >
        <div className="absolute top-2 right-2">
          <button
            ref={menuButtonRef}
            onClick={handleMenuClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        <div className="pr-6">
          <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-2">
          {task.priority && (
            <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
          )}

          {task.due_date && (
            <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
              isOverdue
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(task.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>

          <button
            onClick={handleCommentsClick}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition ${
              commentsCount > 0
                ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                : 'bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
            title="Открыть комментарии"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {commentsCount}
          </button>
        </div>
      </div>

      {/* Menu Portal */}
      {showMenu && createPortal(
        <>
          <div 
            className="fixed inset-0" 
            onClick={() => setShowMenu(false)}
          />
          <div 
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
          >
            <button
              onClick={handleDuplicate}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Копировать
            </button>
            <button
              onClick={handleArchive}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Архивировать
            </button>
            <hr className="my-1" />
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Удалить
            </button>
          </div>
        </>,
        document.body
      )}

      {showModal && (
        <TaskModal task={task} boardId={boardId} onClose={handleCloseModal} initialTab={modalInitialTab} />
      )}

      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Удалить задачу?"
        message={`Вы уверены, что хотите удалить задачу "${task.title}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </>
  )
}

export default TaskCard