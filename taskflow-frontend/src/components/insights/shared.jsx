export function UserAvatar({ user, size = 32 }) {
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

export function StatCard({ label, value, accent, hint, icon }) {
  return (
    <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-4 sm:p-5 hover:border-coral/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
          {label}
        </p>
        {icon && <span className="text-ink-muted-soft">{icon}</span>}
      </div>
      <p className={`font-display text-3xl sm:text-4xl tracking-display-md ${accent ? 'text-coral' : 'text-ink dark:text-canvas'}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-ink-muted-soft mt-1">{hint}</p>}
    </div>
  )
}

export function Card({ title, action, children, className = '' }) {
  return (
    <div className={`bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg tracking-display-md text-ink dark:text-canvas">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Loading() {
  return <div className="text-center py-16 text-ink-muted-soft animate-shimmer text-sm">Загрузка</div>
}

export function Empty({ children = 'Нет данных' }) {
  return <div className="text-center py-16 text-ink-muted-soft text-sm">{children}</div>
}
