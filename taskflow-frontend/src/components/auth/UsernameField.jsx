import { useEffect, useState } from 'react'
import { registerService } from '../../services/registerService'

const RE = /^[a-zA-Z0-9_]{3,30}$/

function UsernameField({ value, onChange, disabled, label = 'Username (необязательно)', showStatus = 'always' }) {
  const [status, setStatus] = useState('idle') // idle | checking | ok | bad
  const [reason, setReason] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const v = String(value || '').trim().replace(/^@/, '')
    if (!v) {
      setStatus('idle')
      setReason('')
      return
    }
    if (!RE.test(v)) {
      setStatus('bad')
      setReason('3-30 латинских букв, цифр или _')
      return
    }
    setStatus('checking')
    const t = setTimeout(async () => {
      try {
        const r = await registerService.checkUsername(v)
        if (r.available) {
          setStatus('ok')
          setReason('Свободен')
        } else {
          setStatus('bad')
          setReason(
            r.reason === 'taken'
              ? 'Уже занят'
              : r.reason === 'reserved'
                ? 'Зарезервирован'
                : 'Неверный формат'
          )
        }
      } catch {
        setStatus('idle')
      }
    }, 350)
    return () => clearTimeout(t)
  }, [value])

  const colorClass =
    status === 'ok' ? 'text-success' : status === 'bad' ? 'text-danger' : 'text-ink-muted-soft'

  return (
    <div>
      <label className="block text-xs uppercase tracking-caption-up font-semibold text-ink-muted dark:text-ink-muted-soft mb-2">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted-soft text-sm pointer-events-none">@</span>
        <input
          type="text"
          autoComplete="off"
          spellCheck="false"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/^@/, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="ivan_petrov"
          className="w-full pl-8 pr-3.5 py-2.5 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas placeholder:text-ink-muted-soft focus-ring text-sm"
        />
      </div>
      {value && (showStatus === 'always' || (showStatus === 'active' && focused)) && (
        <p className={`mt-1.5 text-xs ${colorClass}`}>
          {status === 'checking' ? 'Проверка...' : reason}
        </p>
      )}
    </div>
  )
}

export default UsernameField
