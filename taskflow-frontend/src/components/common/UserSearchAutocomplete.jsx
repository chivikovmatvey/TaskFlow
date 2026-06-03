import { useEffect, useRef, useState } from 'react'
import { registerService } from '../../services/registerService'

function UserSearchAutocomplete({ onSelect, excludeIds = [], placeholder = 'Поиск по @username или email...', autoFocus = false }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const users = await registerService.searchUsers(q.trim())
        setResults(users.filter((u) => !excludeIds.includes(u.id)))
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, excludeIds])

  const handleSelect = (user) => {
    onSelect(user)
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md shadow-lift-lg max-h-64 overflow-y-auto animate-fadeIn">
          {loading && <div className="px-3 py-2 text-xs text-ink-muted-soft animate-shimmer">Поиск...</div>}
          {!loading && results.length === 0 && q.trim() && (
            <div className="px-3 py-3 text-xs text-ink-muted-soft text-center">Никого не нашли</div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-canvas-soft dark:hover:bg-navy-soft transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {(u.full_name || u.username || u.email)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink dark:text-canvas truncate">
                  {u.full_name || u.username || u.email}
                </div>
                <div className="text-xs text-ink-muted-soft truncate">
                  {u.username ? `@${u.username}` : u.email}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserSearchAutocomplete
