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
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Статистика</h3>
        <span className="text-sm text-gray-500">Всего задач: {stats.totalTasks}</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Прогресс</span>
          <span className="font-medium text-gray-900">{stats.progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.progressPercentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {stats.completedTasks} из {stats.totalTasks} задач выполнено
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.overdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-red-700">Просрочено</div>
          </div>
        )}
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600">{stats.byPriority.urgent}</div>
          <div className="text-xs text-purple-700">Срочно</div>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Распределение по колонкам</div>
        <div className="space-y-2">
          {stats.byColumn.map(col => (
            <div key={col.id} className="flex items-center gap-3">
              <div className="w-24 text-xs text-gray-600 truncate">{col.title}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${col.percentage}%` }}
                />
              </div>
              <div className="w-16 text-xs text-gray-600 text-right">
                {col.count} ({col.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="text-sm font-medium text-gray-700 mb-2">По приоритету</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
            Срочно: {stats.byPriority.urgent}
          </span>
          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
            Высокий: {stats.byPriority.high}
          </span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
            Средний: {stats.byPriority.medium}
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
            Низкий: {stats.byPriority.low}
          </span>
        </div>
      </div>
    </div>
  )
}

export default BoardStatistics