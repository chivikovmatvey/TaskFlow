import Popover from './Popover'

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-ink-muted-soft flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

const triggerClass =
  'w-full px-3 py-2 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas focus-ring text-sm flex items-center justify-between gap-2 cursor-pointer transition-colors hover:border-coral/50'

function Select({ value, onChange, options, placeholder = 'Выберите...', renderOption, renderTrigger }) {
  const selected = options.find((o) => o.value === value)

  return (
    <Popover
      width="trigger"
      panelClassName="w-full max-w-none overflow-hidden"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={triggerClass}
        >
          <span className="flex-1 min-w-0 text-left truncate">
            {selected
              ? renderTrigger
                ? renderTrigger(selected)
                : selected.label
              : <span className="text-ink-muted-soft">{placeholder}</span>}
          </span>
          <ChevronIcon />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1 max-h-72 overflow-y-auto scrollbar-thin">
          {options.map((opt) => {
            const isActive = opt.value === value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { onChange(opt.value); close() }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-coral-soft text-coral'
                    : 'text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft hover:text-ink dark:hover:text-canvas'
                }`}
              >
                <span className="flex-1 min-w-0 truncate">
                  {renderOption ? renderOption(opt, isActive) : opt.label}
                </span>
                {isActive && (
                  <svg className="w-4 h-4 text-coral flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </Popover>
  )
}

export { triggerClass as selectTriggerClass }
export default Select
