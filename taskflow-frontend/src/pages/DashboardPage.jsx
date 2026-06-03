import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { boardService } from '../services/boardService'
import { sectionService } from '../services/sectionService'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/common/ThemeToggle'
import ConfirmModal from '../components/common/ConfirmModal'
import { useRealtimeDashboard } from '../hooks/useRealtimeDashboard'
import ColorPicker from '../components/common/ColorPicker'

function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardDescription, setNewBoardDescription] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionDescription, setNewSectionDescription] = useState('')
  const [newSectionColor, setNewSectionColor] = useState('#cc785c')
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, title: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useRealtimeDashboard()

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: boardService.getBoards,
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionService.getSections,
  })

  const createBoardMutation = useMutation({
    mutationFn: ({ title, description, sectionId }) =>
      boardService.createBoard(title, description, '#cc785c', sectionId),
    onSuccess: (newBoard) => {
      toast.success('Доска создана')
      setShowCreateBoard(false)
      setNewBoardTitle('')
      setNewBoardDescription('')
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      navigate(`/board/${newBoard.id}`)
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const deleteBoardMutation = useMutation({
    mutationFn: boardService.deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success('Доска удалена')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const createSectionMutation = useMutation({
    mutationFn: ({ name, description, color }) => sectionService.createSection(name, description, color),
    onSuccess: () => {
      toast.success('Раздел создан')
      setShowCreateSection(false)
      setNewSectionName('')
      setNewSectionDescription('')
      setNewSectionColor('#cc785c')
      queryClient.invalidateQueries({ queryKey: ['sections'] })
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const moveBoardMutation = useMutation({
    mutationFn: ({ boardId, sectionId }) => boardService.updateBoard(boardId, { section_id: sectionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      toast.success('Доска перемещена')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const deleteSectionMutation = useMutation({
    mutationFn: sectionService.deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success('Раздел удалён')
      setActiveFilter('all')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const handleCreateBoard = (e) => {
    e.preventDefault()
    if (!newBoardTitle.trim()) return toast.error('Введите название')
    let sectionId = null
    if (activeFilter.startsWith('section:')) sectionId = activeFilter.slice(8)
    createBoardMutation.mutate({
      title: newBoardTitle.trim(),
      description: newBoardDescription.trim(),
      sectionId,
    })
  }

  const handleCreateSection = (e) => {
    e.preventDefault()
    if (!newSectionName.trim()) return toast.error('Введите название')
    createSectionMutation.mutate({
      name: newSectionName.trim(),
      description: newSectionDescription.trim(),
      color: newSectionColor,
    })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Ошибка выхода')
    }
  }

  const filteredBoards = useMemo(() => {
    if (!boards) return []
    let filtered = boards
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
      )
    }
    if (activeFilter === 'my') {
      filtered = filtered.filter(b => b.owner_id === user?.id)
    } else if (activeFilter === 'shared') {
      filtered = filtered.filter(b => b.owner_id !== user?.id)
    } else if (activeFilter === 'unsorted') {
      filtered = filtered.filter(b => !b.section_id)
    } else if (activeFilter.startsWith('section:')) {
      const sid = activeFilter.slice(8)
      filtered = filtered.filter(b => b.section_id === sid)
    }
    return filtered
  }, [boards, searchQuery, activeFilter, user])

  const stats = useMemo(() => ({
    total: boards?.length || 0,
    mine: boards?.filter(b => b.owner_id === user?.id).length || 0,
    shared: boards?.filter(b => b.owner_id !== user?.id).length || 0,
    sections: sections.length,
  }), [boards, sections, user])

  const activeSection = useMemo(() => {
    if (!activeFilter.startsWith('section:')) return null
    const sid = activeFilter.slice(8)
    return sections.find(s => s.id === sid)
  }, [activeFilter, sections])

  const selectFilter = (key) => {
    setActiveFilter(key)
    setSidebarOpen(false)
  }

  const filterButton = (key, label, count) => (
    <button
      onClick={() => selectFilter(key)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
        activeFilter === key
          ? 'bg-coral-soft text-coral'
          : 'text-ink-body dark:text-ink-muted hover:bg-canvas-card dark:hover:bg-navy-soft'
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={`text-xs tabular-nums ${activeFilter === key ? 'text-coral' : 'text-ink-muted-soft'}`}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-64 flex-shrink-0 border-r border-hairline dark:border-navy-hairline bg-canvas-soft dark:bg-navy-soft flex flex-col transform transition-transform duration-300 ease-smooth md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-5 border-b border-hairline dark:border-navy-hairline flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/logo.svg" alt="TaskFlow" className="h-12 w-auto" />
            </Link>
            <p className="text-xs text-ink-muted-soft mt-1 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 -mr-1 text-ink-muted hover:text-ink dark:hover:text-canvas rounded-md transition-colors"
            aria-label="Закрыть меню"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
          <div>
            <p className="px-3 mb-2 text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">
              Доски
            </p>
            <div className="space-y-0.5">
              {filterButton('all', 'Все', stats.total)}
              {filterButton('my', 'Мои', stats.mine)}
              {filterButton('shared', 'Общие', stats.shared)}
              {filterButton('unsorted', 'Без раздела', boards?.filter(b => !b.section_id).length || 0)}
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">
                Разделы
              </p>
              <button
                onClick={() => setShowCreateSection(true)}
                className="text-ink-muted-soft hover:text-coral transition-colors"
                title="Создать раздел"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="space-y-0.5">
              {sections.length === 0 && (
                <p className="px-3 py-2 text-xs text-ink-muted-soft italic">Пусто</p>
              )}
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectFilter(`section:${s.id}`)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group ${
                    activeFilter === `section:${s.id}`
                      ? 'bg-coral-soft text-coral'
                      : 'text-ink-body dark:text-ink-muted hover:bg-canvas-card dark:hover:bg-navy-soft'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 truncate text-left">{s.name}</span>
                  <span className={`text-xs tabular-nums ${activeFilter === `section:${s.id}` ? 'text-coral' : 'text-ink-muted-soft'}`}>
                    {s.board_count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-hairline dark:border-navy-hairline space-y-1">
          <Link
            to="/teams"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas hover:bg-canvas-card dark:hover:bg-navy-elevated rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Команды
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas hover:bg-canvas-card dark:hover:bg-navy-elevated rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Настройки
          </Link>
          <div className="flex items-center justify-between gap-2 pt-1">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="flex-1 px-3 py-2 text-xs font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas hover:bg-canvas-card dark:hover:bg-navy-elevated rounded-md transition-colors text-left"
            >
              Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden min-w-0">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-canvas dark:bg-navy border-b border-hairline dark:border-navy-hairline px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors"
            aria-label="Открыть меню"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="TaskFlow" className="h-10 w-auto" />
          </Link>
          <div className="w-9" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-10">
          {/* Header */}
          <div className="flex items-end justify-between mb-6 md:mb-8 flex-wrap gap-4">
            <div className="animate-slideUp">
              <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                {activeSection ? 'Раздел' : 'Дашборд'}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-display-lg text-ink dark:text-canvas leading-none">
                {activeSection ? activeSection.name :
                  activeFilter === 'my' ? 'Мои доски' :
                  activeFilter === 'shared' ? 'Общие' :
                  activeFilter === 'unsorted' ? 'Без раздела' :
                  'Все доски'}
              </h1>
              {activeSection?.description && (
                <p className="text-sm text-ink-muted dark:text-ink-muted-soft mt-2 max-w-xl">
                  {activeSection.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 animate-slideUp" style={{ animationDelay: '0.05s' }}>
              {activeSection && (
                <button
                  onClick={() => setDeleteConfirm({ show: true, type: 'section', id: activeSection.id, title: activeSection.name })}
                  className="px-3 py-2 text-xs font-medium text-ink-muted hover:text-danger hover:bg-danger/5 rounded-md transition-colors"
                >
                  Удалить раздел
                </button>
              )}
              <button
                onClick={() => setShowCreateBoard(true)}
                className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 hover:scale-[1.02] flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Создать доску
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative max-w-md animate-fadeIn">
            <svg className="w-4 h-4 text-ink-muted-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск досок..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-sm text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring"
            />
          </div>

          {/* Boards grid */}
          {boardsLoading ? (
            <div className="flex justify-center py-20">
              <span className="text-sm text-ink-muted-soft animate-shimmer">Загрузка</span>
            </div>
          ) : filteredBoards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  isOwner={board.owner_id === user?.id}
                  sections={sections}
                  onDelete={() => setDeleteConfirm({ show: true, type: 'board', id: board.id, title: board.title })}
                  onMove={(sectionId) => moveBoardMutation.mutate({ boardId: board.id, sectionId })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-hairline dark:border-navy-hairline rounded-xl animate-fadeIn">
              <p className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-2">
                {searchQuery ? 'Ничего не найдено' : 'Пока нет досок'}
              </p>
              <p className="text-sm text-ink-muted dark:text-ink-muted-soft mb-6">
                {searchQuery ? 'Попробуйте другой запрос' : 'Создайте первую доску, чтобы начать'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateBoard(true)}
                  className="px-5 py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 hover:scale-[1.02]"
                >
                  Создать доску
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create board modal */}
      {showCreateBoard && (
        <CreateModal
          title="Новая доска"
          onClose={() => setShowCreateBoard(false)}
          onSubmit={handleCreateBoard}
          loading={createBoardMutation.isPending}
        >
          <ModalInput
            label="Название"
            value={newBoardTitle}
            onChange={setNewBoardTitle}
            placeholder="Мой проект"
            autoFocus
          />
          <ModalTextarea
            label="Описание"
            value={newBoardDescription}
            onChange={setNewBoardDescription}
            placeholder="Краткое описание (необязательно)"
          />
          {activeFilter.startsWith('section:') && activeSection && (
            <p className="text-xs text-ink-muted dark:text-ink-muted-soft">
              Будет создана в разделе: <span className="text-coral font-medium">{activeSection.name}</span>
            </p>
          )}
        </CreateModal>
      )}

      {/* Create section modal */}
      {showCreateSection && (
        <CreateModal
          title="Новый раздел"
          onClose={() => setShowCreateSection(false)}
          onSubmit={handleCreateSection}
          loading={createSectionMutation.isPending}
        >
          <ModalInput
            label="Название раздела"
            value={newSectionName}
            onChange={setNewSectionName}
            placeholder="Маркетинг"
            autoFocus
          />
          <ModalTextarea
            label="Описание"
            value={newSectionDescription}
            onChange={setNewSectionDescription}
            placeholder="Для чего этот раздел"
          />
          <ColorPicker value={newSectionColor} onChange={setNewSectionColor} />
        </CreateModal>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, type: null, id: null, title: '' })}
        onConfirm={() => {
          if (deleteConfirm.type === 'board') deleteBoardMutation.mutate(deleteConfirm.id)
          if (deleteConfirm.type === 'section') deleteSectionMutation.mutate(deleteConfirm.id)
        }}
        title={deleteConfirm.type === 'section' ? 'Удалить раздел?' : 'Удалить доску?'}
        message={
          deleteConfirm.type === 'section'
            ? `Раздел "${deleteConfirm.title}" будет удалён, доски станут «без раздела».`
            : `Доска "${deleteConfirm.title}" и все её колонки и задачи будут удалены без возможности восстановления.`
        }
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </div>
  )
}

function CreateModal({ title, children, onClose, onSubmit, loading }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[60] animate-fadeIn"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl shadow-lift-lg max-w-md w-full animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-hairline dark:border-navy-hairline flex justify-between items-start">
          <h3 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas leading-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft rounded-md transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalInput({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-3.5 py-2.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
      />
    </div>
  )
}

function ModalTextarea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows="3"
        className="w-full px-3.5 py-2.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm resize-none"
      />
    </div>
  )
}

function BoardCard({ board, isOwner, sections, onDelete, onMove }) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [showSections, setShowSections] = useState(false)
  const buttonRef = useRef(null)

  const openMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 })
    }
    setShowMenu(!showMenu)
    setShowSections(false)
  }

  const handleMove = (sectionId) => {
    onMove(sectionId)
    setShowMenu(false)
    setShowSections(false)
  }

  return (
    <>
      <Link
        to={`/board/${board.id}`}
        className="stagger-card group bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 hover:border-coral/40 hover:-translate-y-0.5 hover:shadow-lift transition-all duration-300 ease-smooth relative"
      >
        <div
          className="absolute top-0 left-5 w-12 h-1 rounded-b-full"
          style={{ backgroundColor: board.background_color || '#cc785c' }}
        />

        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-xl tracking-display-md text-ink dark:text-canvas leading-tight pr-4 group-hover:text-coral transition-colors">
            {board.title}
          </h3>
          {isOwner && (
            <button
              ref={buttonRef}
              onClick={openMenu}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 -m-1 text-ink-muted-soft hover:text-ink dark:hover:text-canvas hover:bg-canvas dark:hover:bg-navy-elevated rounded"
              title="Меню"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-sm text-ink-muted dark:text-ink-muted-soft line-clamp-2 mb-4 min-h-[2.5em]">
          {board.description || 'Без описания'}
        </p>

        <div className="flex items-center justify-between text-[11px] pt-3 border-t border-hairline-soft dark:border-navy-hairline">
          <span className={`font-medium ${isOwner ? 'text-coral' : 'text-ink-muted'}`}>
            {isOwner ? 'Владелец' : 'Участник'}
          </span>
          <span className="text-ink-muted-soft">
            {new Date(board.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </Link>

      {showMenu && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => { setShowMenu(false); setShowSections(false) }} />
          <div
            className="fixed bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-lg shadow-lift-lg py-1 min-w-[180px] animate-scaleIn"
            style={{ top: menuPos.top, left: menuPos.left, zIndex: 9999, transformOrigin: 'top right' }}
          >
            {!showSections ? (
              <>
                <button
                  onClick={() => setShowSections(true)}
                  className="w-full px-3 py-2 text-left text-sm text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft hover:text-ink dark:hover:text-canvas transition-colors flex items-center justify-between"
                >
                  Переместить в раздел
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="my-1 mx-2 h-px bg-hairline dark:bg-navy-hairline" />
                <button
                  onClick={(e) => { e.preventDefault(); setShowMenu(false); onDelete() }}
                  className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  Удалить доску
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowSections(false)}
                  className="w-full px-3 py-2 text-left text-xs uppercase tracking-caption-up font-semibold text-ink-muted-soft hover:text-coral transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Назад
                </button>
                <div className="mx-2 h-px bg-hairline dark:bg-navy-hairline mb-1" />
                <div className="max-h-60 overflow-y-auto scrollbar-thin">
                  <button
                    onClick={() => handleMove(null)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                      !board.section_id
                        ? 'text-coral bg-coral-soft'
                        : 'text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-ink-muted-soft" />
                    Без раздела
                    {!board.section_id && (
                      <svg className="w-3.5 h-3.5 ml-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleMove(s.id)}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                        board.section_id === s.id
                          ? 'text-coral bg-coral-soft'
                          : 'text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}</span>
                      {board.section_id === s.id && (
                        <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

export default DashboardPage
