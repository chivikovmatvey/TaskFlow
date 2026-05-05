import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { taskService } from '../../services/taskService'
import { labelService } from '../../services/labelService'
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

  const { data: taskLabels = [] } = useQuery({
    queryKey: ['task-labels', task.id],
    queryFn: () => labelService.getTaskLabels(task.id),
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

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent': return { dot: 'bg-danger', text: 'text-danger', label: 'Срочно' }
      case 'high':   return { dot: 'bg-amber',  text: 'text-amber',  label: 'Высокий' }
      case 'medium': return { dot: 'bg-coral',  text: 'text-coral',  label: 'Средний' }
      case 'low':    return { dot: 'bg-teal',   text: 'text-teal',   label: 'Низкий' }
      default: return null
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const commentsCount = comments?.length || 0
  const priorityStyle = getPriorityStyle(task.priority)

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-canvas dark:bg-navy-elevated rounded-lg p-3.5 cursor-pointer border border-hairline dark:border-navy-hairline hover:border-coral/40 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 ease-smooth group relative"
      >
        <div className="absolute top-2 right-2">
          <button
            ref={menuButtonRef}
            onClick={handleMenuClick}
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="6" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Labels */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {taskLabels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: `${label.color}1A`,
                  color: label.color,
                  border: `1px solid ${label.color}33`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        <div className="pr-6">
          <h4 className="text-sm font-medium text-ink dark:text-canvas leading-snug mb-1.5">{task.title}</h4>
        </div>

        {task.description && (
          <p className="text-xs text-ink-muted dark:text-ink-muted-soft line-clamp-2 mb-2.5 leading-relaxed">
            {task.description}
          </p>
        )}

        {(priorityStyle || task.due_date) && (
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            {priorityStyle && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${priorityStyle.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                {priorityStyle.label}
              </span>
            )}

            {task.due_date && (
              <div className={`text-[11px] inline-flex items-center gap-1 font-medium ${
                isOverdue ? 'text-danger' : 'text-ink-muted dark:text-ink-muted-soft'
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </div>
        )}

        <div className="pt-2.5 border-t border-hairline-soft dark:border-navy-hairline flex items-center justify-between">
          <div className="flex items-center text-[11px] text-ink-muted-soft">
            {new Date(task.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </div>

          <button
            onClick={handleCommentsClick}
            className={`text-[11px] inline-flex items-center gap-1 transition-colors font-medium ${
              commentsCount > 0
                ? 'text-coral hover:text-coral-active'
                : 'text-ink-muted-soft hover:text-ink-body'
            }`}
            title="Открыть комментарии"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {commentsCount > 0 ? commentsCount : ''}
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
            className="fixed bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-lg shadow-lift-lg py-1 min-w-[160px] animate-scaleIn"
            style={{ top: menuPosition.top, left: menuPosition.left, zIndex: 9999, transformOrigin: 'top right' }}
          >
            <button
              onClick={handleDuplicate}
              className="w-full px-3 py-2 text-left text-sm text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft hover:text-ink dark:hover:text-canvas transition-colors"
            >
              Копировать
            </button>
            <button
              onClick={handleArchive}
              className="w-full px-3 py-2 text-left text-sm text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft hover:text-ink dark:hover:text-canvas transition-colors"
            >
              Архивировать
            </button>
            <div className="my-1 mx-2 h-px bg-hairline dark:bg-navy-hairline" />
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 transition-colors"
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