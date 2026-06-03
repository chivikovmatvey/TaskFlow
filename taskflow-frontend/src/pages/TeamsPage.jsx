import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { teamService } from '../services/teamService'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/common/ThemeToggle'
import CreateTeamModal from '../components/teams/CreateTeamModal'
import TeamDetailModal from '../components/teams/TeamDetailModal'

function TeamsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [openTeamId, setOpenTeamId] = useState(null)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: teamService.list,
  })

  const removeMutation = useMutation({
    mutationFn: teamService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Команда удалена')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy">
      <header className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link to="/dashboard" className="w-9 h-9 flex-shrink-0 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all flex items-center justify-center group">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">Управление</p>
              <h1 className="font-display text-xl sm:text-2xl tracking-display-md text-ink dark:text-canvas leading-none truncate">Команды</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <button
              onClick={() => setCreating(true)}
              className="px-3 sm:px-3.5 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02] whitespace-nowrap"
            >
              <span className="sm:hidden">+ Новая</span>
              <span className="hidden sm:inline">+ Новая команда</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        {isLoading ? (
          <div className="text-sm text-ink-muted-soft animate-shimmer">Загрузка...</div>
        ) : teams.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                isOwner={t.owner_id === user?.id}
                onOpen={() => setOpenTeamId(t.id)}
                onDelete={() => {
                  if (confirm(`Удалить команду «${t.name}»?`)) removeMutation.mutate(t.id)
                }}
              />
            ))}
          </div>
        )}
      </main>

      {creating && (
        <CreateTeamModal
          onClose={() => setCreating(false)}
          onCreated={(team) => {
            setCreating(false)
            setOpenTeamId(team.id)
          }}
        />
      )}
      {openTeamId && (
        <TeamDetailModal
          teamId={openTeamId}
          onClose={() => setOpenTeamId(null)}
        />
      )}
    </div>
  )
}

function TeamCard({ team, isOwner, onOpen, onDelete }) {
  return (
    <div
      className="group bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 hover:border-coral transition-all cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-md flex items-center justify-center text-white font-semibold" style={{ background: team.color }}>
          {team.name[0]?.toUpperCase()}
        </div>
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-ink-muted-soft hover:text-danger transition-all p-1.5"
            title="Удалить"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>
        )}
      </div>
      <h3 className="font-display text-lg tracking-display-sm text-ink dark:text-canvas leading-tight mb-1">{team.name}</h3>
      {team.description && <p className="text-xs text-ink-muted dark:text-ink-muted-soft line-clamp-2 mb-3">{team.description}</p>}
      <div className="flex items-center gap-2 text-xs text-ink-muted-soft">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        {team.member_count + 1} {pluralize(team.member_count + 1, 'участник', 'участника', 'участников')}
        {isOwner && <span className="ml-2 text-[10px] uppercase tracking-caption-up font-semibold text-coral">Владелец</span>}
      </div>
    </div>
  )
}

function EmptyState({ onCreate }) {
  return (
    <div className="text-center py-20">
      <div className="inline-flex w-14 h-14 mb-4 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-full items-center justify-center">
        <svg className="w-6 h-6 text-coral" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <h3 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-1">Ещё нет команд</h3>
      <p className="text-sm text-ink-muted dark:text-ink-muted-soft mb-5">Объедини людей в команду — будет проще звать их на доски разом</p>
      <button onClick={onCreate} className="px-5 py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02]">
        Создать первую команду
      </button>
    </div>
  )
}

function pluralize(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return many
  if (m10 === 1) return one
  if (m10 >= 2 && m10 <= 4) return few
  return many
}

export default TeamsPage
