import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/common/ThemeToggle'

function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Заполните все поля')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, fullName)
      toast.success('Регистрация успешна!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
  const labelClass = "block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2"

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
              Создать аккаунт
            </h1>
            <p className="text-sm text-ink-muted dark:text-ink-muted-soft">
              Уже есть?{' '}
              <Link to="/login" className="text-coral hover:text-coral-active transition-colors font-medium">
                Войти
              </Link>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className={labelClass}>Имя</label>
              <input
                id="fullName" type="text" required className={inputClass}
                placeholder="Иван Иванов"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input
                id="email" type="email" autoComplete="email" required className={inputClass}
                placeholder="ivan@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>Пароль</label>
              <input
                id="password" type="password" autoComplete="new-password" required className={inputClass}
                placeholder="Минимум 6 символов"
                value={password} onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>Повторите пароль</label>
              <input
                id="confirmPassword" type="password" autoComplete="new-password" required className={inputClass}
                placeholder="••••••••"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] mt-2"
            >
              {loading ? 'Регистрация...' : 'Создать аккаунт'}
            </button>
          </form>

          <div className="mt-6 text-center">
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

export default RegisterPage
