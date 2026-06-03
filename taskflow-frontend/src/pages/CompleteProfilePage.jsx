import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { registerService } from '../services/registerService'
import UsernameField from '../components/auth/UsernameField'
import ThemeToggle from '../components/common/ThemeToggle'

function CompleteProfilePage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    } else if (user.username) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  if (!user || user.username) return null

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim().replace(/^@/, ''))) {
      toast.error('Username: 3-30 латинских букв, цифр или _')
      return
    }
    setLoading(true)
    try {
      const data = await registerService.updateUsername(username)
      setUser(data.user)
      try {
        localStorage.setItem('taskflow_user', JSON.stringify(data.user))
      } catch {
      }
      toast.success('Готово!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy flex flex-col">
      <nav className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-4 flex justify-between items-center">
          <img src="/logo.svg" alt="TaskFlow" className="h-12 w-auto" />
          <ThemeToggle />
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-slideUp">
          <div className="text-center mb-7">
            <h1 className="font-display text-3xl tracking-display-lg text-ink dark:text-canvas mb-2">Последний шаг</h1>
            <p className="text-sm text-ink-muted dark:text-ink-muted-soft">
              Выбери уникальный username — по нему тебя смогут находить и приглашать на доски.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <UsernameField value={username} onChange={setUsername} disabled={loading} label="Username" />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.01]"
            >
              {loading ? 'Сохранение...' : 'Продолжить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CompleteProfilePage
