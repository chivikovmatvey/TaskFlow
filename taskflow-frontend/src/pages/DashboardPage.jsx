import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { boardService } from '../services/boardService'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/common/ConfirmModal'
import { useRealtimeDashboard } from '../hooks/useRealtimeDashboard'

function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardDescription, setNewBoardDescription] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, boardId: null, boardTitle: '' })

  // Подключаем Real-time обновления для дашборда
  useRealtimeDashboard()

  // Загружаем доски
  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: boardService.getBoards,
  })

  // Мутация для создания доски
  const createBoardMutation = useMutation({
    mutationFn: (data) => boardService.createBoard(data.title, data.description),
    onMutate: async (newBoard) => {
      await queryClient.cancelQueries({ queryKey: ['boards'] })

      const previousBoards = queryClient.getQueryData(['boards'])

      // Создаем временную доску
      const tempBoard = {
        id: `temp-${Date.now()}`,
        title: newBoard.title,
        description: newBoard.description,
        background_color: '#3b82f6',
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData(['boards'], (old) => {
        return old ? [tempBoard, ...old] : [tempBoard]
      })

      return { previousBoards }
    },
    onSuccess: (newBoard) => {
      toast.success('Доска создана!')
      setShowCreateModal(false)
      setNewBoardTitle('')
      setNewBoardDescription('')

      // Обновляем с сервера
      queryClient.invalidateQueries({ queryKey: ['boards'] })

      // Переходим на доску
      navigate(`/board/${newBoard.id}`)
    },
    onError: (error, variables, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(['boards'], context.previousBoards)
      }
      toast.error(error.message || 'Ошибка создания доски')
    },
  })

  // Мутация для удаления доски
  const deleteBoardMutation = useMutation({
    mutationFn: boardService.deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success('Доска удалена')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления доски')
    },
  })

  const handleCreateBoard = (e) => {
    e.preventDefault()
    if (!newBoardTitle.trim()) {
      toast.error('Введите название доски')
      return
    }
    createBoardMutation.mutate({
      title: newBoardTitle,
      description: newBoardDescription,
    })
  }

  const handleDeleteBoard = (boardId) => {
    deleteBoardMutation.mutate(boardId)
    setDeleteConfirm({ show: false, boardId: null, boardTitle: '' })
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">TaskFlow</h1>
              <span className="text-sm text-gray-500">Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Board Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Создать доску
          </button>
        </div>

        {/* Boards Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : boards && boards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden group"
              >
                <Link to={`/board/${board.id}`}>
                  <div
                    className="h-32 p-6 flex items-center justify-center text-white font-semibold text-lg"
                    style={{ backgroundColor: board.background_color || '#3b82f6' }}
                  >
                    {board.title}
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {board.description || 'Без описания'}
                  </p>
                  <div className="flex justify-between items-center">
                    <Link
                      to={`/board/${board.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Открыть →
                    </Link>
                    {board.owner_id === user?.id && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDeleteConfirm({ show: true, boardId: board.id, boardTitle: board.title })
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Удалить доску"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет досок</h3>
            <p className="mt-1 text-sm text-gray-500">
              Создайте свою первую доску, чтобы начать работу
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Создать доску
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Создать новую доску</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateBoard}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Название доски *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Мой проект"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Описание (опционально)
                  </label>
                  <textarea
                    id="description"
                    value={newBoardDescription}
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Краткое описание доски"
                    rows="3"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createBoardMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {createBoardMutation.isPending ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, boardId: null, boardTitle: '' })}
        onConfirm={() => handleDeleteBoard(deleteConfirm.boardId)}
        title="Удалить доску?"
        message={`Вы уверены, что хотите удалить доску "${deleteConfirm.boardTitle}"? Все колонки и задачи будут удалены без возможности восстановления.`}
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </div>
  )
}

export default DashboardPage