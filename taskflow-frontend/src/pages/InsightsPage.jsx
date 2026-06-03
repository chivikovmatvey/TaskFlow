import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { boardService } from '../services/boardService'
import ThemeToggle from '../components/common/ThemeToggle'
import { useAuth } from '../context/AuthContext'

import DateRangePicker from '../components/insights/DateRangePicker'
import { presetToRange } from '../components/insights/insightsLib'
import SummaryTab from '../components/insights/SummaryTab'
import ChartsTab from '../components/insights/ChartsTab'
import UsersTab from '../components/insights/UsersTab'
import TimeTab from '../components/insights/TimeTab'
import HistoryTab from '../components/insights/HistoryTab'
import MyMetricsTab from '../components/insights/MyMetricsTab'
import CompareTab from '../components/insights/CompareTab'

const TABS = [
  { value: 'summary', label: 'Сводка' },
  { value: 'charts', label: 'Графики' },
  { value: 'users', label: 'Пользователи' },
  { value: 'time', label: 'Время' },
  { value: 'compare', label: 'Сравнение' },
  { value: 'history', label: 'История' },
  { value: 'my', label: 'Мои показатели' },
]

function InsightsPage() {
  const { id: boardId } = useParams()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('summary')
  const [range, setRange] = useState(() => ({ preset: '30d', ...presetToRange('30d') }))

  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoard(boardId),
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy">
      <header className="border-b border-hairline dark:border-navy-hairline sticky top-0 z-30 bg-canvas/90 dark:bg-navy/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/board/${boardId}`}
              className="w-9 h-9 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all flex items-center justify-center group flex-shrink-0"
              title="К доске"
            >
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
                Аналитика
              </p>
              <h1 className="font-display text-xl sm:text-2xl tracking-display-md text-ink dark:text-canvas leading-none truncate">
                {board?.title || '...'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="hidden sm:inline-block px-3 py-2 text-sm font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div className="border-b border-hairline dark:border-navy-hairline -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 min-w-max">
              {TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`relative px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    tab === t.value
                      ? 'text-coral'
                      : 'text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas'
                  }`}
                >
                  {t.label}
                  {tab === t.value && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral animate-fadeIn" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        <div className="animate-fadeIn">
          {tab === 'summary' && <SummaryTab boardId={boardId} range={range} />}
          {tab === 'charts' && <ChartsTab boardId={boardId} range={range} />}
          {tab === 'users' && <UsersTab boardId={boardId} range={range} />}
          {tab === 'time' && <TimeTab boardId={boardId} range={range} />}
          {tab === 'compare' && <CompareTab boardId={boardId} range={range} />}
          {tab === 'history' && <HistoryTab boardId={boardId} range={range} />}
          {tab === 'my' && <MyMetricsTab boardId={boardId} range={range} />}
        </div>
      </div>
    </div>
  )
}

export default InsightsPage
