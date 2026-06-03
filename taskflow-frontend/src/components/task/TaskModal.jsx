import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { taskService } from '../../services/taskService'
import { boardService } from '../../services/boardService'
import { authService } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'
import CommentThread from './CommentThread'
import TaskAttachments from './TaskAttachments'
import TaskChecklist from './TaskChecklist'
import TaskLabels from './TaskLabels'
import TaskTimeTracking from './TaskTimeTracking'
import { boardMemberService } from '../../services/boardMemberService'
import ConfirmModal from '../common/ConfirmModal'
import Select from '../common/Select'
import AssigneeSelect from '../common/AssigneeSelect'
import { useModalLock } from '../../hooks/useModalLock'

function TaskModal({ task, boardId, onClose, initialTab = 'details' }) {
  useModalLock(true)
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
    staleTime: 0,
    refetchOnMount: true,
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
      try {
        const u = await authService.getUserById(board.owner_id)
        return u?.email || null
      } catch (err) {
        console.error('Error fetching owner email:', err)
        return null
      }
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

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const originalPointerEvents = document.body.style.pointerEvents

    return () => {
      document.body.style.overflow = ''
      document.body.style.pointerEvents = originalPointerEvents
    }
  }, [])

  const tabs = [
    { value: 'details', label: 'Детали' },
    { value: 'comments', label: `Комментарии${comments?.length ? ` · ${comments.length}` : ''}` },
    { value: 'attachments', label: 'Файлы' },
    { value: 'time', label: 'Время' },
  ]

  const inputClass = "w-full px-3 py-2 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
  const labelClass = "block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2"

  return createPortal(
    <>
      <div
        className="modal-overlay fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[60] animate-fadeIn"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        onClick={handleClose}
      >
        <div
          className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg w-full max-w-4xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-hairline dark:border-navy-hairline">
            <div className="flex justify-between items-start gap-3 sm:gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-display text-xl sm:text-3xl tracking-display-md text-ink dark:text-canvas bg-transparent border-none outline-none focus-ring rounded-md px-2 -mx-2 flex-1 leading-tight min-w-0"
                placeholder="Название задачи"
              />
              <button
                onClick={handleClose}
                className="text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors p-1 -m-1 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-1 mt-4 sm:mt-5 -mb-px overflow-x-auto overflow-y-hidden no-scrollbar">
              {tabs.map(t => (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className={`relative shrink-0 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === t.value
                      ? 'text-coral'
                      : 'text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas'
                  }`}
                >
                  {t.label}
                  {activeTab === t.value && (
                    <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-coral animate-fadeIn" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin animate-fadeIn">
            {activeTab === 'details' ? (
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Описание</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${inputClass} resize-none`}
                    placeholder="Добавьте описание..."
                    rows="4"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Приоритет</label>
                    <Select
                      value={priority}
                      onChange={setPriority}
                      options={[
                        { value: 'low', label: 'Низкий', color: '#5db8a6' },
                        { value: 'medium', label: 'Средний', color: '#cc785c' },
                        { value: 'high', label: 'Высокий', color: '#e8a55a' },
                        { value: 'urgent', label: 'Срочно', color: '#c64545' },
                      ]}
                      renderOption={(opt) => (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                        </span>
                      )}
                      renderTrigger={(opt) => (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                        </span>
                      )}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Исполнитель</label>
                    <AssigneeSelect
                      value={assignedTo}
                      onChange={setAssignedTo}
                      members={boardMembers || []}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Срок</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      onClick={(e) => { try { e.currentTarget.showPicker?.() } catch { /* ignore */ } }}
                      onFocus={(e) => { try { e.currentTarget.showPicker?.() } catch { /* ignore */ } }}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </div>
                </div>

                <TaskLabels taskId={task.id} boardId={boardId} />

                <TaskChecklist taskId={task.id} />

                <div className="pt-4 border-t border-hairline dark:border-navy-hairline">
                  <div className="text-[11px] text-ink-muted-soft space-y-0.5">
                    <div>Создано: {new Date(task.created_at).toLocaleString('ru-RU')}</div>
                    {task.updated_at && task.updated_at !== task.created_at && (
                      <div>Обновлено: {new Date(task.updated_at).toLocaleString('ru-RU')}</div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === 'comments' ? (
              <div className="space-y-4">
                <form onSubmit={handleAddComment} className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Добавить комментарий..."
                    className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring resize-none text-sm"
                    rows="3"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
                    >
                      {addCommentMutation.isPending ? 'Отправка...' : 'Добавить'}
                    </button>
                  </div>
                </form>

                {commentsLoading ? (
                  <div className="text-center py-8 text-sm text-ink-muted-soft animate-shimmer">Загрузка</div>
                ) : comments && comments.length > 0 ? (
                  <CommentThread comments={comments} taskId={task.id} currentUserId={user?.id} />
                ) : (
                  <div className="text-center py-12 text-sm text-ink-muted-soft">
                    Пока нет комментариев
                  </div>
                )}
              </div>
            ) : activeTab === 'attachments' ? (
              <TaskAttachments taskId={task.id} />
            ) : activeTab === 'time' ? (
              <TaskTimeTracking taskId={task.id} canEdit={isOwner || task.created_by === user?.id} />
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-hairline dark:border-navy-hairline bg-canvas-soft dark:bg-navy-soft flex justify-between items-center">
            <div className="text-xs">
              {hasChanges && (
                <span className="inline-flex items-center gap-1.5 text-coral font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-coral animate-shimmer" />
                  Несохранённые изменения
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas dark:hover:bg-navy-elevated rounded-md transition-colors"
              >
                {hasChanges ? 'Отмена' : 'Закрыть'}
              </button>
              {activeTab === 'details' && (
                <button
                  onClick={handleSave}
                  disabled={updateTaskMutation.isPending || !hasChanges}
                  className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                >
                  {updateTaskMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
              )}
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
    </>,
    document.body
  )
}

export default TaskModal