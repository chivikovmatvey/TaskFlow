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
  const [manualEntry, setManualEntry] = useState({
    duration: '',
    notes: ''
  })

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
    onError: (error) => {
      toast.error((error.message || 'Ошибка запуска таймера'))
    },
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
    onError: (error) => {
      toast.error((error.message || 'Ошибка остановки таймера'))
    },
  })

  const addManualEntryMutation = useMutation({
    mutationFn: () => {
      const timeParts = manualEntry.duration.split(':')
      if (timeParts.length !== 2) {
        throw new Error('Неверный формат времени. Используйте ЧЧ:ММ')
      }
      const hours = parseInt(timeParts[0], 10)
      const minutes = parseInt(timeParts[1], 10)
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Неверный формат времени. Используйте ЧЧ:ММ')
      }
      const durationInSeconds = hours * 3600 + minutes * 60
      return timeTrackingService.addDurationEntry(
        taskId,
        user.id,
        durationInSeconds,
        manualEntry.notes
      )
    },
    onSuccess: () => {
      toast.success('Запись времени добавлена')
      setShowManualForm(false)
      setManualEntry({ duration: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
      queryClient.invalidateQueries({ queryKey: ['total-time', taskId] })
    },
    onError: (error) => {
      toast.error((error.message || 'Ошибка добавления записи'))
    },
  })

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId) => timeTrackingService.deleteTimeEntry(entryId),
    onSuccess: () => {
      toast.success('Запись удалена')
      queryClient.invalidateQueries({ queryKey: ['time-tracking', taskId] })
      queryClient.invalidateQueries({ queryKey: ['total-time', taskId] })
    },
    onError: (error) => {
      toast.error((error.message || 'Ошибка удаления записи'))
    },
  })

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with Total Time */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Учет времени</h4>
          </div>
          <div className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Всего затрачено</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatDuration(totalTime + elapsedTime)}</div>
          </div>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        {isRunning ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Таймер активен</span>
              </div>
              <button
                onClick={() => stopTimerMutation.mutate()}
                disabled={stopTimerMutation.isPending}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                ⏹ Остановить
              </button>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-700 dark:text-green-400 mb-1 uppercase tracking-wide">Текущая сессия</div>
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 tabular-nums">{formatDuration(elapsedTime)}</div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => startTimerMutation.mutate()}
            disabled={startTimerMutation.isPending}
            className="w-full px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Запустить таймер</span>
          </button>
        )}
      </div>

      {canEdit && (
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showManualForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
          </svg>
          <span>{showManualForm ? 'Отменить' : 'Добавить время вручную'}</span>
        </button>
      )}

      {showManualForm && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Длительность</label>
              <input
                type="text"
                value={manualEntry.duration}
                onChange={(e) => setManualEntry({ ...manualEntry, duration: e.target.value })}
                placeholder="2:30"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Формат: часы:минуты (например, 2:30)</span>
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Примечание</label>
              <input
                type="text"
                value={manualEntry.notes}
                onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
                placeholder="Описание работы..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => addManualEntryMutation.mutate()}
                disabled={!manualEntry.duration || addManualEntryMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addManualEntryMutation.isPending ? 'Добавление...' : 'Добавить запись'}
              </button>
              <button
                onClick={() => {
                  setShowManualForm(false)
                  setManualEntry({ duration: '', notes: '' })
                }}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {timeEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>История ({timeEntries.length})</span>
            </h5>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:shadow-sm transition group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center space-x-1.5">
                        <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                          {formatDuration(entry.duration || 0)}
                        </span>
                      </div>
                      {!entry.ended_at && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium border border-green-300 dark:border-green-700 flex items-center space-x-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Активна</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-1 mb-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {formatDate(entry.started_at)}
                        {entry.ended_at && ` → ${formatDate(entry.ended_at)}`}
                      </span>
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1.5 bg-white dark:bg-gray-800 rounded px-2 py-1 italic border-l-2 border-blue-400 dark:border-blue-500">
                        "{entry.notes}"
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{entry.user?.email || 'Неизвестно'}</span>
                    </div>
                  </div>
                  {canEdit && entry.ended_at && (
                    <button
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      disabled={deleteEntryMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Удалить запись"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
