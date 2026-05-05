import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { telegramService } from '../services/telegramService'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/common/ThemeToggle'

function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-navy">
      <header className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="w-9 h-9 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all flex items-center justify-center group"
              title="К дашборду"
            >
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">Аккаунт</p>
              <h1 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas leading-none">
                Настройки
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="px-3 py-2 text-sm font-medium text-ink-muted dark:text-ink-muted-soft hover:text-ink dark:hover:text-canvas transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 lg:px-10 py-10 space-y-8">
        {/* Profile */}
        <section className="animate-slideUp">
          <h2 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-4">
            Профиль
          </h2>
          <div className="bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-lg p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-coral text-white flex items-center justify-center font-semibold text-lg">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-ink dark:text-canvas">{user?.email}</p>
                {user?.full_name && <p className="text-xs text-ink-muted dark:text-ink-muted-soft">{user.full_name}</p>}
              </div>
            </div>
          </div>
        </section>

        <TelegramSection />
      </main>
    </div>
  )
}

// ─── Telegram setup ────────────────────────────────────────────
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

export default SettingsPage
