import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { checklistService } from '../../services/checklistService'

function TaskChecklist({ taskId }) {
  const queryClient = useQueryClient()
  const [newItemTitle, setNewItemTitle] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist-items', taskId],
    queryFn: () => checklistService.getChecklistItems(taskId),
  })

  const createMutation = useMutation({
    mutationFn: (title) =>
      checklistService.createChecklistItem(taskId, title, items.length),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
      setNewItemTitle('')
      toast.success('Пункт добавлен')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка добавления пункта')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, updates }) =>
      checklistService.updateChecklistItem(itemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка обновления пункта')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: checklistService.deleteChecklistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
      toast.success('Пункт удален')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления пункта')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isCompleted }) =>
      checklistService.toggleChecklistItem(itemId, isCompleted),
    onMutate: async ({ itemId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ['checklist-items', taskId] })
      const previousItems = queryClient.getQueryData(['checklist-items', taskId])

      queryClient.setQueryData(['checklist-items', taskId], (old) =>
        old?.map((item) =>
          item.id === itemId ? { ...item, is_completed: isCompleted } : item
        )
      )

      return { previousItems }
    },
    onError: (error, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['checklist-items', taskId], context.previousItems)
      }
      toast.error('Ошибка обновления статуса')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
    },
  })

  const handleAddItem = (e) => {
    e.preventDefault()
    if (!newItemTitle.trim()) return
    createMutation.mutate(newItemTitle.trim())
  }

  const handleToggle = (item) => {
    toggleMutation.mutate({ itemId: item.id, isCompleted: !item.is_completed })
  }

  const handleStartEdit = (item) => {
    setEditingId(item.id)
    setEditingTitle(item.title)
  }

  const handleSaveEdit = (itemId) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    updateMutation.mutate(
      { itemId, updates: { title: editingTitle.trim() } },
      {
        onSuccess: () => {
          setEditingId(null)
          toast.success('Пункт обновлен')
        },
      }
    )
  }

  const completedCount = items.filter((item) => item.is_completed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            Чек-лист ({completedCount}/{totalCount})
          </h4>
          {totalCount > 0 && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleAddItem} className="mb-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Добавить пункт..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newItemTitle.trim() || createMutation.isPending}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          Нет пунктов в чек-листе
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group"
            >
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={() => handleToggle(item)}
                className="w-4 h-4 text-blue-600 dark:text-blue-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              {editingId === item.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleSaveEdit(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(item.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-blue-500 dark:border-blue-400 dark:bg-gray-700 dark:text-white rounded focus:outline-none"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => handleStartEdit(item)}
                  className={`flex-1 text-sm cursor-pointer ${
                    item.is_completed
                      ? 'line-through text-gray-500 dark:text-gray-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.title}
                </span>
              )}
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                title="Удалить"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TaskChecklist
