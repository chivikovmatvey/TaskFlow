import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { labelService } from '../../services/labelService'

function SearchAndFilters({ boardId, onSearchChange, onFiltersChange, onSortChange, filters, currentSort }) {
  const [showFilters, setShowFilters] = useState(false)

  const { data: boardLabels = [] } = useQuery({
    queryKey: ['board-labels', boardId],
    queryFn: () => labelService.getBoardLabels(boardId),
  })

  const handlePriorityToggle = (priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority]
    
    onFiltersChange({ ...filters, priorities: newPriorities })
  }

  const handleDateFilterChange = (dateFilter) => {
    onFiltersChange({ ...filters, dateFilter })
  }

  const handleAssigneeChange = (assignee) => {
    onFiltersChange({ ...filters, assignee })
  }

  const handleLabelToggle = (labelId) => {
    const newLabels = filters.labels?.includes(labelId)
      ? filters.labels.filter(l => l !== labelId)
      : [...(filters.labels || []), labelId]

    onFiltersChange({ ...filters, labels: newLabels })
  }

  const resetFilters = () => {
    onFiltersChange({
      priorities: [],
      dateFilter: 'all',
      showOverdue: false,
      assignee: 'all',
      labels: [],
    })
    if (onSortChange) {
      onSortChange({ field: 'position', direction: 'asc' })
    }
  }

  const activeFiltersCount =
    filters.priorities.length +
    (filters.dateFilter !== 'all' ? 1 : 0) +
    (filters.showOverdue ? 1 : 0) +
    (filters.assignee && filters.assignee !== 'all' ? 1 : 0) +
    (filters.labels?.length || 0)

  const sortOptions = [
    { value: 'position', label: 'По умолчанию' },
    { value: 'priority', label: 'По приоритету' },
    { value: 'due_date', label: 'По сроку' },
    { value: 'created_at', label: 'По дате создания' },
    { value: 'title', label: 'По названию' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Поиск задач..."
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Sort Dropdown */}
        {onSortChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Сортировка:</span>
            <select
              value={currentSort?.field || 'position'}
              onChange={(e) => onSortChange({
                field: e.target.value,
                direction: currentSort?.direction || 'asc'
              })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => onSortChange({
                field: currentSort?.field || 'position',
                direction: currentSort?.direction === 'asc' ? 'desc' : 'asc'
              })}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title={currentSort?.direction === 'asc' ? 'По возрастанию' : 'По убыванию'}
            >
              {currentSort?.direction === 'asc' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            showFilters || activeFiltersCount > 0
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Reset Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-4">
          {/* Priority Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Приоритет
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'urgent', label: 'Срочно', bgActive: 'bg-red-100 dark:bg-red-900/30', borderActive: 'border-red-300 dark:border-red-700', textActive: 'text-red-700 dark:text-red-300' },
                { value: 'high', label: 'Высокий', bgActive: 'bg-orange-100 dark:bg-orange-900/30', borderActive: 'border-orange-300 dark:border-orange-700', textActive: 'text-orange-700 dark:text-orange-300' },
                { value: 'medium', label: 'Средний', bgActive: 'bg-yellow-100 dark:bg-yellow-900/30', borderActive: 'border-yellow-300 dark:border-yellow-700', textActive: 'text-yellow-700 dark:text-yellow-300' },
                { value: 'low', label: 'Низкий', bgActive: 'bg-green-100 dark:bg-green-900/30', borderActive: 'border-green-300 dark:border-green-700', textActive: 'text-green-700 dark:text-green-300' },
              ].map(({ value, label, bgActive, borderActive, textActive }) => (
                <button
                  key={value}
                  onClick={() => handlePriorityToggle(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    filters.priorities.includes(value)
                      ? `${bgActive} ${borderActive} ${textActive}`
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Срок выполнения
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Все' },
                { value: 'today', label: 'Сегодня' },
                { value: 'week', label: 'Эта неделя' },
                { value: 'month', label: 'Этот месяц' },
                { value: 'overdue', label: 'Просрочено' },
                { value: 'no_date', label: 'Без срока' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleDateFilterChange(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    filters.dateFilter === value
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Исполнитель
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Все' },
                { value: 'me', label: 'Мои задачи' },
                { value: 'unassigned', label: 'Не назначено' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleAssigneeChange(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    (filters.assignee || 'all') === value
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels Filter */}
          {boardLabels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Метки
              </label>
              <div className="flex flex-wrap gap-2">
                {boardLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => handleLabelToggle(label.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                      filters.labels?.includes(label.id)
                        ? 'ring-2 ring-offset-2 ring-blue-500'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: filters.labels?.includes(label.id) ? label.color : `${label.color}40`,
                      borderColor: label.color,
                      color: filters.labels?.includes(label.id) ? 'white' : label.color,
                    }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchAndFilters