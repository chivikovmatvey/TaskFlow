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
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, updates }) =>
      checklistService.updateChecklistItem(itemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const deleteMutation = useMutation({
    mutationFn: checklistService.deleteChecklistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
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

  const handleSaveEdit = (itemId) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    updateMutation.mutate(
      { itemId, updates: { title: editingTitle.trim() } },
      { onSuccess: () => setEditingId(null) }
    )
  }

  const completedCount = items.filter((item) => item.is_completed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h4 className="font-display text-lg tracking-display-md text-ink dark:text-canvas">
            Чек-лист
          </h4>
          <span className="text-xs tabular-nums text-ink-muted dark:text-ink-muted-soft font-medium">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="h-1 bg-canvas-soft dark:bg-navy-soft rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-coral transition-all duration-500 ease-smooth"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <form onSubmit={handleAddItem} className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Добавить пункт..."
            className="flex-1 px-3 py-2 text-sm bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring"
          />
          <button
            type="submit"
            disabled={!newItemTitle.trim() || createMutation.isPending}
            className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Добавить
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-center py-4 text-sm text-ink-muted-soft animate-shimmer">Загрузка</div>
      ) : items.length === 0 ? (
        <div className="text-center py-4 text-sm text-ink-muted-soft">Нет пунктов</div>
      ) : (
        <div className="space-y-0.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md group transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleMutation.mutate({ itemId: item.id, isCompleted: !item.is_completed })}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  item.is_completed
                    ? 'bg-coral border-coral'
                    : 'border-hairline dark:border-navy-hairline hover:border-coral'
                }`}
              >
                {item.is_completed && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
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
                  className="flex-1 px-2 py-1 text-sm bg-canvas dark:bg-navy-elevated border border-coral rounded-md text-ink dark:text-canvas focus-ring"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => {
                    setEditingId(item.id)
                    setEditingTitle(item.title)
                  }}
                  className={`flex-1 text-sm cursor-pointer ${
                    item.is_completed
                      ? 'line-through text-ink-muted-soft'
                      : 'text-ink dark:text-canvas'
                  }`}
                >
                  {item.title}
                </span>
              )}
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 text-ink-muted-soft hover:text-danger rounded transition-all"
                title="Удалить"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
