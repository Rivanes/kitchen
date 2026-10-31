import { useEffect, useRef, type ReactNode } from 'react'
import { KitchenIcon } from './KitchenIcon'

type Props = {
  titleId: string
  title: string
  kicker: string
  busy: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

/** Shared Food-style sheet structure for module-specific editors. */
export function AppFormSheet({ titleId, title, kicker, busy, onClose, children, className = '' }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const current = useRef({ busy, onClose })
  current.current = { busy, onClose }

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus({ preventScroll: true })
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !current.current.busy) current.current.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section className={`inventory-sheet ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <div><p className="eyebrow">{kicker}</p><h2 id={titleId}>{title}</h2></div>
          <button ref={closeRef} className="icon-button icon-button-quiet" type="button" onClick={onClose}
            disabled={busy} aria-label="Zamknij formularz"><KitchenIcon name="close" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}
