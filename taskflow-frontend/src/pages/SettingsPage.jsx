import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { telegramService } from '../services/telegramService'
import { registerService } from '../services/registerService'
import { authService } from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { getToken } from '../services/apiClient'
import ThemeToggle from '../components/common/ThemeToggle'
import UsernameField from '../components/auth/UsernameField'
import PasswordField from '../components/auth/PasswordField'

function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    refreshUser().catch(() => {  })
  }, [refreshUser])

  useEffect(() => {
    const linked = params.get('linked')
    const err = params.get('error')
    if (linked) {
      toast.success(`${labelFor(linked)} привязан`)
      params.delete('linked')
      setParams(params, { replace: true })
      refreshUser().catch(() => {  })
    } else if (err === 'oauth_already_linked') {
      toast.error('Этот аккаунт уже привязан к другому пользователю')
      params.delete('error')
      setParams(params, { replace: true })
    }
  }, [params, setParams, refreshUser])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy">
      <header className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              to="/dashboard"
              className="w-9 h-9 flex-shrink-0 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all flex items-center justify-center group"
              title="К дашборду"
            >
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">Аккаунт</p>
              <h1 className="font-display text-xl sm:text-2xl tracking-display-md text-ink dark:text-canvas leading-none truncate">
                Настройки
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {user?.is_admin && (
              <Link
                to="/admin"
                className="px-2 sm:px-3 py-2 text-sm font-medium text-coral hover:text-coral-active transition-colors"
              >
                Админ
              </Link>
            )}
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="px-2 sm:px-3 py-2 text-sm font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <ProfileSection />
        <UsernameSection />
        <PasswordSection />
        <ConnectedAccountsSection />
        <TelegramSection />
      </main>
    </div>
  )
}

function UsernameSection() {
  const { user, refreshUser } = useAuth()
  const [value, setValue] = useState(user?.username || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(user?.username || '')
  }, [user?.username])

  const save = async () => {
    if (!value.trim()) return
    setSaving(true)
    try {
      await registerService.updateUsername(value.trim())
      await refreshUser()
      toast.success('Username сохранён')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const changed = value.trim().replace(/^@/, '') !== (user?.username || '')

  return (
    <section className="animate-slideUp" style={{ animationDelay: '0.03s' }}>
      <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-4">Username</h2>
      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 space-y-3">
        <p className="text-sm text-ink-muted dark:text-ink-muted-soft">
          Уникальное имя через <span className="font-mono">@</span> — тебя смогут находить на досках без email.
        </p>
        <UsernameField value={value} onChange={setValue} disabled={saving} label="Ваш @username" showStatus="active" />
        {changed && (
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function TelegramSection() {
  const queryClient = useQueryClient()
  const [showCode, setShowCode] = useState(false)

  const { data: status, isLoading } = useQuery({
    queryKey: ['telegram-status'],
    queryFn: telegramService.getStatus,
    refetchInterval: showCode ? 3000 : false,
  })

  const linkMutation = useMutation({
    mutationFn: telegramService.generateLinkCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] })
      setShowCode(true)
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const unlinkMutation = useMutation({
    mutationFn: telegramService.unlink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] })
      setShowCode(false)
      toast.success('Telegram отключён')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const prefsMutation = useMutation({
    mutationFn: telegramService.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] })
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  if (isLoading) {
    return <div className="text-sm text-ink-muted-soft animate-shimmer">Загрузка...</div>
  }

  return (
    <section className="animate-slideUp" style={{ animationDelay: '0.05s' }}>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas">
          Telegram
        </h2>
        {status?.connected && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Подключён
          </span>
        )}
      </div>

      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 space-y-4">
        {!status?.botEnabled ? (
          <div className="text-center py-6">
            <p className="text-sm text-ink-muted dark:text-ink-muted-soft">
              Telegram-бот не настроен на сервере. Администратор должен задать
              <code className="mx-1 px-1.5 py-0.5 bg-canvas dark:bg-navy-elevated rounded text-xs font-mono">TELEGRAM_BOT_TOKEN</code>
              в .env.
            </p>
          </div>
        ) : status?.connected ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Аккаунт
              </p>
              <div className="flex items-center gap-2 text-sm text-ink dark:text-canvas">
                <svg className="w-4 h-4 text-coral" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.226-4.79 1.881-9.522 3.717l-7.937 3.075-.176.064c-.382.144-1.768.661-1.79 1.692-.022 1.029.973 1.466 1.483 1.687l.058.025 4.41 1.473.115.037c.39.121.821.121 1.21 0 .39-.119.755-.355 1.082-.681l4.336-4.336c.187-.188.488-.18.665.017.176.198.165.498-.024.683l-3.59 3.41-.205.193c-.347.328-.347.892.001 1.218.196.186.45.275.703.273.254-.002.508-.094.703-.281l1.022-.972 5.115 3.73c.388.282.852.42 1.318.41.466-.012.896-.157 1.27-.453.404-.32.703-.78.84-1.301L23 4.5c.273-1.045-.265-2.062-.95-2.342-.169-.07-.345-.1-.477-.106-.066-.003-.131-.004-.197-.005l-.326.13z"/>
                </svg>
                {status.username ? (
                  <span>@{status.username}</span>
                ) : (
                  <span className="text-ink-muted">Без username</span>
                )}
              </div>
            </div>

            <div className="border-t border-hairline dark:border-navy-hairline pt-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-ink dark:text-canvas">Получать уведомления</p>
                  <p className="text-xs text-ink-muted dark:text-ink-muted-soft mt-0.5">
                    Создание, перемещение, комментарии в задачах
                  </p>
                </div>
                <button
                  onClick={() => prefsMutation.mutate({ notifyEnabled: !status.notifyEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                    status.notifyEnabled ? 'bg-coral' : 'bg-canvas-card dark:bg-navy-elevated border border-hairline dark:border-navy-hairline'
                  }`}
                  role="switch"
                  aria-checked={status.notifyEnabled}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ease-spring ${
                      status.notifyEnabled ? 'translate-x-0.5' : 'translate-x-[-22px]'
                    }`}
                  />
                </button>
              </label>
            </div>

            <div className="border-t border-hairline dark:border-navy-hairline pt-4 flex justify-end">
              <button
                onClick={() => unlinkMutation.mutate()}
                disabled={unlinkMutation.isPending}
                className="px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5 rounded-md transition-colors disabled:opacity-50"
              >
                Отключить Telegram
              </button>
            </div>
          </>
        ) : showCode && status?.pendingCode ? (
          <LinkCodeView
            code={status.pendingCode}
            botUsername={status.botUsername}
            onCancel={() => setShowCode(false)}
          />
        ) : (
          <>
            <div>
              <p className="text-sm text-ink-body dark:text-ink-muted leading-relaxed mb-2">
                Подключи Telegram, чтобы получать уведомления о задачах:
              </p>
              <ul className="text-sm text-ink-muted dark:text-ink-muted-soft space-y-1 ml-4">
                <li className="list-disc">Владельцу — все изменения на его досках</li>
                <li className="list-disc">Исполнителю — только его задачи</li>
              </ul>
            </div>
            <button
              onClick={() => linkMutation.mutate()}
              disabled={linkMutation.isPending}
              className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
            >
              {linkMutation.isPending ? 'Создание кода...' : 'Подключить Telegram'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function LinkCodeView({ code, botUsername, onCancel }) {
  const [copied, setCopied] = useState(false)
  const command = `/start ${code}`

  const copy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-3">
          Шаг 1
        </p>
        <p className="text-sm text-ink-body dark:text-ink-muted">
          Открой бот в Telegram:
        </p>
        {botUsername ? (
          <a
            href={`https://t.me/${botUsername}?start=${code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02]"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.226-4.79 1.881-9.522 3.717l-7.937 3.075-.176.064c-.382.144-1.768.661-1.79 1.692-.022 1.029.973 1.466 1.483 1.687l.058.025 4.41 1.473.115.037c.39.121.821.121 1.21 0 .39-.119.755-.355 1.082-.681l4.336-4.336c.187-.188.488-.18.665.017.176.198.165.498-.024.683l-3.59 3.41-.205.193c-.347.328-.347.892.001 1.218.196.186.45.275.703.273.254-.002.508-.094.703-.281l1.022-.972 5.115 3.73c.388.282.852.42 1.318.41.466-.012.896-.157 1.27-.453.404-.32.703-.78.84-1.301L23 4.5c.273-1.045-.265-2.062-.95-2.342-.169-.07-.345-.1-.477-.106-.066-.003-.131-.004-.197-.005l-.326.13z"/>
            </svg>
            @{botUsername}
          </a>
        ) : (
          <p className="text-xs text-ink-muted-soft mt-2 italic">
            Username бота не настроен. Найди бот по токену вручную.
          </p>
        )}
      </div>

      <div className="border-t border-hairline dark:border-navy-hairline pt-4">
        <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-3">
          Шаг 2
        </p>
        <p className="text-sm text-ink-body dark:text-ink-muted mb-2">
          Отправь боту команду (или нажми на ссылку выше — она сделает это автоматически):
        </p>
        <button
          onClick={copy}
          className="w-full text-left p-3 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md font-mono text-sm text-ink dark:text-canvas hover:border-coral transition-colors flex items-center justify-between group"
        >
          <span>{command}</span>
          <span className="text-xs text-ink-muted-soft group-hover:text-coral transition-colors">
            {copied ? '✓ Скопировано' : 'Скопировать'}
          </span>
        </button>
      </div>

      <div className="border-t border-hairline dark:border-navy-hairline pt-4">
        <p className="text-xs text-ink-muted-soft inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-coral animate-shimmer" />
          Жду подтверждения от бота...
        </p>
      </div>

      <button
        onClick={onCancel}
        className="w-full px-4 py-2 text-sm font-medium text-ink-muted dark:text-ink-muted-soft hover:bg-canvas dark:hover:bg-navy-elevated rounded-md transition-colors"
      >
        Отмена
      </button>
    </div>
  )
}

function ProfileSection() {
  const { user, refreshUser, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { setFullName(user?.full_name || '') }, [user?.full_name])

  const changed = (user?.full_name || '') !== (fullName || '')

  const saveName = async () => {
    if (!changed) return
    setSaving(true)
    try {
      const u = await authService.updateProfile({ full_name: fullName.trim() })
      setUser(u)
      try { localStorage.setItem('taskflow_user', JSON.stringify(u)) } catch { /* ignore */ }
      toast.success('Профиль обновлён')
    } catch (e) {
      toast.error(e.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const onPickFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Максимум 5 МБ')
      return
    }
    setSaving(true)
    try {
      const u = await authService.uploadAvatar(f)
      setUser(u)
      try { localStorage.setItem('taskflow_user', JSON.stringify(u)) } catch { /* ignore */ }
      toast.success('Аватар обновлён')
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки')
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onRemoveAvatar = async () => {
    if (!confirm('Удалить аватар?')) return
    setSaving(true)
    try {
      const u = await authService.removeAvatar()
      setUser(u)
      try { localStorage.setItem('taskflow_user', JSON.stringify(u)) } catch { /* ignore */ }
      toast.success('Аватар удалён')
    } catch (e) {
      toast.error(e.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="animate-slideUp">
      <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-4">Профиль</h2>
      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 space-y-5">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full object-cover border border-hairline dark:border-navy-hairline" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-xl">
              {(user?.full_name || user?.username || user?.email)?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 flex flex-col items-start gap-1.5">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={saving}
              className="text-sm px-3 py-1.5 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated hover:border-coral transition-colors disabled:opacity-50"
            >
              Загрузить аватар
            </button>
            {user?.avatar_url && (
              <button
                type="button"
                onClick={onRemoveAvatar}
                disabled={saving}
                className="text-xs text-ink-muted hover:text-danger transition-colors"
              >
                Удалить аватар
              </button>
            )}
            <p className="text-[11px] text-ink-muted-soft">PNG / JPG / WebP, до 5 МБ</p>
          </div>
        </div>

        <div className="border-t border-hairline dark:border-navy-hairline pt-4">
          <label htmlFor="full_name" className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Имя</label>
          <div className="flex gap-2">
            <input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              maxLength={100}
              className="flex-1 px-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
              placeholder="Как тебя называть"
            />
            {changed && (
              <button
                onClick={saveName}
                disabled={saving}
                className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                Сохранить
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-hairline dark:border-navy-hairline pt-4 text-xs text-ink-muted dark:text-ink-muted-soft">
          Email: <span className="font-mono text-ink dark:text-canvas">{user?.email}</span>
        </div>
      </div>
    </section>
  )
}

function PasswordSection() {
  const [hasPassword, setHasPassword] = useState(true)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authService.getAccountLinks().then((d) => setHasPassword(!!d.password)).catch(() => { /* ignore */ })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (next.length < 6) return toast.error('Минимум 6 символов')
    if (next !== confirm) return toast.error('Пароли не совпадают')
    setSaving(true)
    try {
      await authService.updateProfile({ currentPassword: current || undefined, newPassword: next })
      setCurrent(''); setNext(''); setConfirm('')
      setHasPassword(true)
      toast.success(hasPassword ? 'Пароль изменён' : 'Пароль установлен')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="animate-slideUp" style={{ animationDelay: '0.04s' }}>
      <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-4">Пароль</h2>
      <form onSubmit={submit} className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 space-y-4">
        <p className="text-sm text-ink-muted dark:text-ink-muted-soft">
          {hasPassword
            ? 'Смени пароль для входа по email.'
            : 'Установи пароль — сможешь входить и через email, и через привязанные сервисы.'}
        </p>
        {hasPassword && (
          <PasswordField id="cur_pwd" label="Текущий пароль" value={current} onChange={setCurrent} disabled={saving} autoComplete="current-password" />
        )}
        <PasswordField id="new_pwd" label="Новый пароль" value={next} onChange={setNext} disabled={saving} placeholder="Минимум 6 символов" />
        <PasswordField id="new_pwd2" label="Повторите" value={confirm} onChange={setConfirm} disabled={saving} placeholder="••••••••" />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !next || !confirm}
            className="px-4 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : hasPassword ? 'Сменить пароль' : 'Установить пароль'}
          </button>
        </div>
      </form>
    </section>
  )
}

function ConnectedAccountsSection() {
  const qc = useQueryClient()
  const { data: links, isLoading } = useQuery({
    queryKey: ['account-links'],
    queryFn: authService.getAccountLinks,
  })

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const base = apiUrl.replace(/\/api$/, '')
  const token = getToken()

  const startLink = (provider) => {
    window.location.href = `${base}/api/auth/oauth/${provider}?link=1&token=${encodeURIComponent(token)}`
  }

  const unlinkMutation = useMutation({
    mutationFn: (provider) => authService.unlinkAccount(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-links'] })
      toast.success('Отвязано')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  if (isLoading) {
    return <div className="text-sm text-ink-muted-soft animate-shimmer">Загрузка...</div>
  }

  return (
    <section className="animate-slideUp" style={{ animationDelay: '0.06s' }}>
      <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-4">Подключённые сервисы</h2>
      <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 space-y-2">
        <p className="text-sm text-ink-muted dark:text-ink-muted-soft mb-2">
          Привяжи несколько сервисов — сможешь входить любым из них в один и тот же аккаунт.
        </p>
        <ProviderRow
          name="Google"
          icon={<GoogleIcon />}
          connected={links?.google}
          onConnect={() => startLink('google')}
          onDisconnect={() => unlinkMutation.mutate('google')}
        />
        <ProviderRow
          name="Яндекс"
          icon={<YandexIcon />}
          connected={links?.yandex}
          onConnect={() => startLink('yandex')}
          onDisconnect={() => unlinkMutation.mutate('yandex')}
        />
      </div>
    </section>
  )
}

function ProviderRow({ name, icon, connected, onConnect, onDisconnect }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
        <span className="text-sm text-ink dark:text-canvas">{name}</span>
        {connected && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            привязан
          </span>
        )}
      </div>
      {connected ? (
        <button onClick={onDisconnect} className="text-xs px-3 py-1.5 rounded-md border border-hairline dark:border-navy-hairline text-ink-muted hover:text-danger hover:border-danger/50 transition-colors">
          Отвязать
        </button>
      ) : (
        <button onClick={onConnect} className="text-xs px-3 py-1.5 rounded-md bg-coral hover:bg-coral-active text-white transition-colors">
          Привязать
        </button>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
function YandexIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#FC3F1D"/>
      <path d="M13.32 18.5h2.18V5.5h-3.17c-3.18 0-4.86 1.64-4.86 4.04 0 1.92.92 3.05 2.55 4.21L6.83 18.5h2.35l3.34-5.55-1.1-.74c-1.32-.89-1.96-1.58-1.96-3.06 0-1.3.92-2.18 2.66-2.18h1.2V18.5z" fill="#fff"/>
    </svg>
  )
}

function labelFor(provider) {
  if (provider === 'google') return 'Google'
  if (provider === 'yandex') return 'Яндекс'
  if (provider === 'telegram') return 'Telegram'
  return provider
}

export default SettingsPage
