import { useMemo } from 'react'

function BoardStatistics({ board }) {
  const stats = useMemo(() => {
    if (!board?.columns) return null

    const allTasks = board.columns
      .flatMap(col => col.tasks || [])
      .filter(task => !task.is_archived)
    
    const totalTasks = allTasks.length
    
    const byPriority = {
      urgent: allTasks.filter(t => t.priority === 'urgent').length,
      high: allTasks.filter(t => t.priority === 'high').length,
      medium: allTasks.filter(t => t.priority === 'medium').length,
      low: allTasks.filter(t => t.priority === 'low').length,
    }

    const now = new Date()
    now.setHours(23, 59, 59, 999)
    const overdue = allTasks.filter(t => {
      if (!t.due_date) return false
      return new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0))
    }).length
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const dueToday = allTasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate.getTime() === today.getTime()
    }).length

    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const dueThisWeek = allTasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate >= today && dueDate < weekFromNow
    }).length

    const byColumn = board.columns.map(col => {
      const activeTasks = (col.tasks || []).filter(t => !t.is_archived)
      return {
        id: col.id,
        title: col.title,
        count: activeTasks.length,
        percentage: totalTasks > 0 ? Math.round(activeTasks.length / totalTasks * 100) : 0
      }
    })

    const lastColumn = board.columns[board.columns.length - 1]
    const completedTasks = lastColumn?.tasks?.filter(t => !t.is_archived).length || 0
    const progressPercentage = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0

    return {
      totalTasks,
      byPriority,
      overdue,
      dueToday,
      dueThisWeek,
      byColumn,
      completedTasks,
      progressPercentage
    }
  }, [board])

  if (!stats) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Статистика доски</h3>
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
          Всего задач: {stats.totalTasks}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-medium">Общий прогресс выполнения</span>
          <span className="font-bold text-green-600 dark:text-green-400">{stats.progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${stats.progressPercentage}%` }}
          />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {stats.completedTasks} из {stats.totalTasks} задач выполнено
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl p-4 shadow-sm">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{stats.byPriority.urgent + stats.byPriority.high}</div>
          <div className="text-sm font-medium text-red-800 dark:text-red-300">Приоритетные</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 shadow-sm">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{stats.dueToday}</div>
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Сегодня</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4 shadow-sm">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{stats.dueThisWeek}</div>
          <div className="text-sm font-medium text-blue-800 dark:text-blue-300">На этой неделе</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 shadow-sm">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{stats.byPriority.low + stats.byPriority.medium}</div>
          <div className="text-sm font-medium text-green-800 dark:text-green-300">Обычные</div>
        </div>
      </div>

      {stats.overdue > 0 && (
        <div className="mb-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium opacity-90">Просроченные задачи</div>
              <div className="text-3xl font-bold mt-1">{stats.overdue}</div>
            </div>
            <div className="text-5xl opacity-30">⚠</div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Распределение по колонкам</div>
        <div className="space-y-3">
          {stats.byColumn.map(col => (
            <div key={col.id} className="flex items-center gap-3">
              <div className="w-28 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{col.title}</div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${col.percentage}%` }}
                />
              </div>
              <div className="w-20 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
                {col.count} ({col.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Детализация по приоритетам</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.byPriority.urgent}</div>
            <div className="text-xs text-red-700 dark:text-red-300 mt-1">Срочно</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.byPriority.high}</div>
            <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">Высокий</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.byPriority.medium}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Средний</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.byPriority.low}</div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">Низкий</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BoardStatistics