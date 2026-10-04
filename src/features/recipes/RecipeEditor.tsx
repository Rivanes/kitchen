import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import { processRecipeCoverImage, type ProcessedRecipeImage } from './recipeImageProcessor'
import { RecipeCoverFocusEditor } from './RecipeCoverFocusEditor'
import {
  cleanRecipeName,
  createRecipe,
  deleteRecipe,
  updateRecipe,
  validateRecipeServings,
  type RecipeCoverChange,
} from './recipeMutations'
import type { RecipeReadItem } from './types'

type RecipeEditorMode =
  | { kind: 'create' }
  | { kind: 'edit'; recipe: RecipeReadItem }

type RecipeEditorProps = {
  ownerId: string
  mode: RecipeEditorMode
  onClose: () => void
  onSaved: (recipeId: string | null) => void
}

function bytesLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function RecipeEditor({ ownerId, mode, onClose, onSaved }: RecipeEditorProps) {
  const initial = mode.kind === 'edit' ? mode.recipe : null
  const firstInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initial?.name ?? '')
  const [servings, setServings] = useState(String(initial?.servings ?? 1))
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [coverChange, setCoverChange] = useState<RecipeCoverChange>({ kind: 'keep' })
  const [coverFocusX, setCoverFocusX] = useState(initial?.coverFocusX ?? 0.5)
  const [coverFocusY, setCoverFocusY] = useState(initial?.coverFocusY ?? 0.5)
  const [focusEditorOpen, setFocusEditorOpen] = useState(false)
  const [processedImage, setProcessedImage] = useState<ProcessedRecipeImage | null>(null)
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const busy = imageBusy || saving

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let focusTimer: number | undefined
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 20)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [busy, onClose])

  useEffect(() => {
    if (!processedImage) {
      setProcessedPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(processedImage.blob)
    setProcessedPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [processedImage])

  const currentCoverUrl = useMemo(() => {
    if (coverChange.kind === 'remove') return null
    if (coverChange.kind === 'replace') return processedPreviewUrl
    return initial?.coverImageUrl ?? null
  }, [coverChange.kind, initial?.coverImageUrl, processedPreviewUrl])

  async function chooseImage(file: File | null) {
    if (!file || busy) return

    setImageBusy(true)
    setErrorMessage('')
    try {
      const processed = await processRecipeCoverImage(file)
      setProcessedImage(processed)
      setCoverChange({ kind: 'replace', image: processed })
      setCoverFocusX(0.5)
      setCoverFocusY(0.5)
    } catch (error) {
      setProcessedImage(null)
      setCoverChange({ kind: 'keep' })
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się przygotować zdjęcia.'))
    } finally {
      setImageBusy(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  function removeCover() {
    if (busy) return
    setProcessedImage(null)
    setCoverChange({ kind: 'remove' })
    setCoverFocusX(0.5)
    setCoverFocusY(0.5)
    setErrorMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    let parsedServings: number
    try {
      cleanRecipeName(name)
      parsedServings = validateRecipeServings(Number(servings))
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Sprawdź dane przepisu.'))
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      if (mode.kind === 'create') {
        const createCover = coverChange.kind === 'replace'
          ? coverChange
          : { kind: 'remove' as const }

        const recipeId = await createRecipe({
          ownerId,
          name,
          servings: parsedServings,
          instructions,
          coverFocusX,
          coverFocusY,
          cover: createCover,
        })
        onSaved(recipeId)
      } else {
        const recipeId = await updateRecipe({
          ownerId,
          recipeId: mode.recipe.id,
          currentCoverPath: mode.recipe.coverImagePath,
          name,
          servings: parsedServings,
          instructions,
          coverFocusX,
          coverFocusY,
          cover: coverChange,
        })
        onSaved(recipeId)
      }
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się zapisać przepisu.'))
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (mode.kind !== 'edit' || busy) return

    setSaving(true)
    setErrorMessage('')
    try {
      await deleteRecipe({
        ownerId,
        recipeId: mode.recipe.id,
      })
      onSaved(null)
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się usunąć przepisu.'))
      setConfirmingDelete(false)
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop recipe-editor-backdrop" role="presentation">
      <section className="inventory-sheet recipe-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="recipe-editor-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <p className="eyebrow">{mode.kind === 'create' ? 'Nowy przepis' : 'Edycja przepisu'}</p>
            <h2 id="recipe-editor-title">{mode.kind === 'create' ? 'Dodaj przepis' : 'Edytuj przepis'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </header>

        <form className="inventory-form recipe-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="recipe-name">
            <span>Nazwa przepisu</span>
            <input
              ref={firstInputRef}
              id="recipe-name"
              value={name}
              maxLength={160}
              placeholder="np. Szarlotka"
              disabled={busy}
              onChange={(event) => {
                setName(event.target.value)
                setErrorMessage('')
              }}
            />
          </label>

          <label className="form-field recipe-servings-field" htmlFor="recipe-servings">
            <span>Bazowa liczba porcji</span>
            <input
              id="recipe-servings"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              step={1}
              value={servings}
              disabled={busy}
              onChange={(event) => {
                setServings(event.target.value)
                setErrorMessage('')
              }}
            />
            <small className="field-hint">Ilości składników będą później zapisane dla tej liczby porcji.</small>
          </label>

          <section className="recipe-cover-editor" aria-label="Zdjęcie przepisu">
            <div className="recipe-cover-editor-heading">
              <div>
                <strong>Zdjęcie przepisu</strong>
                <span>Opcjonalne, ale ułatwi szybkie znalezienie przepisu.</span>
              </div>
            </div>

            <div className={`recipe-cover-preview${currentCoverUrl ? ' has-image' : ''}`}>
              {currentCoverUrl ? (
                <img
                  src={currentCoverUrl}
                  alt=""
                  style={{ objectPosition: `${coverFocusX * 100}% ${coverFocusY * 100}%` }}
                />
              ) : (
                <span className="recipe-cover-placeholder" aria-hidden="true"><KitchenIcon name="image" size={30} /></span>
              )}
              {imageBusy && <span className="recipe-cover-processing">Optymalizuję…</span>}
            </div>

            {processedImage && coverChange.kind === 'replace' && (
              <p className="recipe-cover-result">
                {processedImage.mimeType === 'image/avif' ? 'AVIF' : 'WebP'}
                {' · '}{processedImage.width}×{processedImage.height}
                {' · '}{bytesLabel(processedImage.byteSize)}
              </p>
            )}

            <div className="recipe-cover-actions">
              <button className="recipe-media-button" type="button" onClick={() => galleryInputRef.current?.click()} disabled={busy}>
                <KitchenIcon name="image" size={18} />
                <span>Z galerii</span>
              </button>
              <button className="recipe-media-button" type="button" onClick={() => cameraInputRef.current?.click()} disabled={busy}>
                <KitchenIcon name="camera" size={18} />
                <span>Zrób zdjęcie</span>
              </button>
              {currentCoverUrl && (
                <button className="recipe-media-button" type="button" onClick={() => setFocusEditorOpen(true)} disabled={busy}>
                  <KitchenIcon name="edit" size={17} />
                  <span>Ustaw kadr</span>
                </button>
              )}
              {(currentCoverUrl || initial?.coverImagePath || processedImage) && (
                <button className="recipe-media-button recipe-media-remove" type="button" onClick={removeCover} disabled={busy}>
                  <KitchenIcon name="trash" size={17} />
                  <span>Usuń</span>
                </button>
              )}
            </div>

            <input
              ref={galleryInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              tabIndex={-1}
              onChange={(event) => void chooseImage(event.target.files?.[0] ?? null)}
            />
            <input
              ref={cameraInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              tabIndex={-1}
              onChange={(event) => void chooseImage(event.target.files?.[0] ?? null)}
            />

            <p className="recipe-cover-hint">
              Zdjęcie jest zmniejszane przed wysłaniem. Preferowany format to AVIF; gdy urządzenie nie potrafi go zakodować, używany jest WebP. Oryginał nie trafia do Storage.
            </p>
          </section>

          <label className="form-field" htmlFor="recipe-instructions">
            <span>Przygotowanie</span>
            <textarea
              id="recipe-instructions"
              value={instructions}
              placeholder="Opisz sposób przygotowania…"
              disabled={busy}
              onChange={(event) => {
                setInstructions(event.target.value)
                setErrorMessage('')
              }}
            />
          </label>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Anuluj</button>
            <button className="primary-button" type="submit" disabled={busy}>
              {imageBusy ? 'Przygotowuję zdjęcie…' : saving ? 'Zapisuję…' : mode.kind === 'create' ? 'Dodaj przepis' : 'Zapisz'}
            </button>
          </div>
        </form>

        {mode.kind === 'edit' && (
          <section className="recipe-delete-zone" aria-label="Usuń przepis">
            {!confirmingDelete ? (
              <button className="shopping-remove-button" type="button" onClick={() => setConfirmingDelete(true)} disabled={busy}>
                <KitchenIcon name="trash" size={17} />
                <span>Usuń przepis</span>
              </button>
            ) : (
              <div className="shopping-remove-confirm">
                <p>Usunąć „{mode.recipe.name}”? Składniki tego przepisu również zostaną usunięte.</p>
                <div>
                  <button className="secondary-button" type="button" onClick={() => setConfirmingDelete(false)} disabled={busy}>Nie</button>
                  <button className="danger-button" type="button" onClick={() => void handleDelete()} disabled={busy}>Usuń</button>
                </div>
              </div>
            )}
          </section>
        )}
      </section>

      {focusEditorOpen && currentCoverUrl && (
        <RecipeCoverFocusEditor
          imageUrl={currentCoverUrl}
          initialX={coverFocusX}
          initialY={coverFocusY}
          onCancel={() => setFocusEditorOpen(false)}
          onApply={(x, y) => {
            setCoverFocusX(x)
            setCoverFocusY(y)
            setFocusEditorOpen(false)
          }}
        />
      )}
    </div>
  )
}
