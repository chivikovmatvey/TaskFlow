import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { labelService } from '../../services/labelService'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
]

function TaskLabels({ taskId, boardId }) {
  const queryClient = useQueryClient()
  const [showLabelMenu, setShowLabelMenu] = useState(false)
  const [showCreateLabel, setShowCreateLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])

  const { data: taskLabels = [] } = useQuery({
    queryKey: ['task-labels', taskId],
    queryFn: () => labelService.getTaskLabels(taskId),
  })

  const { data: boardLabels = [] } = useQuery({
    queryKey: ['board-labels', boardId],
    queryFn: () => labelService.getBoardLabels(boardId),
  })

  const addLabelMutation = useMutation({
    mutationFn: (labelId) => labelService.addLabelToTask(taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-labels', taskId] })
      toast.success('Метка добавлена')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка добавления метки')
    },
  })

  const removeLabelMutation = useMutation({
    mutationFn: (labelId) => labelService.removeLabelFromTask(taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-labels', taskId] })
      toast.success('Метка удалена')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления метки')
    },
  })

  const createLabelMutation = useMutation({
    mutationFn: () => labelService.createLabel(boardId, newLabelName.trim(), newLabelColor),
    onSuccess: (newLabel) => {
      queryClient.invalidateQueries({ queryKey: ['board-labels', boardId] })
      addLabelMutation.mutate(newLabel.id)
      setNewLabelName('')
      setNewLabelColor(PRESET_COLORS[0])
      setShowCreateLabel(false)
      toast.success('Метка создана')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка создания метки')
    },
  })

  const handleCreateLabel = (e) => {
    e.preventDefault()
    if (!newLabelName.trim()) return
    createLabelMutation.mutate()
  }

  const handleToggleLabel = (label) => {
    const isAdded = taskLabels.some(tl => tl.id === label.id)
    if (isAdded) {
      removeLabelMutation.mutate(label.id)
    } else {
      addLabelMutation.mutate(label.id)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Метки</h4>
        <button
          onClick={() => setShowLabelMenu(!showLabelMenu)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {showLabelMenu ? 'Закрыть' : 'Управление'}
        </button>
      </div>

      {/* Display current labels */}
      <div className="flex flex-wrap gap-2 mb-2">
        {taskLabels.length === 0 ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">Нет меток</span>
        ) : (
          taskLabels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
              <button
                onClick={() => removeLabelMutation.mutate(label.id)}
                className="ml-1.5 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))
        )}
      </div>

      {/* Label management menu */}
      {showLabelMenu && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
          {boardLabels.length > 0 && (
            <div className="space-y-1">
              {boardLabels.map((label) => {
                const isAdded = taskLabels.some(tl => tl.id === label.id)
                return (
                  <button
                    key={label.id}
                    onClick={() => handleToggleLabel(label)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm dark:text-white">{label.name}</span>
                    </div>
                    {isAdded && (
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {showCreateLabel ? (
            <form onSubmit={handleCreateLabel} className="space-y-2 pt-2 border-t dark:border-gray-600">
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Название метки"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="grid grid-cols-9 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewLabelColor(color)}
                    className={`w-6 h-6 rounded ${newLabelColor === color ? 'ring-2 ring-offset-2 dark:ring-offset-gray-700 ring-blue-500 dark:ring-blue-400' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={!newLabelName.trim() || createLabelMutation.isPending}
                  className="flex-1 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50"
                >
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateLabel(false)
                    setNewLabelName('')
                  }}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateLabel(true)}
              className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-lg transition"
            >
              + Создать новую метку
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskLabels
