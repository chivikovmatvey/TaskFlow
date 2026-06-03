import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { telegramService } from '../services/telegramService'
import ThemeToggle from '../components/common/ThemeToggle'
import OAuthButtons from '../components/auth/OAuthButtons'
import TelegramLoginButton from '../components/auth/TelegramLoginButton'
import PasswordField from '../components/auth/PasswordField'

function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [tgSession, setTgSession] = useState(null)  
  const [tgWaiting, setTgWaiting] = useState(false)
  const pollRef = useRef(null)
  const navigate = useNavigate()
  const { signIn, applyAuth } = useAuth()
  const [params] = useSearchParams()

  useEffect(() => {
    const err = params.get('error')
    if (err) {
      const msg =
        err === 'oauth_no_email' ? 'Не удалось получить email от провайдера'
        : err === 'oauth_invalid_state' ? 'Сессия истекла, попробуйте ещё раз'
        : err === 'oauth_token' ? 'Ошибка авторизации'
        : 'Ошибка входа через внешний сервис'
      toast.error(msg)
    }
  }, [params])

  const startTelegramLogin = async () => {
    setLoading(true)
    try {
      const data = await telegramService.startLogin()
      setTgSession(data)
      setTgWaiting(true)
    } catch (err) {
      toast.error(err.message || 'Telegram-бот недоступен')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!tgWaiting || !tgSession?.code) return
    let cancelled = false
    pollRef.current = setInterval(async () => {
      try {
        const status = await telegramService.loginStatus(tgSession.code)
        if (cancelled) return
        if (status.status === 'logged_in' && status.token && status.user) {
          clearInterval(pollRef.current)
          applyAuth({ token: status.token, user: status.user })
          toast.success('Добро пожаловать!')
          navigate(status.user.username ? '/dashboard' : '/complete-profile', { replace: true })
        } else if (status.status === 'expired') {
          clearInterval(pollRef.current)
          toast.error('Время ожидания истекло')
          setTgWaiting(false)
          setTgSession(null)
        }
      } catch {
      }
    }, 2000)
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [tgWaiting, tgSession?.code, applyAuth, navigate])

  const cancelTelegram = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setTgWaiting(false)
    setTgSession(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier || !password) {
      toast.error('Заполните все поля')
      return
    }
    setLoading(true)
    try {
      await signIn(identifier, password)
      toast.success('Добро пожаловать!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy flex flex-col">
      <nav className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="TaskFlow" className="h-12 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-slideUp">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl tracking-display-lg text-ink dark:text-canvas mb-2">
              Войти
            </h1>
            <p className="text-sm text-ink-muted dark:text-ink-muted-soft">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-coral hover:text-coral-active transition-colors font-medium">
                Создать
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Email или @username
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                className="w-full px-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
                placeholder="ivan@example.com или @ivan"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
              />
            </div>

            <PasswordField
              id="password"
              label="Пароль"
              value={password}
              onChange={setPassword}
              disabled={loading}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-hairline dark:bg-navy-hairline" />
            <span className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">или</span>
            <div className="flex-1 h-px bg-hairline dark:bg-navy-hairline" />
          </div>

          {tgWaiting && tgSession ? (
            <TelegramWaitCard session={tgSession} onCancel={cancelTelegram} />
          ) : (
            <div className="space-y-2">
              <OAuthButtons disabled={loading} />
              <TelegramLoginButton onClick={startTelegramLogin} disabled={loading} label="Войти через Telegram" />
              <Link
                to="/register?via=telegram"
                className="block text-center text-[11px] text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors mt-2"
              >
                Ещё нет аккаунта? Зарегистрируйся через Telegram
              </Link>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-xs text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors"
            >
              ← На главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function TelegramWaitCard({ session, onCancel }) {
  return (
    <div className="space-y-4 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5 animate-fadeIn">
      <div>
        <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
          Шаг 1
        </p>
        <p className="text-sm text-ink-body dark:text-ink-muted mb-2">
          Открой бот в Telegram:
        </p>
        {session.botUsername ? (
          <a
            href={session.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.02]"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.226-4.79 1.881-9.522 3.717l-7.937 3.075-.176.064c-.382.144-1.768.661-1.79 1.692-.022 1.029.973 1.466 1.483 1.687l.058.025 4.41 1.473.115.037c.39.121.821.121 1.21 0 .39-.119.755-.355 1.082-.681l4.336-4.336c.187-.188.488-.18.665.017.176.198.165.498-.024.683l-3.59 3.41-.205.193c-.347.328-.347.892.001 1.218.196.186.45.275.703.273.254-.002.508-.094.703-.281l1.022-.972 5.115 3.73c.388.282.852.42 1.318.41.466-.012.896-.157 1.27-.453.404-.32.703-.78.84-1.301L23 4.5c.273-1.045-.265-2.062-.95-2.342-.169-.07-.345-.1-.477-.106-.066-.003-.131-.004-.197-.005l-.326.13z"/>
            </svg>
            Открыть @{session.botUsername}
          </a>
        ) : (
          <p className="text-xs text-ink-muted-soft italic">Username бота не настроен</p>
        )}
      </div>

      <div className="border-t border-hairline dark:border-navy-hairline pt-4">
        <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
          Или отправь команду
        </p>
        <code className="block p-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded font-mono text-xs text-ink dark:text-canvas">
          {session.command}
        </code>
      </div>

      <div className="border-t border-hairline dark:border-navy-hairline pt-4 flex items-center justify-between">
        <p className="text-xs text-ink-muted-soft inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-coral animate-shimmer" />
          Жду подтверждения...
        </p>
        <button
          onClick={onCancel}
          className="text-xs text-ink-muted hover:text-ink dark:hover:text-canvas transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

export default LoginPage
