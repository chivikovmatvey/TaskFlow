import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../../services/socketClient'
import { useAuth } from '../../context/AuthContext'
import { boardMemberService } from '../../services/boardMemberService'

function OnlineUsers({ boardId }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [online, setOnline] = useState(() => new Map())
  const [lastSeenOverride, setLastSeenOverride] = useState(() => new Map())
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return

    const onList = (list) => {
      setOnline(() => {
        const m = new Map()
        for (const p of list) m.set(p.userId, p)
        if (!m.has(user.id)) {
          m.set(user.id, {
            userId: user.id,
            email: user.email,
            full_name: user.full_name,
            username: user.username,
            avatar_url: user.avatar_url,
          })
        }
        return m
      })
    }
    const onOnline = (p) => {
      setOnline((prev) => {
        const m = new Map(prev)
        m.set(p.userId, p)
        return m
      })
    }
    const onOffline = ({ userId, last_seen }) => {
      if (userId === user.id) return
      setOnline((prev) => {
        if (!prev.has(userId)) return prev
        const m = new Map(prev)
        m.delete(userId)
        return m
      })
      if (last_seen) {
        setLastSeenOverride((prev) => {
          const m = new Map(prev)
          m.set(userId, last_seen)
          return m
        })
      }
      if (boardId) {
        qc.invalidateQueries({ queryKey: ['board-members', boardId] })
      }
    }
    const requestList = () => socket.emit('presence:list')

    socket.on('presence:list', onList)
    socket.on('presence:online', onOnline)
    socket.on('presence:offline', onOffline)
    socket.on('connect', requestList)

    setOnline((prev) => {
      if (prev.has(user.id)) return prev
      const m = new Map(prev)
      m.set(user.id, {
        userId: user.id,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        avatar_url: user.avatar_url,
      })
      return m
    })

    if (socket.connected) {
      requestList()
    } else {
      socket.connect?.()
    }

    return () => {
      socket.off('presence:list', onList)
      socket.off('presence:online', onOnline)
      socket.off('presence:offline', onOffline)
      socket.off('connect', requestList)
    }
  }, [user, boardId, qc])

  const { data: members = [] } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => boardMemberService.getBoardMembers(boardId),
    enabled: !!boardId,
    refetchInterval: open ? 15000 : false,
  })

  useEffect(() => {
    if (!open) return
    const click = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', click)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', click)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  const { onlineList, offlineList } = useMemo(() => {
    const onlineL = []
    const offlineL = []
    for (const m of members) {
      const id = m.user_id
      const presenceProfile = online.get(id)
      const isOnline = !!presenceProfile
      const profile = m.profiles || {}
      const u = {
        id,
        email: profile.email || presenceProfile?.email,
        full_name: profile.full_name || presenceProfile?.full_name,
        username: profile.username || presenceProfile?.username,
        avatar_url: profile.avatar_url || presenceProfile?.avatar_url,
        last_seen: lastSeenOverride.get(id) || m.last_seen,
        online: isOnline,
      }
      if (isOnline) onlineL.push(u)
      else offlineL.push(u)
    }
    onlineL.sort((a, b) =>
      (a.full_name || a.username || a.email || '').localeCompare(b.full_name || b.username || b.email || '')
    )
    offlineL.sort((a, b) => {
      const ta = a.last_seen ? new Date(a.last_seen).getTime() : 0
      const tb = b.last_seen ? new Date(b.last_seen).getTime() : 0
      return tb - ta
    })
    return { onlineList: onlineL, offlineList: offlineL }
  }, [members, online, lastSeenOverride])

  if (members.length === 0) return null

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-2 py-1 rounded-md border transition-colors ${open ? 'border-coral bg-canvas-soft dark:bg-navy-soft' : 'border-transparent hover:border-hairline dark:hover:border-navy-hairline'}`}
        title="Участники доски"
      >
        <div className="flex items-center -space-x-2">
          {onlineList.slice(0, 5).map((u) => (
            <Avatar key={u.id} user={u} size={28} ringClass="border-2 border-canvas dark:border-navy" />
          ))}
          {onlineList.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-canvas-soft dark:bg-navy-elevated border-2 border-canvas dark:border-navy text-ink dark:text-canvas text-[10px] font-semibold flex items-center justify-center">
              +{onlineList.length - 5}
            </div>
          )}
          {onlineList.length === 0 && (
            <div className="w-7 h-7 rounded-full bg-canvas-soft dark:bg-navy-elevated border-2 border-canvas dark:border-navy text-ink-muted text-[10px] flex items-center justify-center">
              0
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${onlineList.length ? 'bg-success animate-shimmer' : 'bg-ink-muted-soft'}`} />
          <span className="text-xs text-ink-muted dark:text-ink-muted-soft">
            {onlineList.length} онлайн
          </span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-lg shadow-lift-lg z-40 overflow-hidden animate-scaleIn origin-top-right">
          <div className="px-4 py-3 border-b border-hairline dark:border-navy-hairline flex items-baseline justify-between">
            <h3 className="font-display text-base tracking-display-sm text-ink dark:text-canvas">Участники</h3>
            <span className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">
              {onlineList.length} из {onlineList.length + offlineList.length}
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto py-1">
            {onlineList.length > 0 && (
              <Group title="Сейчас онлайн" count={onlineList.length}>
                {onlineList.map((u) => <Row key={u.id} user={u} online />)}
              </Group>
            )}
            {offlineList.length > 0 && (
              <Group title="Был(а) в сети" count={offlineList.length}>
                {offlineList.map((u) => <Row key={u.id} user={u} />)}
              </Group>
            )}
            {onlineList.length + offlineList.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-ink-muted-soft">Участников пока нет</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Group({ title, count, children }) {
  return (
    <div className="py-1">
      <div className="px-4 py-1.5 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">{title}</span>
        <span className="text-[10px] text-ink-muted-soft">{count}</span>
      </div>
      <div className="space-y-0.5 px-1">{children}</div>
    </div>
  )
}

function Row({ user, online }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-canvas-soft dark:hover:bg-navy-soft">
      <Avatar user={user} size={32} ringClass={online ? 'ring-2 ring-success/40' : ''} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-ink dark:text-canvas truncate">
            {user.full_name || user.username || user.email}
          </span>
          {online && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
        </div>
        <div className="text-[11px] text-ink-muted-soft truncate">
          {user.username ? `@${user.username}` : user.email}
          {!online && ` · ${formatLastSeen(user.last_seen)}`}
        </div>
      </div>
    </div>
  )
}

function Avatar({ user, size = 28, ringClass = '' }) {
  const initial = (user.full_name || user.username || user.email || '?')[0]?.toUpperCase() || '?'
  const style = { width: size, height: size, fontSize: size * 0.4 }
  return user.avatar_url ? (
    <img
      src={user.avatar_url}
      alt=""
      referrerPolicy="no-referrer"
      style={style}
      className={`rounded-full object-cover ${ringClass}`}
    />
  ) : (
    <div
      style={style}
      className={`rounded-full bg-coral text-white font-semibold flex items-center justify-center shrink-0 ${ringClass}`}
    >
      {initial}
    </div>
  )
}

function formatLastSeen(iso) {
  if (!iso) return 'давно не заходил'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'был(а) только что'
  if (diffMin < 60) return `был(а) в сети ${diffMin} мин назад`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `был(а) в сети ${diffH} ${pluralizeHours(diffH)} назад`
  return `был(а) в сети ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

function pluralizeHours(n) {
  const m10 = n % 10, m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return 'часов'
  if (m10 === 1) return 'час'
  if (m10 >= 2 && m10 <= 4) return 'часа'
  return 'часов'
}

export default OnlineUsers
