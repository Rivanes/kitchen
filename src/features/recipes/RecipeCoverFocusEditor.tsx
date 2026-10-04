import { PointerEvent, useMemo, useState } from 'react'
import { toUserErrorMessage } from '../../lib/userError'
import { KitchenIcon } from '../../components/KitchenIcon'

type RecipeCoverFocusEditorProps = {
  imageUrl: string
  initialX: number
  initialY: number
  onCancel: () => void
  applyLabel: string
  onApply: (x: number, y: number) => Promise<void> | void
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function RecipeCoverFocusEditor({
  imageUrl,
  initialX,
  initialY,
  onCancel,
  applyLabel,
  onApply,
}: RecipeCoverFocusEditorProps) {
  const [x, setX] = useState(clamp01(initialX))
  const [y, setY] = useState(clamp01(initialY))
  const [applying, setApplying] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const objectPosition = useMemo(() => `${x * 100}% ${y * 100}%`, [x, y])

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    setX(clamp01((event.clientX - rect.left) / rect.width))
    setY(clamp01((event.clientY - rect.top) / rect.height))
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (applying) return
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (applying || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    updateFromPointer(event)
  }

  async function applyCrop() {
    if (applying) return
    setApplying(true)
    setErrorMessage('')
    try {
      await onApply(x, y)
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się zapisać kadru.'))
      setApplying(false)
    }
  }

  return (
    <div className="recipe-focus-backdrop" role="presentation">
      <section className="recipe-focus-sheet" role="dialog" aria-modal="true" aria-labelledby="recipe-focus-title">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Zdjęcie przepisu</p>
            <h2 id="recipe-focus-title">Ustaw kadr</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} disabled={applying} aria-label="Zamknij ustawianie kadru">
            <KitchenIcon name="close" />
          </button>
        </header>

        <p className="recipe-focus-intro">
          Dotknij lub przeciągnij na zdjęciu, aby wskazać najważniejsze miejsce. Ten sam punkt działa dla miniatury i dużego zdjęcia.
        </p>

        <div
          className="recipe-focus-main"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          aria-label="Ustaw punkt kadrowania"
        >
          <img src={imageUrl} alt="" style={{ objectPosition }} draggable={false} />
          <span className="recipe-focus-target" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} aria-hidden="true" />
        </div>

        <div className="recipe-focus-previews" aria-label="Podgląd kadru">
          <div>
            <span>Widok przepisu</span>
            <div className="recipe-focus-wide"><img src={imageUrl} alt="" style={{ objectPosition }} /></div>
          </div>
          <div>
            <span>Miniatura</span>
            <div className="recipe-focus-square"><img src={imageUrl} alt="" style={{ objectPosition }} /></div>
          </div>
        </div>

        {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

        <div className="recipe-focus-actions">
          <button className="secondary-button" type="button" disabled={applying} onClick={() => { setX(0.5); setY(0.5) }}>
            Wyśrodkuj
          </button>
          <button className="primary-button" type="button" disabled={applying} onClick={() => void applyCrop()}>
            {applying ? 'Zapisuję…' : applyLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
