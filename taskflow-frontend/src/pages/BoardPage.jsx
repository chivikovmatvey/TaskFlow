import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { boardService } from '../services/boardService'
import { columnService } from '../services/columnService'
import { taskService } from '../services/taskService'
import KanbanBoard from '../components/board/KanbanBoard'
import TaskCard from '../components/board/TaskCard'
import OnlineUsers from '../components/board/OnlineUsers'
import SearchAndFilters from '../components/board/SearchAndFilters'
import BoardStatistics from '../components/board/BoardStatistics'
import { useAuth } from '../context/AuthContext'
import { useRealtimeBoard } from '../hooks/useRealtimeBoard'
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showStatistics, setShowStatistics] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const permissions = useBoardPermissions(boardId)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    priorities: [],
    dateFilter: 'all',
    showOverdue: false,
    assignee: 'all',
  })

  const [sortConfig, setSortConfig] = useState({
    field: 'position',
    direction: 'asc'
  })

  useRealtimeBoard(boardId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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
        tasks: sortTasks(filterTasks(column.tasks || []))
      }))
    }
  }, [board, searchQuery, filters, sortConfig, user])

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
    mutationFn: ({ taskId, newColumnId, newPosition }) => taskService.moveTask(taskId, newColumnId, newPosition),
    onError: (error) => {
      toast.error('Ошибка сохранения')
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

  const findTask = (taskId) => {
    if (!board?.columns) return null
    for (const column of board.columns) {
      const task = column.tasks?.find((t) => t.id === taskId)
      if (task) return task
    }
    return null
  }

  const findColumn = (columnId) => board?.columns?.find(col => col.id === columnId)

  const handleDragStart = (event) => {
    if (isModalOpen) return false
    const task = findTask(event.active.id)
    if (task) {
      setActiveTask(task)
      document.body.style.cursor = 'grabbing'
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveTask(null)
    document.body.style.cursor = ''

    if (!over) return

    const activeId = active.id
    const overId = over.id
    const activeTaskData = findTask(activeId)
    if (!activeTaskData) return

    let newColumnId = activeTaskData.column_id
    let newPosition = activeTaskData.position

    if (overId.toString().startsWith('column-')) {
      newColumnId = overId.toString().replace('column-', '')
      const targetColumn = findColumn(newColumnId)
      newPosition = targetColumn?.tasks?.length || 0
    } else {
      const overTask = findTask(overId)
      if (overTask) {
        newColumnId = overTask.column_id
        const targetColumn = findColumn(newColumnId)
        if (targetColumn) {
          const tasksInColumn = targetColumn.tasks || []
          const overIndex = tasksInColumn.findIndex(t => t.id === overId)
          const activeIndex = tasksInColumn.findIndex(t => t.id === activeId)

          if (activeTaskData.column_id === newColumnId && activeIndex !== -1) {
            if (activeIndex !== overIndex) {
              newPosition = overIndex
            }
          } else {
            newPosition = overIndex
          }
        }
      }
    }

    const hasChanged = activeTaskData.column_id !== newColumnId || activeTaskData.position !== newPosition
    if (!hasChanged) return

    queryClient.setQueryData(['board', boardId], (old) => {
      if (!old) return old
      const newColumns = old.columns.map((col) => {
        if (col.id === activeTaskData.column_id && col.id === newColumnId) {
          const oldIndex = col.tasks.findIndex(t => t.id === activeId)
          const newIndex = newPosition
          const reorderedTasks = arrayMove(col.tasks, oldIndex, newIndex).map((task, idx) => ({
            ...task,
            position: idx
          }))
          return { ...col, tasks: reorderedTasks }
        } else if (col.id === activeTaskData.column_id) {
          const filteredTasks = col.tasks.filter(t => t.id !== activeId).map((task, idx) => ({
            ...task,
            position: idx
          }))
          return { ...col, tasks: filteredTasks }
        } else if (col.id === newColumnId) {
          const newTasks = [...col.tasks]
          newTasks.splice(newPosition, 0, { ...activeTaskData, column_id: newColumnId })
          const reorderedTasks = newTasks.map((task, idx) => ({ ...task, position: idx }))
          return { ...col, tasks: reorderedTasks }
        }
        return col
      })
      return { ...old, columns: newColumns }
    })

    moveTaskMutation.mutate({ taskId: activeId, newColumnId, newPosition })
  }

  const handleDragCancel = () => {
    setActiveTask(null)
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

  const boardToDisplay = filteredBoard || board

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{board.title}</h1>
                {board.description && <p className="text-sm text-gray-600">{board.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <OnlineUsers boardId={boardId} />

              <button onClick={() => setShowStatistics(!showStatistics)} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${showStatistics ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                Статистика
              </button>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${showArchived ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Архив {board?.columns?.flatMap(c => c.tasks || []).filter(t => t.is_archived).length > 0 &&
                  `(${board.columns.flatMap(c => c.tasks || []).filter(t => t.is_archived).length})`}
              </button>
              <button onClick={handleSignOut} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {showStatistics && <BoardStatistics board={board} />}
        <SearchAndFilters onSearchChange={setSearchQuery} onFiltersChange={setFilters} onSortChange={setSortConfig} filters={filters} currentSort={sortConfig} />
        <BoardMembers boardId={boardId} isOwner={board?.owner_id === user?.id} />

        {showArchived && archivedTasks?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">Архивные задачи ({archivedTasks.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {archivedTasks.map(task => (
                <div key={task.id} className="bg-white rounded-lg p-3 border border-yellow-300">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <button onClick={async () => {
                      await taskService.unarchiveTask(task.id)
                      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
                      queryClient.invalidateQueries({ queryKey: ['archived-tasks', boardId] })
                      toast.success('Задача восстановлена')
                    }} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                      Восстановить
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Архивировано: {new Date(task.archived_at).toLocaleDateString('ru-RU')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {boardToDisplay.columns?.map((column) => (
              <KanbanBoard key={column.id} column={column} boardId={boardId} onModalStateChange={setIsModalOpen} />
            ))}
            {permissions.canManageColumns && (
              <div className="flex-shrink-0 w-80">
                {showAddColumn ? (
                  <form onSubmit={handleAddColumn} className="bg-white rounded-lg shadow-md p-4">
                    <input type="text" value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} placeholder="Название колонки" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" autoFocus />
                    <div className="flex space-x-2">
                      <button type="submit" disabled={createColumnMutation.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50">Добавить</button>
                      <button type="button" onClick={() => { setShowAddColumn(false); setNewColumnTitle('') }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition">Отмена</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setShowAddColumn(true)} className=" bg-white bg-opacity-50 hover:bg-opacity-70 rounded-lg p-4 text-gray-700 font-medium transition flex items-center justify-center">
                    <svg className="w-5 h-5 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
          <DragOverlay>
            {activeTask && <div className="rotate-3 opacity-90"><TaskCard task={activeTask} boardId={boardId} isDragging={true} /></div>}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  )
}

export default BoardPage