import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { adminService } from '../services/adminService'
import ThemeToggle from '../components/common/ThemeToggle'

function AdminPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) 

  const load = useCallback(async (search = '') => {
    setLoading(true)
    try {
      const [list, s] = await Promise.all([
        adminService.listUsers(search),
        adminService.stats(),
      ])
      setUsers(list)
      setStats(s)
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => load(q), 300)
    return () => clearTimeout(t)
  }, [q, load])

  const refreshStats = useCallback(async () => {
    try {
      setStats(await adminService.stats())
    } catch { /* ignore */ }
  }, [])

  const onUnlink = async (u, provider) => {
    if (!confirm(`Отвязать ${provider} у ${u.email}?`)) return
    try {
      const updated = await adminService.unlinkProvider(u.id, provider)
      setUsers((arr) => arr.map((x) => (x.id === updated.id ? updated : x)))
      refreshStats()
      toast.success('Отвязано')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const onDelete = async (u) => {
    if (!confirm(`Удалить пользователя ${u.email}? Все его доски и задачи будут потеряны.`)) return
    try {
      await adminService.deleteUser(u.id)
      setUsers((arr) => arr.filter((x) => x.id !== u.id))
      refreshStats()
      toast.success('Удалён')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const onSaveEdit = async (patch) => {
    try {
      const updated = await adminService.updateUser(editing.id, patch)
      setUsers((arr) => arr.map((x) => (x.id === updated.id ? updated : x)))
      setEditing(null)
      refreshStats()
      toast.success('Сохранено')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    }
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy">
      <nav className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
              <img src="/logo.svg" alt="TaskFlow" className="h-10 sm:h-11 w-auto" />
            </Link>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-caption-up font-semibold bg-coral/10 text-coral border border-coral/30 flex-shrink-0">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link to="/dashboard" className="text-sm text-ink-muted hover:text-ink dark:hover:text-canvas">← Назад</Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-display-lg text-ink dark:text-canvas mb-1">Админ-панель</h1>
          <p className="text-sm text-ink-muted dark:text-ink-muted-soft truncate">Привет, {user.full_name || user.email}</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            <StatCard label="Юзеров" value={stats.users} />
            <StatCard label="Админов" value={stats.admins} />
            <StatCard label="Google" value={stats.google_users} />
            <StatCard label="Yandex" value={stats.yandex_users} />
            <StatCard label="Telegram" value={stats.telegram_users} />
            <StatCard label="Досок" value={stats.boards} />
            <StatCard label="Задач" value={stats.tasks} />
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск..."
            className="flex-1 max-w-md px-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
          />
          {loading && <span className="text-xs text-ink-muted-soft">Загрузка...</span>}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block bg-canvas dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-soft dark:bg-navy-elevated text-[11px] uppercase tracking-caption-up text-ink-muted">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Пользователь</th>
                <th className="text-left px-4 py-3 font-semibold">Username</th>
                <th className="text-left px-4 py-3 font-semibold">Провайдеры</th>
                <th className="text-left px-4 py-3 font-semibold">Статус</th>
                <th className="text-right px-4 py-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-hairline dark:border-navy-hairline">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink dark:text-canvas">{u.full_name || '—'}</div>
                    <div className="text-xs text-ink-muted break-all">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{u.username ? `@${u.username}` : <span className="text-danger">не задан</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.has_password && <ProviderBadge label="password" onRemove={() => onUnlink(u, 'password')} />}
                      {u.google_id && <ProviderBadge label="google" onRemove={() => onUnlink(u, 'google')} />}
                      {u.yandex_id && <ProviderBadge label="yandex" onRemove={() => onUnlink(u, 'yandex')} />}
                      {u.telegram_chat_id && <ProviderBadge label={`telegram${u.telegram_username ? ' @' + u.telegram_username : ''}`} onRemove={() => onUnlink(u, 'telegram')} />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {u.is_admin && <span className="text-coral">admin</span>}
                      {u.email_verified ? <span className="text-success">verified</span> : <span className="text-ink-muted">не подтв.</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(u)} className="text-xs px-2.5 py-1 mr-1 rounded border border-hairline dark:border-navy-hairline hover:bg-canvas-soft dark:hover:bg-navy-elevated">Редакт.</button>
                    <button onClick={() => onDelete(u)} className="text-xs px-2.5 py-1 rounded border border-danger/40 text-danger hover:bg-danger/10">Удалить</button>
                  </td>
                </tr>
              ))}
              {!users.length && !loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">Нет пользователей</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-2">
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onEdit={() => setEditing(u)}
              onDelete={() => onDelete(u)}
              onUnlink={(provider) => onUnlink(u, provider)}
            />
          ))}
          {!users.length && !loading && (
            <div className="bg-canvas dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-8 text-center text-ink-muted text-sm">
              Нет пользователей
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditModal user={editing} onClose={() => setEditing(null)} onSave={onSaveEdit} />
      )}
    </div>
  )
}

function UserCard({ user: u, onEdit, onDelete, onUnlink }) {
  return (
    <div className="bg-canvas dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-3 space-y-2">
      <div className="min-w-0">
        <div className="font-medium text-ink dark:text-canvas truncate">{u.full_name || '—'}</div>
        <div className="text-xs text-ink-muted break-all">{u.email}</div>
        <div className="text-xs text-ink-muted mt-0.5">
          {u.username ? `@${u.username}` : <span className="text-danger">username не задан</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {u.has_password && <ProviderBadge label="password" onRemove={() => onUnlink('password')} />}
        {u.google_id && <ProviderBadge label="google" onRemove={() => onUnlink('google')} />}
        {u.yandex_id && <ProviderBadge label="yandex" onRemove={() => onUnlink('yandex')} />}
        {u.telegram_chat_id && <ProviderBadge label={`telegram${u.telegram_username ? ' @' + u.telegram_username : ''}`} onRemove={() => onUnlink('telegram')} />}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {u.is_admin && <span className="px-2 py-0.5 rounded bg-coral/10 text-coral border border-coral/30 font-medium">admin</span>}
        {u.email_verified
          ? <span className="px-2 py-0.5 rounded bg-success/10 text-success border border-success/30 font-medium">verified</span>
          : <span className="px-2 py-0.5 rounded bg-canvas-soft dark:bg-navy-elevated text-ink-muted border border-hairline dark:border-navy-hairline font-medium">не подтв.</span>}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onEdit} className="flex-1 text-xs px-2.5 py-2 rounded border border-hairline dark:border-navy-hairline hover:bg-canvas-soft dark:hover:bg-navy-elevated">Редактировать</button>
        <button onClick={onDelete} className="flex-1 text-xs px-2.5 py-2 rounded border border-danger/40 text-danger hover:bg-danger/10">Удалить</button>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-canvas dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">{label}</div>
      <div className="text-2xl font-display tracking-display-md text-ink dark:text-canvas mt-0.5">{value ?? '—'}</div>
    </div>
  )
}

function ProviderBadge({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas-soft dark:bg-navy-elevated border border-hairline dark:border-navy-hairline text-[11px]">
      {label}
      <button onClick={onRemove} className="text-ink-muted-soft hover:text-danger" title="Отвязать">×</button>
    </span>
  )
}

function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    email: user.email || '',
    full_name: user.full_name || '',
    username: user.username || '',
    email_verified: !!user.email_verified,
    is_admin: !!user.is_admin,
    password: '',
  })

  const submit = (e) => {
    e.preventDefault()
    const patch = {
      email: form.email !== user.email ? form.email : undefined,
      full_name: form.full_name !== (user.full_name || '') ? form.full_name : undefined,
      username: form.username !== (user.username || '') ? form.username : undefined,
      email_verified: form.email_verified !== !!user.email_verified ? form.email_verified : undefined,
      is_admin: form.is_admin !== !!user.is_admin ? form.is_admin : undefined,
      password: form.password || undefined,
    }
    onSave(patch)
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-canvas dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg w-full max-w-md p-4 sm:p-6 my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl tracking-display-md text-ink dark:text-canvas mb-1">Редактировать</h2>
        <p className="text-xs text-ink-muted-soft mb-4 font-mono break-all">{user.id}</p>
        <form onSubmit={submit} className="space-y-3">
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Имя" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Input label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <Input label="Новый пароль (не обязательно)" type="text" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="оставь пустым" />
          <Checkbox label="Email подтверждён" checked={form.email_verified} onChange={(v) => setForm({ ...form, email_verified: v })} />
          <Checkbox label="Администратор" checked={form.is_admin} onChange={(v) => setForm({ ...form, is_admin: v })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded border border-hairline dark:border-navy-hairline">Отмена</button>
            <button type="submit" className="px-3 py-1.5 text-sm rounded bg-coral hover:bg-coral-active text-white">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas text-sm focus-ring"
      />
    </label>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink dark:text-canvas cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-coral" />
      {label}
    </label>
  )
}

export default AdminPage
