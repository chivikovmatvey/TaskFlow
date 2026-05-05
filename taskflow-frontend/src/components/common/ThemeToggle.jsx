import { useTheme } from '../../context/ThemeContext'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-md border border-hairline dark:border-navy-hairline bg-canvas dark:bg-navy-elevated text-ink dark:text-canvas hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all duration-300 ease-smooth flex items-center justify-center group overflow-hidden"
      title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      aria-label="Toggle theme"
    >
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-spring"
        style={{
          transform: isDark ? 'translateY(140%) rotate(40deg)' : 'translateY(0) rotate(0deg)',
          opacity: isDark ? 0 : 1,
        }}
      >
        {/* Sun */}
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-spring"
        style={{
          transform: isDark ? 'translateY(0) rotate(0deg)' : 'translateY(-140%) rotate(-40deg)',
          opacity: isDark ? 1 : 0,
        }}
      >
        {/* Moon */}
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      </div>
    </button>
  )
}

export default ThemeToggle
