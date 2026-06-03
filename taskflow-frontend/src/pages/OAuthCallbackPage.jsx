import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { applyAuth } = useAuth()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const token = params.get('token')
    const userB64 = params.get('user')
    if (!token || !userB64) {
      toast.error('Ошибка авторизации')
      navigate('/login', { replace: true })
      return
    }
    try {
      const user = JSON.parse(atob(userB64))
      applyAuth({ token, user })
      toast.success('Добро пожаловать!')
      navigate(user.username ? '/dashboard' : '/complete-profile', { replace: true })
    } catch {
      toast.error('Не удалось обработать ответ')
      navigate('/login', { replace: true })
    }
  }, [params, navigate, applyAuth])

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-sm text-ink-muted dark:text-ink-muted-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-coral animate-shimmer" />
          Завершение входа...
        </div>
      </div>
    </div>
  )
}

export default OAuthCallbackPage
