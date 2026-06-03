function OAuthButtons({ disabled }) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const base = apiUrl.replace(/\/api$/, '')

  const start = (provider) => {
    window.location.href = `${base}/api/auth/oauth/${provider}`
  }

  const btn =
    'group relative w-full py-2.5 px-4 flex items-center justify-center gap-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-sm font-medium text-ink dark:text-canvas hover:border-coral hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="space-y-2">
      <button type="button" disabled={disabled} onClick={() => start('google')} className={btn}>
        <GoogleIcon />
        <span>Войти через Google</span>
      </button>
      <button type="button" disabled={disabled} onClick={() => start('yandex')} className={btn}>
        <YandexIcon />
        <span>Войти через Яндекс</span>
      </button>
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

export default OAuthButtons
