import { useState } from 'react'
import { PRESETS, presetToRange } from './insightsLib'

function toInputDate(d) {
  return d.toISOString().slice(0, 10)
}

function DateRangePicker({ value, onChange }) {
  const [preset, setPreset] = useState(value?.preset || '30d')
  const [customOpen, setCustomOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(value?.from ? toInputDate(value.from) : '')
  const [customTo, setCustomTo] = useState(value?.to ? toInputDate(value.to) : '')

  const apply = (p) => {
    setPreset(p)
    if (p === 'custom') {
      setCustomOpen(true)
      return
    }
    setCustomOpen(false)
    const r = presetToRange(p)
    onChange({ preset: p, ...r })
  }

  const applyCustom = () => {
    if (!customFrom || !customTo) return
    const from = new Date(customFrom)
    from.setHours(0, 0, 0, 0)
    const to = new Date(customTo)
    to.setHours(23, 59, 59, 999)
    onChange({ preset: 'custom', from, to })
    setCustomOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => apply(p.value)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-all ${
              preset === p.value
                ? 'bg-coral text-white border-coral'
                : 'bg-canvas dark:bg-navy-elevated border-hairline dark:border-navy-hairline text-ink-body dark:text-ink-muted hover:border-coral/40'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && customOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-lg shadow-lift-lg p-4 w-72">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-1">От</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-sm text-ink dark:text-canvas focus-ring"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-caption-up font-semibold text-ink-muted-soft mb-1">До</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md text-sm text-ink dark:text-canvas focus-ring"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setCustomOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink dark:hover:text-canvas"
              >
                Отмена
              </button>
              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                className="px-3 py-1.5 text-xs font-medium bg-coral hover:bg-coral-active text-white rounded-md disabled:opacity-50"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
