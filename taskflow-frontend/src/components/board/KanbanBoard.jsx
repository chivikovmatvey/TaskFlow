import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import toast from 'react-hot-toast'
import SortableTaskCard from './SortableTaskCard'
import ConfirmModal from '../common/ConfirmModal'
import TaskModal from '../task/TaskModal'
import { taskService } from '../../services/taskService'
import { columnService } from '../../services/columnService'
import { useBoardPermissions } from '../../hooks/useBoardPermissions'
import { useAuth } from '../../context/AuthContext'

function KanbanBoard({ column, boardId, onModalStateChange }) {
  const queryClient = useQueryClient()
  const permissions = useBoardPermissions(boardId)
  const { user } = useAuth()
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(column.title)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [newlyCreatedTask, setNewlyCreatedTask] = useState(null)

  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
  })

  const board = queryClient.getQueryData(['board', boardId])

  const createTaskMutation = useMutation({
    mutationFn: ({ columnId, boardId, title, position }) =>
      taskService.createTask(columnId, boardId, title, '', position),
    onMutate: async ({ columnId, title, position }) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })

      const previousBoard = queryClient.getQueryData(['board', boardId])

      const tempId = `temp-${Date.now()}`

      queryClient.setQueryData(['board', boardId], (old) => {
        if (!old) return old

        const newColumns = old.columns.map((col) => {
          if (col.id === columnId) {
            return {
              ...col,
              tasks: [
                ...col.tasks,
                {
                  id: tempId,
                  title,
                  description: '',
                  column_id: columnId,
                  board_id: boardId,
                  position,
                  priority: 'medium',
                  created_by: user?.id,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          }
          return col
        })

        return { ...old, columns: newColumns }
      })

      return { previousBoard }
    },
    onSuccess: (data) => {
      toast.success('Задача создана!')
      setShowAddTask(false)
      setNewTaskTitle('')

      queryClient.invalidateQueries({ queryKey: ['board', boardId] })

      if (data) {
        setNewlyCreatedTask(data)
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      toast.error(error.message || 'Ошибка создания задачи')
    },
  })

  const updateColumnMutation = useMutation({
    mutationFn: ({ columnId, title }) =>
      columnService.updateColumn(columnId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      toast.success('Название колонки обновлено')
      setIsEditingTitle(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка обновления колонки')
      setEditedTitle(column.title)
    },
  })

  const deleteColumnMutation = useMutation({
    mutationFn: columnService.deleteColumn,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })

      const previousBoard = queryClient.getQueryData(['board', boardId])

      queryClient.setQueryData(['board', boardId], (old) => {
        if (!old) return old

        return {
          ...old,
          columns: old.columns.filter(col => col.id !== column.id)
        }
      })

      return { previousBoard }
    },
    onSuccess: () => {
      toast.success('Колонка удалена')
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: (error, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      toast.error(error.message || 'Ошибка удаления колонки')
    },
  })

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const position = column.tasks?.length || 0
    createTaskMutation.mutate({
      columnId: column.id,
      boardId,
      title: newTaskTitle,
      position,
    })
  }

  const handleUpdateTitle = () => {
    const trimmedTitle = editedTitle.trim()

    if (!trimmedTitle) {
      toast.error('Название колонки не может быть пустым')
      setEditedTitle(column.title)
      setIsEditingTitle(false)
      return
    }

    if (trimmedTitle === column.title) {
      setIsEditingTitle(false)
      return
    }

    if (board?.columns) {
      const isDuplicate = board.columns.some(
        (col) => col.id !== column.id && col.title.toLowerCase() === trimmedTitle.toLowerCase()
      )

      if (isDuplicate) {
        toast.error('Колонка с таким названием уже существует')
        setEditedTitle(column.title)
        setIsEditingTitle(false)
        return
      }
    }

    updateColumnMutation.mutate({
      columnId: column.id,
      title: trimmedTitle,
    })
  }

  const handleDeleteColumn = () => {
    deleteColumnMutation.mutate(column.id)
    setDeleteConfirm(false)
  }

  const tasks = column.tasks || []
  const taskIds = tasks.map((task) => task.id)

  return (
    <>
      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-3 flex flex-col flex-1 min-h-0 transition-colors duration-300">
        {/* Column Header */}
        <div className="mb-3 px-1 flex items-center justify-between group">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateTitle()
                if (e.key === 'Escape') {
                  setIsEditingTitle(false)
                  setEditedTitle(column.title)
                }
              }}
              className="font-display text-lg tracking-display-md text-ink dark:text-canvas bg-canvas dark:bg-navy-elevated px-2 py-1 border border-coral rounded-md w-full focus-ring"
              autoFocus
            />
          ) : (
            <>
              <h3
                className={`flex items-baseline gap-2 flex-1 min-w-0 ${
                  permissions.canManageColumns ? 'cursor-pointer' : ''
                }`}
                onClick={() => permissions.canManageColumns && setIsEditingTitle(true)}
                title={permissions.canManageColumns ? "Нажмите, чтобы изменить название" : ""}
              >
                <span className="font-display text-lg tracking-display-md text-ink dark:text-canvas leading-none truncate hover:text-coral transition-colors">
                  {column.title}
                </span>
                <span className="text-xs tabular-nums text-ink-muted dark:text-ink-muted-soft font-medium">
                  {column.tasks?.length || 0}
                </span>
              </h3>

              {permissions.canManageColumns && (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted dark:text-ink-muted-soft hover:text-danger p-1 rounded-md"
                  title="Удалить колонку"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        {/* Tasks List with Droppable */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-[100px] scrollbar-thin pr-0.5"
          >
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                boardId={boardId}
                onModalStateChange={onModalStateChange}
              />
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 px-2">
                <p className="text-xs text-ink-muted-soft tracking-wide">
                  Пусто
                </p>
              </div>
            )}
          </div>
        </SortableContext>

        {/* Add Task */}
        {showAddTask ? (
          <form onSubmit={handleAddTask} className="mt-1 animate-scaleIn">
            <textarea
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Название задачи..."
              className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring resize-none text-sm"
              rows="2"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="px-3 py-1.5 bg-coral text-white text-sm font-medium rounded-md hover:bg-coral-active transition-colors disabled:opacity-50"
              >
                Добавить
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTask(false)
                  setNewTaskTitle('')
                }}
                className="px-3 py-1.5 text-ink-body dark:text-ink-muted text-sm font-medium rounded-md hover:bg-canvas dark:hover:bg-navy-elevated transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full py-2 px-3 text-sm text-ink-muted dark:text-ink-muted-soft hover:text-coral hover:bg-canvas dark:hover:bg-navy-elevated rounded-md transition-all duration-200 flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Добавить задачу
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteColumn}
        title="Удалить колонку?"
        message={`Вы уверены, что хотите удалить колонку "${column.title}"? Все задачи (${column.tasks?.length || 0}) в ней будут удалены без возможности восстановления.`}
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />

      {newlyCreatedTask && (
        <TaskModal
          task={newlyCreatedTask}
          boardId={boardId}
          onClose={() => setNewlyCreatedTask(null)}
          initialTab="details"
        />
      )}
    </>
  )
}

export default KanbanBoard