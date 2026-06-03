import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { registerService } from '../services/registerService'
import ThemeToggle from '../components/common/ThemeToggle'
import OAuthButtons from '../components/auth/OAuthButtons'
import TelegramLoginButton from '../components/auth/TelegramLoginButton'
import UsernameField from '../components/auth/UsernameField'
import PasswordField from '../components/auth/PasswordField'

const inputClass = 'w-full px-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm'
const labelClass = 'block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2'

function RegisterPage() {
  const [params] = useSearchParams()
  const initialMode = params.get('via') === 'telegram' ? 'tg-start' : 'form'
  const [mode, setMode] = useState(initialMode) 
  const navigate = useNavigate()
  const { applyAuth } = useAuth()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const [tgSession, setTgSession] = useState(null)

  const submitEmailRegister = async (e) => {
    e.preventDefault()
    if (!fullName || !username || !email || !password || !confirmPassword) {
      toast.error('Заполните обязательные поля')
      return
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim().replace(/^@/, ''))) {
      toast.error('Username: 3-30 латинских букв, цифр или _')
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
      await registerService.startEmailRegister({ email, password, fullName, username })
      toast.success('Код отправлен на email')
      setMode('code')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const verifyEmailCode = async (e) => {
    e.preventDefault()
    if (!code || code.length < 6) {
      toast.error('Введите 6-значный код')
      return
    }
    setLoading(true)
    try {
      const data = await registerService.verifyEmailCode({ email, code })
      applyAuth({ token: data.token, user: data.user })
      toast.success('Аккаунт создан!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const resendEmailCode = async () => {
    try {
      await registerService.resendEmailCode(email)
      toast.success('Новый код отправлен')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const startTelegram = async () => {
    setLoading(true)
    try {
      const data = await registerService.startTelegramRegister()
      setTgSession(data)
      setMode('tg-wait')
    } catch (err) {
      toast.error(err.message || 'Telegram-бот недоступен')
    } finally {
      setLoading(false)
    }
  }

  const pollRef = useRef(null)
  useEffect(() => {
    if (mode !== 'tg-wait' || !tgSession?.code) return
    let cancelled = false
    pollRef.current = setInterval(async () => {
      try {
        const status = await registerService.telegramRegisterStatus(tgSession.code)
        if (cancelled) return
        if (status.status === 'telegram_verified') {
          clearInterval(pollRef.current)
          setTgSession((s) => ({ ...s, telegramUsername: status.telegramUsername, telegramFirstName: status.telegramFirstName }))
          setMode('tg-email')
        } else if (status.status === 'expired') {
          clearInterval(pollRef.current)
          toast.error('Время ожидания истекло — начните заново')
          setMode('tg-start')
        }
      } catch (err) {
      }
    }, 2000)
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [mode, tgSession?.code])

  const submitTgEmail = async (e) => {
    e.preventDefault()
    if (!email || !username) return toast.error('Email и username обязательны')
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim().replace(/^@/, ''))) {
      return toast.error('Username: 3-30 латинских букв, цифр или _')
    }
    setLoading(true)
    try {
      await registerService.telegramSubmitEmail({
        code: tgSession.code,
        email,
        fullName: fullName || tgSession.telegramFirstName || null,
        username,
      })
      toast.success('Код отправлен на email')
      setMode('tg-code')
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const verifyTgCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await registerService.telegramVerifyCode({ email, code })
      applyAuth({ token: data.token, user: data.user })
      toast.success('Аккаунт создан!')
      navigate('/dashboard')
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
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="TaskFlow" className="h-12 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-slideUp">
          {mode === 'form' && (
            <>
              <Heading title="Создать аккаунт" sub={<>Уже есть? <Link to="/login" className="text-coral hover:text-coral-active font-medium">Войти</Link></>} />
              <form className="space-y-4" onSubmit={submitEmailRegister}>
                <Field id="fullName" label="Имя" value={fullName} onChange={setFullName} disabled={loading} placeholder="Иван Иванов" />
                <UsernameField value={username} onChange={setUsername} disabled={loading} label="Username" />
                <Field id="email" type="email" label="Email" value={email} onChange={setEmail} disabled={loading} placeholder="ivan@example.com" />
                <PasswordField id="password" label="Пароль" value={password} onChange={setPassword} disabled={loading} placeholder="Минимум 6 символов" />
                <PasswordField id="confirmPassword" label="Повторите пароль" value={confirmPassword} onChange={setConfirmPassword} disabled={loading} placeholder="••••••••" />
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.01] mt-2">
                  {loading ? 'Создание...' : 'Зарегистрироваться'}
                </button>
              </form>

              <Divider />
              <OAuthButtons disabled={loading} />
              <div className="mt-2">
                <TelegramLoginButton onClick={() => setMode('tg-start')} disabled={loading} label="Регистрация через Telegram" />
              </div>

              <BackHome />
            </>
          )}

          {mode === 'code' && (
            <>
              <Heading title="Подтвердите email" sub={<>Код отправлен на <span className="text-ink dark:text-canvas font-medium">{email}</span></>} />
              <form className="space-y-4" onSubmit={verifyEmailCode}>
                <CodeInput value={code} onChange={setCode} disabled={loading} />
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.01]">
                  {loading ? 'Проверка...' : 'Подтвердить и войти'}
                </button>
              </form>
              <div className="mt-5 flex items-center justify-between text-xs">
                <button onClick={() => setMode('form')} className="text-ink-muted hover:text-ink dark:hover:text-canvas transition-colors">← Изменить данные</button>
                <button onClick={resendEmailCode} className="text-coral hover:text-coral-active font-medium transition-colors">Отправить ещё раз</button>
              </div>
            </>
          )}

          {mode === 'tg-start' && (
            <>
              <Heading title="Через Telegram" sub="Привяжи Telegram, потом подтвердишь email" />
              <div className="space-y-3 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5">
                <p className="text-sm text-ink-body dark:text-ink-muted">
                  Откроется бот в Telegram. Подтверди в нём — мы запомним твой аккаунт.
                </p>
                <button onClick={startTelegram} disabled={loading} className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.01] disabled:opacity-50">
                  {loading ? 'Создание...' : 'Открыть Telegram'}
                </button>
                <button onClick={() => setMode('form')} className="w-full py-2 text-sm text-ink-muted hover:text-ink dark:hover:text-canvas">
                  Назад к обычной регистрации
                </button>
              </div>
            </>
          )}

          {mode === 'tg-wait' && tgSession && (
            <>
              <Heading title="Жду подтверждения" sub="Открой бот и нажми Start" />
              <div className="space-y-4 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5">
                {tgSession.url && (
                  <a href={tgSession.url} target="_blank" rel="noopener noreferrer"
                     className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all hover:scale-[1.01]">
                    Открыть @{tgSession.botUsername}
                  </a>
                )}
                <div>
                  <p className="text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">Или отправь боту команду</p>
                  <code className="block p-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded font-mono text-xs">{tgSession.command}</code>
                </div>
                <p className="text-xs text-ink-muted-soft inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-coral animate-shimmer" />
                  Жду подтверждения от Telegram...
                </p>
                <button onClick={() => setMode('tg-start')} className="w-full py-2 text-sm text-ink-muted hover:text-ink dark:hover:text-canvas">Отмена</button>
              </div>
            </>
          )}

          {mode === 'tg-email' && (
            <>
              <Heading title="Введи email" sub={<>Telegram привязан{tgSession?.telegramUsername ? <>: <span className="text-ink dark:text-canvas font-medium">@{tgSession.telegramUsername}</span></> : ''}. Осталось подтвердить email.</>} />
              <form className="space-y-4" onSubmit={submitTgEmail}>
                <Field id="fullName" label="Имя" value={fullName} onChange={setFullName} disabled={loading} placeholder={tgSession?.telegramFirstName || 'Иван Иванов'} />
                <UsernameField value={username} onChange={setUsername} disabled={loading} label="Username" />
                <Field id="email" type="email" label="Email" value={email} onChange={setEmail} disabled={loading} placeholder="ivan@example.com" />
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.01] mt-2">
                  {loading ? 'Создание...' : 'Зарегистрироваться'}
                </button>
              </form>
            </>
          )}

          {mode === 'tg-code' && (
            <>
              <Heading title="Подтвердите email" sub={<>Код отправлен на <span className="text-ink dark:text-canvas font-medium">{email}</span></>} />
              <form className="space-y-4" onSubmit={verifyTgCode}>
                <CodeInput value={code} onChange={setCode} disabled={loading} />
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 disabled:opacity-50 hover:scale-[1.01]">
                  {loading ? 'Проверка...' : 'Завершить регистрацию'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Heading({ title, sub }) {
  return (
    <div className="text-center mb-7">
      <h1 className="font-display text-4xl tracking-display-lg text-ink dark:text-canvas mb-2">{title}</h1>
      <p className="text-sm text-ink-muted dark:text-ink-muted-soft">{sub}</p>
    </div>
  )
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="flex-1 h-px bg-hairline dark:bg-navy-hairline" />
      <span className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft">или</span>
      <div className="flex-1 h-px bg-hairline dark:bg-navy-hairline" />
    </div>
  )
}

function Field({ id, label, value, onChange, type = 'text', disabled, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id} type={type} required className={inputClass}
        placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'email' : 'off'}
      />
    </div>
  )
}

function CodeInput({ value, onChange, disabled }) {
  return (
    <div>
      <label className={labelClass}>6-значный код</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        disabled={disabled}
        className="w-full px-3.5 py-3 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-center font-mono text-2xl tracking-[0.4em]"
        placeholder="000000"
        autoFocus
      />
    </div>
  )
}

function BackHome() {
  return (
    <div className="mt-6 text-center">
      <Link to="/" className="text-xs text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors">
        ← На главную
      </Link>
    </div>
  )
}

export default RegisterPage
