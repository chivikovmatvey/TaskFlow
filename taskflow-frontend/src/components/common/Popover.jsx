import { useEffect, useRef, useState, cloneElement } from 'react'

function Popover({ trigger, children, align = 'left', panelClassName = '', width = 'auto' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const close = () => setOpen(false)
  const toggle = () => setOpen((v) => !v)

  const triggerElement = typeof trigger === 'function'
    ? trigger({ open, toggle, close })
    : cloneElement(trigger, { onClick: toggle, 'aria-expanded': open })

  const widthStyle = width === 'trigger' ? { minWidth: '100%' } : width !== 'auto' ? { minWidth: width } : null

  return (
    <div ref={wrapRef} className="relative">
      {triggerElement}
      {open && (
        <div
          className={`absolute z-50 mt-1 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-lg shadow-lift-lg animate-scaleIn ${align === 'right' ? 'right-0' : 'left-0'} ${panelClassName}`}
          style={{
            transformOrigin: align === 'right' ? 'top right' : 'top left',
            ...widthStyle,
          }}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  )
}

export default Popover
