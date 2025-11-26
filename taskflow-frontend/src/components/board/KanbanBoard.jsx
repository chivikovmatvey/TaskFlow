import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import toast from 'react-hot-toast'
import SortableTaskCard from './SortableTaskCard'
import ConfirmModal from '../common/ConfirmModal'
import { taskService } from '../../services/taskService'
import { columnService } from '../../services/columnService'
import { supabase } from '../../services/supabaseClient'
import { useBoardPermissions } from '../../hooks/useBoardPermissions' // Добавьте импорт

function KanbanBoard({ column, boardId, onModalStateChange }) {
  const queryClient = useQueryClient()
  const permissions = useBoardPermissions(boardId) // Добавьте хук
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(column.title)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Droppable для колонки
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
  })

  // Получаем доску из кэша для проверки уникальности
  const board = queryClient.getQueryData(['board', boardId])

  // Мутация для создания задачи (оптимистичная)
  const createTaskMutation = useMutation({
    mutationFn: ({ columnId, boardId, title, position }) =>
      taskService.createTask(columnId, boardId, title, '', position),
    onMutate: async ({ columnId, title, position }) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })

      const previousBoard = queryClient.getQueryData(['board', boardId])

      const tempId = `temp-${Date.now()}`
      const { data: { user } } = await supabase.auth.getUser()

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
    onSuccess: () => {
      toast.success('Задача создана!')
      setShowAddTask(false)
      setNewTaskTitle('')

      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: (error, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard)
      }
      toast.error(error.message || 'Ошибка создания задачи')
    },
  })

  // Мутация для обновления названия колонки
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

  // Мутация для удаления колонки
  const deleteColumnMutation = useMutation({
    mutationFn: columnService.deleteColumn,
    onMutate: async () => {
      // Оптимистично удаляем из кэша
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

    // Проверка на пустое название
    if (!trimmedTitle) {
      toast.error('Название колонки не может быть пустым')
      setEditedTitle(column.title)
      setIsEditingTitle(false)
      return
    }

    // Проверка на то же самое название
    if (trimmedTitle === column.title) {
      setIsEditingTitle(false)
      return
    }

    // Проверка на уникальность названия
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

    // Обновляем название
    updateColumnMutation.mutate({
      columnId: column.id,
      title: trimmedTitle,
    })
  }

  const handleDeleteColumn = () => {
    deleteColumnMutation.mutate(column.id)
    setDeleteConfirm(false)
  }

  const sortedTasks = [...(column.tasks || [])].sort((a, b) => a.position - b.position)
  const taskIds = sortedTasks.map((task) => task.id)

  return (
    <>
      <div className="flex-shrink-0 w-80">
        <div className="bg-gray-100 rounded-lg p-4 flex flex-col max-h-[calc(100vh-200px)]">
          {/* Column Header */}
          <div className="mb-4 flex items-center justify-between group">
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
                className="font-semibold text-gray-900 px-2 py-1 border-2 border-blue-500 rounded w-full focus:outline-none"
                autoFocus
              />
            ) : (
              <>
                <h3
                  className={`font-semibold text-gray-900 flex-1 ${permissions.canManageColumns ? 'cursor-pointer hover:text-blue-600 transition' : ''
                    }`}
                  onClick={() => permissions.canManageColumns && setIsEditingTitle(true)}
                  title={permissions.canManageColumns ? "Нажмите, чтобы изменить название" : ""}
                >
                  {column.title}
                  <span className="ml-2 text-sm text-gray-500">
                    ({sortedTasks.length})
                  </span>
                </h3>

                {/* Кнопка удаления только для владельца и админов */}
                {permissions.canManageColumns && (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600 p-1"
                    title="Удалить колонку"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[100px]"
            >
              {sortedTasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  boardId={boardId}
                  onModalStateChange={onModalStateChange}
                />
              ))}
              {sortedTasks.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  Перетащите задачу сюда
                </div>
              )}
            </div>
          </SortableContext>

          {/* Add Task - доступно всем участникам */}
          {showAddTask ? (
            <form onSubmit={handleAddTask} className="mt-2">
              <textarea
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Введите название задачи..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="2"
                autoFocus
              />
              <div className="flex space-x-2 mt-2">
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Добавить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTask(false)
                    setNewTaskTitle('')
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddTask(true)}
              className="w-full py-2 text-left text-gray-600 hover:bg-gray-200 rounded-lg transition flex items-center px-3"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить задачу
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteColumn}
        title="Удалить колонку?"
        message={`Вы уверены, что хотите удалить колонку "${column.title}"? Все задачи (${sortedTasks.length}) в ней будут удалены без возможности восстановления.`}
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </>
  )
}

export default KanbanBoard