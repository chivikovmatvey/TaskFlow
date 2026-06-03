import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { boardService } from '../services/boardService'
import { columnService } from '../services/columnService'
import { taskService } from '../services/taskService'
import { labelService } from '../services/labelService'
import SortableColumn from '../components/board/SortableColumn'
import TaskCard from '../components/board/TaskCard'
import OnlineUsers from '../components/board/OnlineUsers'
import SearchAndFilters from '../components/board/SearchAndFilters'
import ThemeToggle from '../components/common/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { useRealtimeBoard } from '../hooks/useRealtimeBoard'
import { useTasksWithLabels } from '../hooks/useTasksWithLabels'
import BoardMembers from '../components/board/BoardMembers'
import { useBoardPermissions } from '../hooks/useBoardPermissions'
import { useCheckBoardAccess } from '../hooks/useCheckBoardAccess'

function BoardPage() {
  const { id: boardId } = useParams()
  const { signOut, user } = useAuth()
  useCheckBoardAccess(boardId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [activeTask, setActiveTask] = useState(null)
  const [activeColumn, setActiveColumn] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [overId, setOverId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const permissions = useBoardPermissions(boardId)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    priorities: [],
    dateFilter: 'all',
    showOverdue: false,
    assignee: 'all',
    labels: [],
  })

  const [sortConfig, setSortConfig] = useState({
    field: 'position',
    direction: 'asc'
  })

  useRealtimeBoard(boardId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoard(boardId),
    refetchOnWindowFocus: false,
    staleTime: 30000,
  })

  const { data: archivedTasks } = useQuery({
    queryKey: ['archived-tasks', boardId],
    queryFn: () => taskService.getArchivedTasks(boardId),
    enabled: showArchived,
  })

  const sortTasks = (tasks) => {
    if (!tasks) return []
    const sorted = [...tasks]
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }

    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortConfig.field) {
        case 'priority':
          comparison = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
          break
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0
          else if (!a.due_date) comparison = 1
          else if (!b.due_date) comparison = -1
          else comparison = new Date(a.due_date) - new Date(b.due_date)
          break
        case 'created_at':
          comparison = new Date(a.created_at) - new Date(b.created_at)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = a.position - b.position
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
    return sorted
  }

  const filterTasks = (tasks) => {
    if (!tasks) return []
    return tasks.filter(task => {
      if (task.is_archived) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false
      if (filters.assignee === 'me' && task.assigned_to !== user?.id) return false
      if (filters.assignee === 'unassigned' && task.assigned_to) return false

      if (filters.dateFilter !== 'all') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (filters.dateFilter === 'no_date' && task.due_date) return false
        if (task.due_date && filters.dateFilter !== 'no_date') {
          const dueDate = new Date(task.due_date)
          if (filters.dateFilter === 'overdue' && dueDate >= today) return false
          if (filters.dateFilter === 'today') {
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            if (dueDate < today || dueDate >= tomorrow) return false
          }
          if (filters.dateFilter === 'week') {
            const weekFromNow = new Date(today)
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            if (dueDate < today || dueDate > weekFromNow) return false
          }
        }
      }
      return true
    })
  }

  const filteredBoard = useMemo(() => {
    if (!board) return null
    return {
      ...board,
      columns: board.columns.map(column => ({
        ...column,
        tasks: filterTasks(column.tasks || [])
      }))
    }
  }, [board, searchQuery, filters, sortConfig, user])

  const allFilteredTasks = filteredBoard?.columns.flatMap(col => col.tasks || []) || []
  const labelFilteredTasks = useTasksWithLabels(allFilteredTasks, filters.labels)

  const finalBoard = useMemo(() => {
    if (!filteredBoard) return null

    const labelFilteredIds = new Set(labelFilteredTasks?.map(t => t.id) || [])
    const shouldApplyLabelFilter = filters.labels && filters.labels.length > 0

    return {
      ...filteredBoard,
      columns: filteredBoard.columns.map(column => ({
        ...column,
        tasks: sortTasks(
          shouldApplyLabelFilter
            ? column.tasks.filter(task => labelFilteredIds.has(task.id))
            : column.tasks
        )
      }))
    }
  }, [filteredBoard, labelFilteredTasks, filters.labels, sortConfig])

  const createColumnMutation = useMutation({
    mutationFn: ({ boardId, title, position }) => columnService.createColumn(boardId, title, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      toast.success('Колонка создана!')
      setShowAddColumn(false)
      setNewColumnTitle('')
    },
    onError: (error) => toast.error(error.message || 'Ошибка создания колонки'),
  })

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, newColumnId, newPosition, allTaskIds }) =>
      taskService.moveTask(taskId, newColumnId, newPosition, allTaskIds),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      }, 300)
    },
    onError: (error) => {
      toast.error('Ошибка сохранения')
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const reorderColumnsMutation = useMutation({
    mutationFn: ({ boardId, columnIds }) => columnService.reorderColumns(boardId, columnIds),
    onError: (error) => {
      toast.error('Ошибка перемещения колонки')
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const handleAddColumn = (e) => {
    e.preventDefault()
    const trimmedTitle = newColumnTitle.trim()
    if (!trimmedTitle) return toast.error('Введите название колонки')
    if (board?.columns?.some(col => col.title.toLowerCase() === trimmedTitle.toLowerCase())) {
      return toast.error('Колонка с таким названием уже существует')
    }
    createColumnMutation.mutate({ boardId, title: trimmedTitle, position: board?.columns?.length || 0 })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Вы вышли из системы')
      navigate('/login')
    } catch (error) {
      toast.error('Ошибка выхода')
    }
  }

  const findTask = (taskId, useOriginal = true) => {
    const sourceBoard = useOriginal ? board : (finalBoard || board)
    if (!sourceBoard?.columns) return null
    for (const column of sourceBoard.columns) {
      const task = column.tasks?.find((t) => t.id === taskId)
      if (task) return task
    }
    return null
  }

  const findColumn = (columnId, useOriginal = true) => {
    const sourceBoard = useOriginal ? board : (finalBoard || board)
    return sourceBoard?.columns?.find(col => col.id === columnId)
  }

  const handleDragStart = (event) => {
    const task = findTask(event.active.id)
    if (task) {
      setActiveTask(task)
      document.body.style.cursor = 'grabbing'
      return
    }

    const column = findColumn(event.active.id)
    if (column) {
      setActiveColumn(column)
      document.body.style.cursor = 'grabbing'
    }
  }

  const handleDragOver = (event) => {
    const { over } = event
    setOverId(over?.id || null)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveTask(null)
    setActiveColumn(null)
    setOverId(null)
    document.body.style.cursor = ''

    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeColumn) {
      if (activeId !== overId) {
        const oldIndex = board.columns.findIndex(col => col.id === activeId)
        const newIndex = board.columns.findIndex(col => col.id === overId)

        queryClient.setQueryData(['board', boardId], (old) => {
          if (!old) return old
          const reorderedColumns = arrayMove(old.columns, oldIndex, newIndex).map((col, idx) => ({
            ...col,
            position: idx
          }))
          return { ...old, columns: reorderedColumns }
        })

        const columnIds = arrayMove(board.columns, oldIndex, newIndex).map(col => col.id)
        reorderColumnsMutation.mutate({ boardId, columnIds })
      }
      return
    }

    const activeTaskData = findTask(activeId, true) 
    if (!activeTaskData) return

    let newColumnId = activeTaskData.column_id
    let newPosition = activeTaskData.position

    if (overId.toString().startsWith('column-')) {
      newColumnId = overId.toString().replace('column-', '')
      const targetColumn = findColumn(newColumnId, true)
      newPosition = targetColumn?.tasks?.length || 0
    } else {
      const overTask = findTask(overId, true)
      if (overTask) {
        newColumnId = overTask.column_id
        const targetColumn = findColumn(newColumnId, true)
        if (targetColumn) {
          const sortedTasks = [...(targetColumn.tasks || [])].sort((a, b) => a.position - b.position)
          const overIndex = sortedTasks.findIndex(t => t.id === overId)
          const activeIndex = sortedTasks.findIndex(t => t.id === activeId)

          const isSameColumn = String(activeTaskData.column_id) === String(newColumnId)

          if (isSameColumn && activeIndex !== -1) {
            if (activeIndex === overIndex) {
              return
            }
            newPosition = overIndex
          } else {
            newPosition = overIndex
          }

          console.log('🔵 Drag calculation:', {
            activeId,
            overId,
            isSameColumn,
            activeIndex,
            overIndex,
            newPosition,
            activeColumnId: activeTaskData.column_id,
            targetColumnId: newColumnId,
            sortedTaskIds: sortedTasks.map(t => t.id)
          })
        }
      }
    }

    const hasColumnChanged = String(activeTaskData.column_id) !== String(newColumnId)
    const hasPositionChanged = activeTaskData.position !== newPosition
    if (!hasColumnChanged && !hasPositionChanged) return

    console.log('🔵 handleDragEnd:', { activeId, overId, newColumnId, newPosition, oldColumn: activeTaskData.column_id })

    let finalTaskOrder = []

    queryClient.setQueryData(['board', boardId], (old) => {
      if (!old) return old
      const sourceColumnId = String(activeTaskData.column_id)
      const targetColumnId = String(newColumnId)

      const newColumns = old.columns.map((col) => {
        const colId = String(col.id)

        if (colId === sourceColumnId && colId === targetColumnId) {
          const sortedTasks = [...col.tasks].sort((a, b) => a.position - b.position)
          const oldIndex = sortedTasks.findIndex(t => t.id === activeId)
          const reorderedTasks = arrayMove(sortedTasks, oldIndex, newPosition).map((task, idx) => ({
            ...task,
            position: idx
          }))
          finalTaskOrder = reorderedTasks.map(t => t.id)
          console.log('🔵 Same column reorder:', {
            oldIndex,
            newPosition,
            taskCount: sortedTasks.length,
            reorderedIds: finalTaskOrder
          })
          return { ...col, tasks: reorderedTasks }
        } else if (colId === sourceColumnId) {
          const filteredTasks = col.tasks.filter(t => t.id !== activeId).map((task, idx) => ({
            ...task,
            position: idx
          }))
          return { ...col, tasks: filteredTasks }
        } else if (colId === targetColumnId) {
          const sortedTasks = [...col.tasks].sort((a, b) => a.position - b.position)
          sortedTasks.splice(newPosition, 0, { ...activeTaskData, column_id: newColumnId })
          const reorderedTasks = sortedTasks.map((task, idx) => ({ ...task, position: idx }))
          finalTaskOrder = reorderedTasks.map(t => t.id)
          console.log('🔵 Cross column move:', {
            newPosition,
            taskCount: sortedTasks.length,
            reorderedIds: finalTaskOrder
          })
          return { ...col, tasks: reorderedTasks }
        }
        return col
      })
      return { ...old, columns: newColumns }
    })

    moveTaskMutation.mutate({ taskId: activeId, newColumnId, newPosition, allTaskIds: finalTaskOrder })
  }

  const handleDragCancel = () => {
    setActiveTask(null)
    setActiveColumn(null)
    document.body.style.cursor = ''
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-navy">
        <div className="flex flex-col items-center gap-3 animate-fadeIn">
          <div className="w-1.5 h-1.5 rounded-full bg-coral animate-shimmer" />
          <span className="text-sm text-ink-muted dark:text-ink-muted-soft tracking-wide">Загрузка</span>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-navy">
        <div className="text-center animate-slideUp">
          <h2 className="font-display text-3xl text-ink dark:text-canvas mb-3 tracking-display-md">Доска не найдена</h2>
          <Link to="/dashboard" className="text-coral hover:text-coral-active transition-colors text-sm">← Вернуться к дашборду</Link>
        </div>
      </div>
    )
  }

  const boardToDisplay = finalBoard || board
  const archivedCount = board?.columns?.flatMap(c => c.tasks || []).filter(t => t.is_archived).length || 0

  return (
    <div className="h-screen flex flex-col bg-canvas dark:bg-navy">
      <header className="bg-canvas dark:bg-navy border-b border-hairline dark:border-navy-hairline flex-shrink-0">
        <div className="max-w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link
                to="/dashboard"
                className="w-9 h-9 flex-shrink-0 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all duration-300 ease-smooth flex items-center justify-center group"
                title="К дашборду"
              >
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-baseline gap-3 min-w-0">
                <h1 className="font-display text-lg sm:text-2xl text-ink dark:text-canvas tracking-display-md leading-none truncate">
                  {board.title}
                </h1>
                {board.description && (
                  <p className="hidden sm:block text-sm text-ink-muted dark:text-ink-muted-soft truncate max-w-md">
                    · {board.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <OnlineUsers boardId={boardId} />

              <div className="hidden md:flex items-center gap-1 mr-1">
                <Link
                  to={`/board/${boardId}/insights`}
                  className="px-3 py-2 rounded-md text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-elevated transition-all duration-200 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Аналитика
                </Link>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    showArchived
                      ? 'bg-coral-soft text-coral'
                      : 'text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-elevated'
                  }`}
                >
                  Архив
                  {archivedCount > 0 && (
                    <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded-full bg-canvas-card dark:bg-navy-soft text-ink-muted">
                      {archivedCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={handleSignOut}
                  className="ml-1 px-3 py-2 text-sm font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors"
                >
                  Выйти
                </button>
              </div>

              {/* Mobile kebab menu */}
              <div className="md:hidden relative">
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft transition-colors"
                  aria-label="Меню"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="6" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="18" r="1.5" />
                  </svg>
                </button>
                {mobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-lg shadow-lift-lg py-1 min-w-[200px] animate-scaleIn" style={{ transformOrigin: 'top right' }}>
                      <Link
                        to={`/board/${boardId}/insights`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full px-3 py-2.5 text-left text-sm text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft hover:text-ink dark:hover:text-canvas transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Аналитика
                      </Link>
                      <button
                        onClick={() => { setShowArchived(!showArchived); setMobileMenuOpen(false) }}
                        className="w-full px-3 py-2.5 text-left text-sm text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft hover:text-ink dark:hover:text-canvas transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          Архив
                        </span>
                        {archivedCount > 0 && (
                          <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded-full bg-canvas-card dark:bg-navy-soft text-ink-muted">
                            {archivedCount}
                          </span>
                        )}
                      </button>
                      <div className="my-1 mx-2 h-px bg-hairline dark:bg-navy-hairline" />
                      <div className="px-3 py-1.5 flex items-center justify-between">
                        <span className="text-xs text-ink-muted">Тема</span>
                        <ThemeToggle />
                      </div>
                      <div className="my-1 mx-2 h-px bg-hairline dark:bg-navy-hairline" />
                      <button
                        onClick={() => { setMobileMenuOpen(false); handleSignOut() }}
                        className="w-full px-3 py-2.5 text-left text-sm text-danger hover:bg-danger/10 transition-colors"
                      >
                        Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-4 sm:pb-6 min-w-0">
        <div className="flex-shrink-0 overflow-y-auto overflow-x-hidden max-h-[40vh] mb-4 scrollbar-thin">
          <SearchAndFilters boardId={boardId} onSearchChange={setSearchQuery} onFiltersChange={setFilters} onSortChange={setSortConfig} filters={filters} currentSort={sortConfig} />
          <BoardMembers boardId={boardId} isOwner={board?.owner_id === user?.id} />

          {showArchived && archivedTasks?.length > 0 && (
            <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 mb-4 animate-slideUp">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-ink dark:text-canvas tracking-display-md">
                  Архив
                </h3>
                <span className="text-xs uppercase tracking-caption-up text-ink-muted dark:text-ink-muted-soft">
                  {archivedTasks.length} {archivedTasks.length === 1 ? 'задача' : 'задач'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {archivedTasks.map(task => (
                  <div key={task.id} className="bg-canvas dark:bg-navy-elevated rounded-lg p-3 border border-hairline dark:border-navy-hairline hover:border-coral/40 transition-colors duration-200">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-medium text-ink dark:text-canvas leading-snug">{task.title}</h4>
                      <button onClick={async () => {
                        await taskService.unarchiveTask(task.id)
                        queryClient.invalidateQueries({ queryKey: ['board', boardId] })
                        queryClient.invalidateQueries({ queryKey: ['archived-tasks', boardId] })
                        toast.success('Задача восстановлена')
                      }} className="text-[11px] px-2 py-1 rounded-md bg-coral text-white hover:bg-coral-active transition-colors flex-shrink-0">
                        Восстановить
                      </button>
                    </div>
                    <p className="text-xs text-ink-muted dark:text-ink-muted-soft mt-2">
                      {new Date(task.archived_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <SortableContext items={boardToDisplay.columns?.map(col => col.id) || []} strategy={horizontalListSortingStrategy}>
            <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto min-h-0 scrollbar-thin pb-2">
              {boardToDisplay.columns?.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  boardId={boardId}
                  onModalStateChange={setIsModalOpen}
                  canManageColumns={permissions.canManageColumns}
                />
              ))}
              {permissions.canManageColumns && (
                <div className="flex-shrink-0 w-full md:w-80">
                  {showAddColumn ? (
                    <form onSubmit={handleAddColumn} className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 animate-scaleIn">
                      <input
                        type="text"
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        placeholder="Название колонки"
                        className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring mb-3 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={createColumnMutation.isPending}
                          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-md hover:bg-coral-active transition-colors disabled:opacity-50"
                        >
                          Добавить
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddColumn(false); setNewColumnTitle('') }}
                          className="px-4 py-2 text-ink-body dark:text-ink-muted text-sm font-medium rounded-md hover:bg-canvas dark:hover:bg-navy-elevated transition-colors"
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddColumn(true)}
                      className="w-full h-12 rounded-lg border border-dashed border-hairline dark:border-navy-hairline text-ink-muted dark:text-ink-muted-soft hover:border-coral hover:text-coral transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium group"
                    >
                      <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Добавить колонку
                    </button>
                  )}
                </div>
              )}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
            {activeTask && (
              <div className="rotate-2 scale-105 opacity-95 shadow-lift-lg rounded-lg">
                <TaskCard task={activeTask} boardId={boardId} isDragging={true} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  )
}

export default BoardPage