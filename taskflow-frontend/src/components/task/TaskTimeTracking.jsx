import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { timeTrackingService } from '../../services/timeTrackingService'
import { useAuth } from '../../context/AuthContext'

function TaskTimeTracking({ taskId, canEdit }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isRunning, setIsRunning] = useState(false)
  const [currentTimer, setCurrentTimer] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualEntry, setManualEntry] = useState({ duration: '', notes: '' })

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-tracking', taskId],
    queryFn: () => timeTrackingService.getTaskTimeTracking(taskId),
  })

  const { data: totalTime = 0 } = useQuery({
    queryKey: ['total-time', taskId],
    queryFn: () => timeTrackingService.getTotalTaskTime(taskId),
  })

  useEffect(() => {
    const checkActiveTimer = async () => {
      if (!user) return
      const activeTimer = await timeTrackingService.getActiveTimer(taskId, user.id)
      if (activeTimer) {
        setCurrentTimer(activeTimer)
        setIsRunning(true)
      }
    }
    checkActiveTimer()
  }, [taskId, user])

  useEffect(() => {
    let interval
    if (isRunning && currentTimer) {
      interval = setInterval(() => {
        const now = new Date()
        const start = new Date(currentTimer.started_at)
        setElapsedTime(Math.floor((now - start) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, currentTimer])

  const startTimerMutation = useMutation({
    mutationFn: () => timeTrackingService.startTimer(taskId, user.id),
    onSuccess: (data) => {
      setCurrentTimer(data)
      setIsRunning(true)
      toast.success('Таймер запущен')
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const stopTimerMutation = useMutation({
    mutationFn: () => timeTrackingService.stopTimer(currentTimer.id),
    onSuccess: () => {
      setIsRunning(false)
      setCurrentTimer(null)
      setElapsedTime(0)
      toast.success('Таймер остановлен')
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
      queryClient.invalidateQueries({ queryKey: ['total-time', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const addManualEntryMutation = useMutation({
    mutationFn: () => {
      const timeParts = manualEntry.duration.split(':')
      if (timeParts.length !== 2) throw new Error('Формат: ЧЧ:ММ')
      const hours = parseInt(timeParts[0], 10)
      const minutes = parseInt(timeParts[1], 10)
      if (isNaN(hours) || isNaN(minutes)) throw new Error('Формат: ЧЧ:ММ')
      const seconds = hours * 3600 + minutes * 60
      return timeTrackingService.addDurationEntry(taskId, user.id, seconds, manualEntry.notes)
    },
    onSuccess: () => {
      toast.success('Запись добавлена')
      setShowManualForm(false)
      setManualEntry({ duration: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
      queryClient.invalidateQueries({ queryKey: ['total-time', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId) => timeTrackingService.deleteTimeEntry(entryId),
    onSuccess: () => {
      toast.success('Запись удалена')
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
      queryClient.invalidateQueries({ queryKey: ['total-time', taskId] })
    },
    onError: (error) => toast.error(error.message || 'Ошибка'),
  })

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {/* Total time */}
      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-1">
            Учёт времени
          </p>
          <p className="text-xs text-ink-muted dark:text-ink-muted-soft">
            Всего затрачено
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-4xl tracking-display-md text-ink dark:text-canvas tabular-nums leading-none">
            {formatDuration(totalTime + elapsedTime)}
          </p>
        </div>
      </div>

      {/* Timer control */}
      {isRunning ? (
        <div className="bg-canvas-soft dark:bg-navy-soft border border-coral/40 rounded-lg p-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-coral animate-shimmer" />
              <span className="text-xs uppercase tracking-caption-up font-semibold text-coral">
                Идёт сессия
              </span>
            </div>
            <button
              onClick={() => stopTimerMutation.mutate()}
              disabled={stopTimerMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium text-ink dark:text-canvas bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md hover:border-danger hover:text-danger transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 bg-danger rounded-sm" />
              Остановить
            </button>
          </div>
          <p className="font-display text-5xl tracking-display-md text-coral tabular-nums leading-none">
            {formatDuration(elapsedTime)}
          </p>
        </div>
      ) : (
        <button
          onClick={() => startTimerMutation.mutate()}
          disabled={startTimerMutation.isPending}
          className="w-full px-4 py-3 bg-coral hover:bg-coral-active text-white font-medium rounded-lg shadow-coral transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-sm">Запустить таймер</span>
        </button>
      )}

      {/* Manual entry */}
      {canEdit && (
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full text-sm text-ink-muted dark:text-ink-muted-soft hover:text-coral py-2 border border-dashed border-hairline dark:border-navy-hairline hover:border-coral/50 rounded-md transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${showManualForm ? 'rotate-45' : 'group-hover:rotate-90'}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {showManualForm ? 'Отменить' : 'Добавить время вручную'}
        </button>
      )}

      {showManualForm && (
        <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 animate-slideUp">
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Длительность
              </label>
              <input
                type="text"
                value={manualEntry.duration}
                onChange={(e) => setManualEntry({ ...manualEntry, duration: e.target.value })}
                placeholder="2:30"
                className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring font-mono text-base"
              />
              <p className="text-[11px] text-ink-muted-soft mt-1">Формат ЧЧ:ММ — например, 2:30</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Примечание
              </label>
              <input
                type="text"
                value={manualEntry.notes}
                onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
                placeholder="Описание работы"
                className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => addManualEntryMutation.mutate()}
                disabled={!manualEntry.duration || addManualEntryMutation.isPending}
                className="flex-1 px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addManualEntryMutation.isPending ? 'Добавление...' : 'Добавить запись'}
              </button>
              <button
                onClick={() => {
                  setShowManualForm(false)
                  setManualEntry({ duration: '', notes: '' })
                }}
                className="px-4 py-2 text-ink-body dark:text-ink-muted text-sm font-medium rounded-md hover:bg-canvas dark:hover:bg-navy-elevated transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {timeEntries.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3 mt-2">
            <h5 className="font-display text-lg tracking-display-md text-ink dark:text-canvas">
              История
            </h5>
            <span className="text-xs tabular-nums text-ink-muted dark:text-ink-muted-soft font-medium">
              {timeEntries.length}
            </span>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md p-3 hover:border-coral/40 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-ink dark:text-canvas tabular-nums">
                        {formatDuration(entry.duration || 0)}
                      </span>
                      {!entry.ended_at && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-coral-soft text-coral">
                          <span className="w-1.5 h-1.5 bg-coral rounded-full animate-shimmer" />
                          Активна
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted dark:text-ink-muted-soft">
                      {formatDate(entry.started_at)}
                      {entry.ended_at && ` → ${formatDate(entry.ended_at)}`}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-ink-body dark:text-ink-muted mt-1.5 italic border-l-2 border-coral pl-2">
                        {entry.notes}
                      </p>
                    )}
                    <p className="text-[11px] text-ink-muted-soft mt-1">
                      {entry.user?.email || '—'}
                    </p>
                  </div>
                  {canEdit && entry.ended_at && (
                    <button
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      disabled={deleteEntryMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-muted-soft hover:text-danger rounded transition-all"
                      title="Удалить запись"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskTimeTracking
