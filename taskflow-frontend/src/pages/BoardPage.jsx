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
import BoardStatistics from '../components/board/BoardStatistics'
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
  const [showStatistics, setShowStatistics] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Доска не найдена</h2>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700">Вернуться к дашборду</Link>
        </div>
      </div>
    )
  }

  const boardToDisplay = finalBoard || board

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{board.title}</h1>
                {board.description && <p className="text-sm text-gray-600 dark:text-gray-400">{board.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <OnlineUsers boardId={boardId} />

              <button onClick={() => setShowStatistics(!showStatistics)} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${showStatistics ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                Статистика
              </button>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${showArchived ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                Архив {board?.columns?.flatMap(c => c.tasks || []).filter(t => t.is_archived).length > 0 &&
                  `(${board.columns.flatMap(c => c.tasks || []).filter(t => t.is_archived).length})`}
              </button>
              <ThemeToggle />
              <button onClick={handleSignOut} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden p-6">
        <div className="flex-shrink-0 overflow-y-auto max-h-[40vh]">
          {showStatistics && <BoardStatistics board={board} />}
          <SearchAndFilters boardId={boardId} onSearchChange={setSearchQuery} onFiltersChange={setFilters} onSortChange={setSortConfig} filters={filters} currentSort={sortConfig} />
          <BoardMembers boardId={boardId} isOwner={board?.owner_id === user?.id} />

          {showArchived && archivedTasks?.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3">Архивные задачи ({archivedTasks.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {archivedTasks.map(task => (
                  <div key={task.id} className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-yellow-300 dark:border-yellow-600">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                      <button onClick={async () => {
                        await taskService.unarchiveTask(task.id)
                        queryClient.invalidateQueries({ queryKey: ['board', boardId] })
                        queryClient.invalidateQueries({ queryKey: ['archived-tasks', boardId] })
                        toast.success('Задача восстановлена')
                      }} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800">
                        Восстановить
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Архивировано: {new Date(task.archived_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <SortableContext items={boardToDisplay.columns?.map(col => col.id) || []} strategy={horizontalListSortingStrategy}>
            <div className="flex-1 flex space-x-4 overflow-x-auto overflow-y-hidden min-h-0 scrollbar-thin">
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
              <div className="flex-shrink-0 w-80">
                {showAddColumn ? (
                  <form onSubmit={handleAddColumn} className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4">
                    <input type="text" value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} placeholder="Название колонки" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" autoFocus />
                    <div className="flex space-x-2">
                      <button type="submit" disabled={createColumnMutation.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50">Добавить</button>
                      <button type="button" onClick={() => { setShowAddColumn(false); setNewColumnTitle('') }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition">Отмена</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setShowAddColumn(true)} className="bg-white dark:bg-gray-700 bg-opacity-50 dark:bg-opacity-50 hover:bg-opacity-70 dark:hover:bg-opacity-70 rounded-lg p-4 text-gray-700 dark:text-gray-300 font-medium transition flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeTask && <div className="rotate-3 opacity-90"><TaskCard task={activeTask} boardId={boardId} isDragging={true} /></div>}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  )
}

export default BoardPage