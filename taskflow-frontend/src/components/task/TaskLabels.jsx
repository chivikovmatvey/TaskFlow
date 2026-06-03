import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { labelService } from '../../services/labelService'
import ColorPicker, { DEFAULT_PRESETS as PRESET_COLORS } from '../common/ColorPicker'

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
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const removeLabelMutation = useMutation({
    mutationFn: (labelId) => labelService.removeLabelFromTask(taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-labels', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
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
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const handleCreateLabel = (e) => {
    e.preventDefault()
    if (!newLabelName.trim()) return
    createLabelMutation.mutate()
  }

  const handleToggleLabel = (label) => {
    const isAdded = taskLabels.some(tl => tl.id === label.id)
    if (isAdded) removeLabelMutation.mutate(label.id)
    else addLabelMutation.mutate(label.id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
          Метки
        </h4>
        <button
          onClick={() => setShowLabelMenu(!showLabelMenu)}
          className="text-xs font-medium text-coral hover:text-coral-active transition-colors"
        >
          {showLabelMenu ? 'Закрыть' : 'Управление'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {taskLabels.length === 0 ? (
          <span className="text-sm text-ink-muted-soft">Нет меток</span>
        ) : (
          taskLabels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium animate-scaleIn"
              style={{
                backgroundColor: `${label.color}1A`,
                color: label.color,
                border: `1px solid ${label.color}55`,
              }}
            >
              {label.name}
              <button
                onClick={() => removeLabelMutation.mutate(label.id)}
                className="hover:bg-black/10 rounded-full p-0.5 -mr-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))
        )}
      </div>

      {showLabelMenu && (
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-3 space-y-2 animate-slideUp">
          {boardLabels.length > 0 && (
            <div className="space-y-0.5">
              {boardLabels.map((label) => {
                const isAdded = taskLabels.some(tl => tl.id === label.id)
                return (
                  <button
                    key={label.id}
                    onClick={() => handleToggleLabel(label)}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-canvas dark:hover:bg-navy-elevated transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm text-ink dark:text-canvas">{label.name}</span>
                    </div>
                    {isAdded && (
                      <svg className="w-4 h-4 text-coral" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {showCreateLabel ? (
            <form onSubmit={handleCreateLabel} className="space-y-3 pt-2 border-t border-hairline dark:border-navy-hairline animate-fadeIn">
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Название метки"
                className="w-full px-3 py-2 text-sm bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring"
                autoFocus
              />
              <ColorPicker value={newLabelColor} onChange={setNewLabelColor} label={null} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newLabelName.trim() || createLabelMutation.isPending}
                  className="flex-1 px-3 py-1.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateLabel(false)
                    setNewLabelName('')
                  }}
                  className="px-3 py-1.5 text-ink-body dark:text-ink-muted text-sm font-medium rounded-md hover:bg-canvas dark:hover:bg-navy-elevated transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateLabel(true)}
              className="w-full px-3 py-2 text-sm text-coral hover:bg-coral-soft rounded-md transition-colors flex items-center gap-2 group"
            >
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Создать метку
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskLabels
