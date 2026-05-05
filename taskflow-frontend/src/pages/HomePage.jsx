import { Link } from 'react-router-dom'
import ThemeToggle from '../components/common/ThemeToggle'

function HomePage() {
  return (
    <div className="min-h-screen bg-canvas dark:bg-navy">
      {/* Top Nav */}
      <nav className="border-b border-hairline dark:border-navy-hairline">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl tracking-display-md text-ink dark:text-canvas">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-medium text-ink-body dark:text-ink-muted hover:text-ink dark:hover:text-canvas transition-colors px-3 py-2"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-white bg-coral hover:bg-coral-active transition-colors px-4 py-2 rounded-md shadow-coral"
            >
              Начать
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-8 py-section">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 animate-slideUp">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-canvas-card dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-coral animate-shimmer" />
                <span className="text-xs uppercase tracking-caption-up text-ink-muted dark:text-ink-muted-soft font-semibold">Real-time</span>
              </div>
              <h1 className="font-display text-5xl lg:text-7xl tracking-display-xl text-ink dark:text-canvas leading-[1.05] mb-6">
                Думайте<br />на одной доске
              </h1>
              <p className="text-lg text-ink-body dark:text-ink-muted leading-relaxed max-w-xl mb-8">
                TaskFlow — канбан с настоящей синхронизацией в реальном времени.
                Карточки, разделы, метки, время — всё для команды, которая хочет видеть прогресс.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="px-6 py-3 bg-coral hover:bg-coral-active text-white text-sm font-medium rounded-md shadow-coral transition-all duration-200 hover:scale-[1.02]"
                >
                  Создать аккаунт
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline text-ink dark:text-canvas text-sm font-medium rounded-md hover:border-coral transition-all duration-200"
                >
                  Войти
                </Link>
              </div>
            </div>

            {/* Decorative card */}
            <div className="lg:col-span-5 animate-slideUp" style={{ animationDelay: '0.1s' }}>
              <div className="relative bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-xl p-6 shadow-lift">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-lg text-ink dark:text-canvas tracking-display-md">В работе</span>
                      <span className="text-xs tabular-nums text-ink-muted">3</span>
                    </div>
                  </div>
                  {[
                    { title: 'Подключить webhook', priority: 'urgent', dot: 'bg-danger' },
                    { title: 'Дизайн dashboard', priority: 'high', dot: 'bg-amber' },
                    { title: 'Рефакторинг auth', priority: 'medium', dot: 'bg-coral' },
                  ].map((task, i) => (
                    <div
                      key={i}
                      className="bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-lg p-3 hover:border-coral/40 transition-colors"
                    >
                      <p className="text-sm font-medium text-ink dark:text-canvas mb-1.5">{task.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${task.dot}`} />
                        <span className="text-[11px] text-ink-muted">{task.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-8 pb-section">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
          {[
            {
              title: 'Канбан-доски',
              text: 'Перетаскивайте задачи между колонками. Автоматическая сортировка и сохранение позиций.',
            },
            {
              title: 'Командная работа',
              text: 'Приглашайте коллег по email, назначайте роли, видите кто онлайн прямо сейчас.',
            },
            {
              title: 'Аналитика',
              text: 'Графики прогресса, история действий, отслеживание времени по задачам.',
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-canvas-card dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-xl p-8 hover:border-coral/30 transition-colors duration-300"
            >
              <h3 className="font-display text-2xl tracking-display-md text-ink dark:text-canvas mb-3">{f.title}</h3>
              <p className="text-sm text-ink-body dark:text-ink-muted leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-hairline dark:border-navy-hairline">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6 text-center text-xs text-ink-muted-soft">
          TaskFlow · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}

export default HomePage
