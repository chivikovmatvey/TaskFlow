import { useMemo, useState } from 'react'
import Popover from './Popover'
import { selectTriggerClass } from './Select'

function Avatar({ user, size = 28 }) {
  const name = user?.full_name || user?.username || user?.email || '?'
  const initial = name[0]?.toUpperCase() || '?'
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        className="rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div
      style={style}
      className="rounded-full bg-coral text-white font-semibold flex items-center justify-center flex-shrink-0"
    >
      {initial}
    </div>
  )
}

function displayName(member) {
  const p = member?.profiles || {}
  return p.full_name || p.username || p.email || 'Без имени'
}

function secondary(member) {
  const p = member?.profiles || {}
  if (p.username && p.full_name) return `@${p.username}`
  if (p.email && (p.full_name || p.username)) return p.email
  return null
}

function AssigneeSelect({ value, onChange, members = [] }) {
  const [search, setSearch] = useState('')

  const selected = useMemo(
    () => members.find((m) => m.user_id === value) || null,
    [members, value]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter((m) => {
      const p = m.profiles || {}
      return [p.email, p.full_name, p.username]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q))
    })
  }, [members, search])

  return (
    <Popover
      align="left"
      width="trigger"
      panelClassName="w-72 overflow-hidden"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={selectTriggerClass}
        >
          <span className="flex-1 min-w-0 flex items-center gap-2 text-left">
            {selected ? (
              <>
                <Avatar user={selected.profiles} size={22} />
                <span className="truncate">{displayName(selected)}</span>
              </>
            ) : (
              <span className="text-ink-muted-soft">Не назначен</span>
            )}
          </span>
          <svg className="w-4 h-4 text-ink-muted-soft flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="p-2 border-b border-hairline dark:border-navy-hairline">
            <div className="relative">
              <svg className="w-3.5 h-3.5 text-ink-muted-soft absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-xs text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-thin py-1">
            <button
              type="button"
              onClick={() => { onChange(''); close() }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2.5 ${
                !value
                  ? 'bg-coral-soft text-coral'
                  : 'text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft'
              }`}
            >
              <div className="w-6 h-6 rounded-full border border-dashed border-hairline dark:border-navy-hairline flex items-center justify-center text-ink-muted-soft flex-shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="flex-1 truncate">Не назначен</span>
              {!value && (
                <svg className="w-4 h-4 text-coral flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-ink-muted-soft">Никого не нашлось</p>
            ) : (
              filtered.map((m) => {
                const isActive = m.user_id === value
                const sub = secondary(m)
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => { onChange(m.user_id); close() }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2.5 ${
                      isActive
                        ? 'bg-coral-soft text-coral'
                        : 'text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft hover:text-ink dark:hover:text-canvas'
                    }`}
                  >
                    <Avatar user={m.profiles} size={28} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{displayName(m)}</span>
                      {sub && <span className="block text-[11px] text-ink-muted-soft truncate">{sub}</span>}
                    </span>
                    {isActive && (
                      <svg className="w-4 h-4 text-coral flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </Popover>
  )
}

export default AssigneeSelect
