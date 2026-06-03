function TelegramLoginButton({ onClick, disabled, label = 'Войти через Telegram' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full py-2.5 px-4 flex items-center justify-center gap-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-sm font-medium text-ink dark:text-canvas hover:border-coral hover:bg-canvas-soft dark:hover:bg-navy-soft transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4 text-[#2AABEE]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.226-4.79 1.881-9.522 3.717l-7.937 3.075-.176.064c-.382.144-1.768.661-1.79 1.692-.022 1.029.973 1.466 1.483 1.687l.058.025 4.41 1.473.115.037c.39.121.821.121 1.21 0 .39-.119.755-.355 1.082-.681l4.336-4.336c.187-.188.488-.18.665.017.176.198.165.498-.024.683l-3.59 3.41-.205.193c-.347.328-.347.892.001 1.218.196.186.45.275.703.273.254-.002.508-.094.703-.281l1.022-.972 5.115 3.73c.388.282.852.42 1.318.41.466-.012.896-.157 1.27-.453.404-.32.703-.78.84-1.301L23 4.5c.273-1.045-.265-2.062-.95-2.342-.169-.07-.345-.1-.477-.106-.066-.003-.131-.004-.197-.005l-.326.13z"/>
      </svg>
      <span>{label}</span>
    </button>
  )
}

export default TelegramLoginButton
