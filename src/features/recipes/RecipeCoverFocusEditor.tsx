import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { RecipeCoverImage } from './RecipeCoverImage'
import {
  getContainedImageRect,
  mapPointerToSourceFocus,
  RECIPE_COVER_HERO_ASPECT,
  RECIPE_COVER_THUMBNAIL_ASPECT,
} from './recipeCoverCrop'

type RecipeCoverFocusEditorProps = {
  imageUrl: string
  initialX: number
  initialY: number
  onCancel: () => void
  onApply: (x: number, y: number) => void
}

type Size = { width: number; height: number }

export function RecipeCoverFocusEditor({
  imageUrl,
  initialX,
  initialY,
  onCancel,
  onApply,
}: RecipeCoverFocusEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [sourceSize, setSourceSize] = useState<Size>({ width: 0, height: 0 })
  const [stageSize, setStageSize] = useState<Size>({ width: 0, height: 0 })
  const [x, setX] = useState(initialX)
  const [y, setY] = useState(initialY)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const update = () => {
      const rect = stage.getBoundingClientRect()
      setStageSize({ width: rect.width, height: rect.height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const containedRect = useMemo(() => getContainedImageRect({
    containerWidth: stageSize.width,
    containerHeight: stageSize.height,
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
  }), [sourceSize.height, sourceSize.width, stageSize.height, stageSize.width])

  const markerStyle = useMemo(() => ({
    left: containedRect.x + x * containedRect.width,
    top: containedRect.y + y * containedRect.height,
  }), [containedRect.height, containedRect.width, containedRect.x, containedRect.y, x, y])

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const next = mapPointerToSourceFocus({
      pointerX: event.clientX - rect.left,
      pointerY: event.clientY - rect.top,
      containedRect,
    })
    setX(next.x)
    setY(next.y)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    updateFromPointer(event)
  }

  return (
    <div className="recipe-focus-backdrop" role="presentation">
      <section className="recipe-focus-sheet" role="dialog" aria-modal="true" aria-labelledby="recipe-focus-title">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Zdjęcie przepisu</p>
            <h2 id="recipe-focus-title">Ustaw kadr</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Zamknij ustawianie kadru">
            <KitchenIcon name="close" />
          </button>
        </header>

        <p className="recipe-focus-intro">Wskaż na pełnym zdjęciu najważniejsze miejsce.</p>

        <div
          ref={stageRef}
          className="recipe-focus-source-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          aria-label="Wybierz punkt kadrowania"
        >
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={(event) => setSourceSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })}
          />
          {containedRect.width > 0 && containedRect.height > 0 && (
            <span className="recipe-focus-target" style={markerStyle} aria-hidden="true" />
          )}
        </div>

        <div className="recipe-focus-previews" aria-label="Podgląd kadru">
          <div>
            <span>Widok przepisu</span>
            <div className="recipe-focus-wide" style={{ aspectRatio: RECIPE_COVER_HERO_ASPECT }}>
              <RecipeCoverImage src={imageUrl} alt="" focusX={x} focusY={y} />
            </div>
          </div>
          <div>
            <span>Miniatura</span>
            <div className="recipe-focus-square" style={{ aspectRatio: RECIPE_COVER_THUMBNAIL_ASPECT }}>
              <RecipeCoverImage src={imageUrl} alt="" focusX={x} focusY={y} />
            </div>
          </div>
        </div>

        <div className="recipe-focus-actions">
          <button className="secondary-button" type="button" onClick={() => { setX(0.5); setY(0.5) }}>
            Wyśrodkuj
          </button>
          <button className="primary-button" type="button" onClick={() => onApply(x, y)}>
            Zastosuj
          </button>
        </div>
      </section>
    </div>
  )
}
