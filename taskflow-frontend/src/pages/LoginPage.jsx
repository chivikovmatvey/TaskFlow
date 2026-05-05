import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/common/ThemeToggle'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Заполните все поля')
      return
    }

    setLoading(true)

    try {
      await signIn(email, password)
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
          <Link to="/" className="font-display text-xl tracking-display-md text-ink dark:text-canvas hover:text-coral transition-colors">
            TaskFlow
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
              <label htmlFor="email" className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
                placeholder="ivan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-white animate-shimmer" />
                  Вход
                </span>
              ) : 'Войти'}
            </button>
          </form>

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

export default LoginPage
