import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { labelService } from '../../services/labelService'
import Select from '../common/Select'

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
    { value: 'position', label: 'Порядок' },
    { value: 'priority', label: 'Приоритет' },
    { value: 'due_date', label: 'Срок' },
    { value: 'created_at', label: 'Создание' },
    { value: 'title', label: 'Название' },
  ]

  const Pill = ({ active, onClick, children, accent }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border ${
        active
          ? accent === 'coral'
            ? 'bg-coral text-white border-coral'
            : 'bg-ink text-canvas border-ink dark:bg-canvas dark:text-ink dark:border-canvas'
          : 'bg-canvas dark:bg-navy-elevated text-ink-body dark:text-ink-muted border-hairline dark:border-navy-hairline hover:border-coral hover:text-coral'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-3 mb-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <svg className="w-4 h-4 text-ink-muted-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Поиск задач..."
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-sm text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring"
          />
        </div>

        {/* Sort */}
        {onSortChange && (
          <div className="flex items-center gap-1 min-w-[150px]">
            <div className="flex-1">
              <Select
                value={currentSort?.field || 'position'}
                onChange={(field) => onSortChange({
                  field,
                  direction: currentSort?.direction || 'asc'
                })}
                options={sortOptions}
              />
            </div>
            <button
              onClick={() => onSortChange({
                field: currentSort?.field || 'position',
                direction: currentSort?.direction === 'asc' ? 'desc' : 'asc'
              })}
              className="w-9 h-9 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md hover:border-coral transition-all duration-200 flex items-center justify-center text-ink-body dark:text-ink-muted hover:text-coral flex-shrink-0"
              title={currentSort?.direction === 'asc' ? 'По возрастанию' : 'По убыванию'}
            >
              <svg
                className="w-4 h-4 transition-transform duration-300"
                style={{ transform: currentSort?.direction === 'desc' ? 'scaleY(-1)' : 'none' }}
                fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border ${
            showFilters || activeFiltersCount > 0
              ? 'bg-coral-soft text-coral border-coral/30'
              : 'bg-canvas dark:bg-navy-elevated text-ink-body dark:text-ink-muted border-hairline dark:border-navy-hairline hover:border-coral hover:text-coral'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="bg-coral text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs text-ink-muted hover:text-coral transition-colors px-2"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-hairline dark:border-navy-hairline space-y-3 animate-slideUp">
          <div>
            <p className="text-[11px] uppercase tracking-caption-up text-ink-muted dark:text-ink-muted-soft mb-2 font-semibold">
              Приоритет
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'urgent', label: 'Срочно' },
                { value: 'high', label: 'Высокий' },
                { value: 'medium', label: 'Средний' },
                { value: 'low', label: 'Низкий' },
              ].map(({ value, label }) => (
                <Pill
                  key={value}
                  active={filters.priorities.includes(value)}
                  onClick={() => handlePriorityToggle(value)}
                  accent="coral"
                >
                  {label}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-caption-up text-ink-muted dark:text-ink-muted-soft mb-2 font-semibold">
              Срок
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'all', label: 'Все' },
                { value: 'today', label: 'Сегодня' },
                { value: 'week', label: 'Эта неделя' },
                { value: 'month', label: 'Этот месяц' },
                { value: 'overdue', label: 'Просрочено' },
                { value: 'no_date', label: 'Без срока' },
              ].map(({ value, label }) => (
                <Pill
                  key={value}
                  active={filters.dateFilter === value}
                  onClick={() => handleDateFilterChange(value)}
                  accent="coral"
                >
                  {label}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-caption-up text-ink-muted dark:text-ink-muted-soft mb-2 font-semibold">
              Исполнитель
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'all', label: 'Все' },
                { value: 'me', label: 'Мои задачи' },
                { value: 'unassigned', label: 'Не назначено' },
              ].map(({ value, label }) => (
                <Pill
                  key={value}
                  active={(filters.assignee || 'all') === value}
                  onClick={() => handleAssigneeChange(value)}
                  accent="coral"
                >
                  {label}
                </Pill>
              ))}
            </div>
          </div>

          {boardLabels.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-caption-up text-ink-muted dark:text-ink-muted-soft mb-2 font-semibold">
                Метки
              </p>
              <div className="flex flex-wrap gap-1.5">
                {boardLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => handleLabelToggle(label.id)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border"
                    style={{
                      backgroundColor: filters.labels?.includes(label.id) ? label.color : `${label.color}1A`,
                      borderColor: filters.labels?.includes(label.id) ? label.color : `${label.color}55`,
                      color: filters.labels?.includes(label.id) ? '#fff' : label.color,
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
