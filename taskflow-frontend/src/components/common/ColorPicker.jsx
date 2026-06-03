import { useState, useEffect } from 'react'

const DEFAULT_PRESETS = [
  '#cc785c', '#a9583e', '#e8a55a', '#d4a017', '#5db872', '#5db8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#c64545',
  '#64748b', '#374151', '#0d9488', '#7c3aed', '#db2777', '#f97316',
]

function normalizeHex(v) {
  if (!v) return ''
  let s = String(v).trim()
  if (!s.startsWith('#')) s = '#' + s
  return s
}

function isValidHex(v) {
  return /^#[0-9a-f]{6}$/i.test(v || '')
}

function ColorPicker({ value, onChange, presets = DEFAULT_PRESETS, label = 'Цвет', showHexInput = true }) {
  const [hex, setHex] = useState(value || '')

  useEffect(() => {
    setHex(value || '')
  }, [value])

  const isCustom = value && !presets.includes(value)

  const handleHexChange = (e) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F#]/g, '')
    setHex(raw)
    const normalized = normalizeHex(raw)
    if (isValidHex(normalized)) {
      onChange(normalized.toLowerCase())
    }
  }

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((c) => {
          const active = value?.toLowerCase() === c.toLowerCase()
          return (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setHex(c) }}
              className={`w-7 h-7 rounded-md transition-all duration-200 ${
                active ? 'ring-2 ring-offset-2 ring-offset-canvas dark:ring-offset-navy-elevated scale-110' : 'hover:scale-110'
              }`}
              style={{
                backgroundColor: c,
                ...(active ? { '--tw-ring-color': c } : {}),
              }}
              title={c}
            />
          )
        })}
        <label
          className={`relative w-7 h-7 rounded-md cursor-pointer overflow-hidden transition-all duration-200 ${
            isCustom ? 'ring-2 ring-offset-2 ring-offset-canvas dark:ring-offset-navy-elevated scale-110' : 'hover:scale-110'
          }`}
          style={isCustom ? { '--tw-ring-color': value } : {}}
          title="Свой цвет"
        >
          {isCustom ? (
            <div className="absolute inset-0" style={{ backgroundColor: value }} />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'conic-gradient(from 180deg, #f43f5e, #f59e0b, #facc15, #84cc16, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #f43f5e)',
              }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-3 h-3 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <input
            type="color"
            value={isValidHex(value) ? value : '#cc785c'}
            onChange={(e) => { onChange(e.target.value); setHex(e.target.value) }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Свой цвет"
          />
        </label>
      </div>
      {showHexInput && (
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-md border border-hairline dark:border-navy-hairline flex-shrink-0"
            style={{ backgroundColor: isValidHex(value) ? value : 'transparent' }}
          />
          <input
            type="text"
            value={hex}
            onChange={handleHexChange}
            maxLength={7}
            placeholder="#cc785c"
            className="flex-1 px-3 py-1.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-xs font-mono text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring"
          />
        </div>
      )}
    </div>
  )
}

export { DEFAULT_PRESETS }
export default ColorPicker
