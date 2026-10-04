import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import {
  getDefaultUnitCode,
  loadMeasurementUnits,
  type MeasurementUnit,
} from '../measurements/measurementUnits'
import {
  ProductAutocompleteField,
  useProductAutocomplete,
} from '../products/ProductAutocomplete'
import {
  cleanCanonicalProductName,
  loadOwnerProductCatalog,
  type CanonicalProductIdentity,
} from '../products/productCatalogMutations'
import {
  formatQuantity,
  formatQuantityInput,
  parseQuantityInput,
} from '../quantity/quantity'
import { QuantityStepperInput } from '../quantity/QuantityStepperInput'
import { RecipeCoverFocusEditor } from './RecipeCoverFocusEditor'
import { RecipeCoverImage } from './RecipeCoverImage'
import { parseOptionalRecipeDuration, RECIPE_DURATION_MAX, RECIPE_DURATION_MIN } from './recipeDuration'
import { RECIPE_COVER_HERO_ASPECT } from './recipeCoverCrop'
import { processRecipeCoverImage, type ProcessedRecipeImage } from './recipeImageProcessor'
import {
  cleanRecipeName,
  deleteRecipe,
  saveRecipeSnapshot,
  validateRecipeServings,
  type RecipeCoverChange,
  type RecipeIngredientDraftInput,
  type RecipeSectionDraftInput,
} from './recipeMutations'
import {
  cleanRecipeSectionName,
  DEFAULT_PRIMARY_RECIPE_SECTION_NAME,
  recipeSectionIdentity,
  validateRecipeSections,
} from './recipeSections'
import type { RecipeIngredientRead, RecipeReadItem, RecipeSectionRead } from './types'

type RecipeEditorMode =
  | { kind: 'create' }
  | { kind: 'edit'; recipe: RecipeReadItem }

type RecipeEditorProps = {
  ownerId: string
  mode: RecipeEditorMode
  onClose: () => void
  onSaved: (recipeId: string | null) => void
}

type RecipeSectionDraft = {
  id: string
  name: string
  isPrimary: boolean
}

type IngredientDraftRow = {
  id: string
  productId: string | null
  productName: string
  quantity: number
  unitCode: string
  unitSymbol: string
  sectionId: string
  note: string
}

type IngredientFormDraft = {
  id: string
  productId: string | null
  productName: string
  quantity: string
  unitCode: string
  sectionId: string
  note: string
}

type SectionEditorState =
  | { kind: 'create'; source: 'manager' | 'ingredient'; name: string }
  | { kind: 'rename'; sectionId: string; name: string }

function sectionFromRead(section: RecipeSectionRead): RecipeSectionDraft {
  return { id: section.id, name: section.name, isPrimary: section.isPrimary }
}

function rowFromRead(ingredient: RecipeIngredientRead): IngredientDraftRow {
  return {
    id: ingredient.id,
    productId: ingredient.productId,
    productName: ingredient.productName,
    quantity: ingredient.quantity,
    unitCode: ingredient.unitCode,
    unitSymbol: ingredient.unitSymbol,
    sectionId: ingredient.sectionId,
    note: ingredient.note ?? '',
  }
}

function formFromRow(row: IngredientDraftRow): IngredientFormDraft {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    quantity: formatQuantityInput(row.quantity),
    unitCode: row.unitCode,
    sectionId: row.sectionId,
    note: row.note,
  }
}

export function RecipeEditor({ ownerId, mode, onClose, onSaved }: RecipeEditorProps) {
  const initial = mode.kind === 'edit' ? mode.recipe : null
  const firstInputRef = useRef<HTMLInputElement>(null)
  const ingredientProductRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initial?.name ?? '')
  const [servings, setServings] = useState(String(initial?.servings ?? 1))
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(initial?.prepTimeMinutes ? String(initial.prepTimeMinutes) : '')
  const [cookTimeMinutes, setCookTimeMinutes] = useState(initial?.cookTimeMinutes ? String(initial.cookTimeMinutes) : '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [coverChange, setCoverChange] = useState<RecipeCoverChange>({ kind: 'keep' })
  const [coverFocusX, setCoverFocusX] = useState(initial?.coverFocusX ?? 0.5)
  const [coverFocusY, setCoverFocusY] = useState(initial?.coverFocusY ?? 0.5)
  const [focusEditorOpen, setFocusEditorOpen] = useState(false)
  const [processedImage, setProcessedImage] = useState<ProcessedRecipeImage | null>(null)
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null)

  const [products, setProducts] = useState<CanonicalProductIdentity[]>([])
  const [units, setUnits] = useState<MeasurementUnit[]>([])
  const [sections, setSections] = useState<RecipeSectionDraft[]>(() => (
    initial?.sections.map(sectionFromRead)
    ?? [{ id: crypto.randomUUID(), name: DEFAULT_PRIMARY_RECIPE_SECTION_NAME, isPrimary: true }]
  ))
  const [ingredients, setIngredients] = useState<IngredientDraftRow[]>(() => (
    initial?.ingredients.map(rowFromRead) ?? []
  ))
  const [ingredientForm, setIngredientForm] = useState<IngredientFormDraft | null>(null)
  const [sectionEditor, setSectionEditor] = useState<SectionEditorState | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)

  const [imageBusy, setImageBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const busy = imageBusy || saving
  const autocomplete = useProductAutocomplete(products, ingredientForm?.productName ?? '')
  const ingredientUnit = units.find((unit) => unit.code === ingredientForm?.unitCode) ?? null

  const currentCoverUrl = useMemo(() => {
    if (coverChange.kind === 'remove') return null
    if (coverChange.kind === 'replace') return processedPreviewUrl
    return initial?.coverImageUrl ?? null
  }, [coverChange.kind, initial?.coverImageUrl, processedPreviewUrl])

  const primarySection = sections[0] ?? null
  const orderedIngredients = useMemo(() => (
    sections.flatMap((section) => ingredients.filter((ingredient) => ingredient.sectionId === section.id))
  ), [ingredients, sections])

  const ingredientSectionRows = useMemo(() => {
    if (!ingredientForm) return []
    return orderedIngredients.filter((ingredient) => ingredient.sectionId === ingredientForm.sectionId)
  }, [ingredientForm, orderedIngredients])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let focusTimer: number | undefined
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 20)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy && !focusEditorOpen) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [busy, focusEditorOpen, onClose])

  useEffect(() => {
    let active = true
    void Promise.all([
      loadOwnerProductCatalog(ownerId),
      loadMeasurementUnits(),
    ]).then(([loadedProducts, loadedUnits]) => {
      if (!active) return
      setProducts(loadedProducts)
      setUnits(loadedUnits)
      setCatalogLoading(false)
    }).catch((error) => {
      if (!active) return
      setCatalogLoading(false)
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się przygotować edycji składników.'))
    })

    return () => { active = false }
  }, [ownerId])

  useEffect(() => {
    if (!processedImage) {
      setProcessedPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(processedImage.blob)
    setProcessedPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [processedImage])

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

  function beginCreateSection(source: 'manager' | 'ingredient') {
    if (busy) return
    setSectionEditor({ kind: 'create', source, name: '' })
    setErrorMessage('')
  }

  function beginRenameSection(section: RecipeSectionDraft) {
    if (busy) return
    setSectionEditor({ kind: 'rename', sectionId: section.id, name: section.name })
    setErrorMessage('')
  }

  function applySectionEditor() {
    if (!sectionEditor) return

    try {
      const name = cleanRecipeSectionName(sectionEditor.name)
      const identity = recipeSectionIdentity(name)
      const duplicate = sections.some((section) => (
        recipeSectionIdentity(section.name) === identity
        && (sectionEditor.kind !== 'rename' || section.id !== sectionEditor.sectionId)
      ))

      if (duplicate) throw new Error(`Sekcja „${name}” już istnieje.`)

      if (sectionEditor.kind === 'create') {
        const section: RecipeSectionDraft = {
          id: crypto.randomUUID(),
          name,
          isPrimary: false,
        }
        setSections((current) => [...current, section])
        if (sectionEditor.source === 'ingredient') {
          setIngredientForm((current) => current ? { ...current, sectionId: section.id } : current)
        }
      } else {
        setSections((current) => current.map((section) => (
          section.id === sectionEditor.sectionId ? { ...section, name } : section
        )))
      }

      setSectionEditor(null)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Sprawdź nazwę sekcji.'))
    }
  }

  function removeSection(sectionId: string) {
    const section = sections.find((item) => item.id === sectionId)
    if (!section || busy) return

    if (section.isPrimary) {
      setErrorMessage('Sekcji głównej nie można usunąć.')
      return
    }

    const isUsed = ingredients.some((ingredient) => ingredient.sectionId === sectionId)
      || ingredientForm?.sectionId === sectionId
    if (isUsed) {
      setErrorMessage(`Najpierw przenieś składniki z sekcji „${section.name}” do innej sekcji.`)
      return
    }

    setSections((current) => current.filter((item) => item.id !== sectionId))
    setSectionEditor((current) => (
      current?.kind === 'rename' && current.sectionId === sectionId ? null : current
    ))
    setErrorMessage('')
  }

  function startAddIngredient() {
    if (catalogLoading || units.length === 0 || !primarySection) return
    setIngredientForm({
      id: crypto.randomUUID(),
      productId: null,
      productName: '',
      quantity: '1',
      unitCode: getDefaultUnitCode(units),
      sectionId: primarySection.id,
      note: '',
    })
    setSectionEditor(null)
    setErrorMessage('')
    window.setTimeout(() => ingredientProductRef.current?.focus(), 20)
  }

  function startEditIngredient(row: IngredientDraftRow) {
    setIngredientForm(formFromRow(row))
    setSectionEditor(null)
    setErrorMessage('')
    window.setTimeout(() => ingredientProductRef.current?.focus(), 20)
  }

  function chooseProduct(product: CanonicalProductIdentity) {
    setIngredientForm((current) => current ? {
      ...current,
      productId: product.id,
      productName: product.name,
      unitCode: getDefaultUnitCode(units, product.defaultUnitCode),
    } : current)
  }

  function applyIngredientDraft() {
    if (!ingredientForm) return

    try {
      const productName = cleanCanonicalProductName(ingredientForm.productName)
      const quantity = parseQuantityInput(ingredientForm.quantity)
      if (!quantity) throw new Error('Podaj prawidłową ilość większą od 0.')

      const unit = units.find((item) => item.code === ingredientForm.unitCode)
      if (!unit) throw new Error('Wybierz jednostkę.')

      if (!sections.some((section) => section.id === ingredientForm.sectionId)) {
        throw new Error('Wybierz sekcję składnika.')
      }

      const exactProductId = autocomplete.exactProduct?.id ?? ingredientForm.productId
      const nextRow: IngredientDraftRow = {
        id: ingredientForm.id,
        productId: exactProductId,
        productName,
        quantity,
        unitCode: unit.code,
        unitSymbol: unit.symbol,
        sectionId: ingredientForm.sectionId,
        note: ingredientForm.note.trim().replace(/\s+/g, ' '),
      }

      setIngredients((current) => {
        const index = current.findIndex((item) => item.id === nextRow.id)
        if (index < 0) return [...current, nextRow]
        if (current[index].sectionId !== nextRow.sectionId) {
          return [...current.filter((item) => item.id !== nextRow.id), nextRow]
        }
        const copy = [...current]
        copy[index] = nextRow
        return copy
      })
      setIngredientForm(null)
      setSectionEditor(null)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Sprawdź składnik.'))
    }
  }

  function moveIngredient(id: string, direction: -1 | 1) {
    setIngredients((current) => {
      const row = current.find((item) => item.id === id)
      if (!row) return current

      const sectionRows = current.filter((item) => item.sectionId === row.sectionId)
      const sectionIndex = sectionRows.findIndex((item) => item.id === id)
      const targetSectionIndex = sectionIndex + direction
      if (sectionIndex < 0 || targetSectionIndex < 0 || targetSectionIndex >= sectionRows.length) return current

      const targetId = sectionRows[targetSectionIndex].id
      const currentIndex = current.findIndex((item) => item.id === id)
      const targetIndex = current.findIndex((item) => item.id === targetId)
      if (currentIndex < 0 || targetIndex < 0) return current

      const copy = [...current]
      ;[copy[currentIndex], copy[targetIndex]] = [copy[targetIndex], copy[currentIndex]]
      return copy
    })
  }

  function removeIngredient(id: string) {
    setIngredients((current) => current.filter((item) => item.id !== id))
    setIngredientForm(null)
    setSectionEditor(null)
    setErrorMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    if (ingredientForm) {
      setErrorMessage('Zapisz albo anuluj edycję składnika przed zapisaniem przepisu.')
      return
    }

    if (sectionEditor) {
      setErrorMessage('Zapisz albo anuluj edycję sekcji przed zapisaniem przepisu.')
      return
    }

    let parsedServings: number
    try {
      cleanRecipeName(name)
      parsedServings = validateRecipeServings(Number(servings))
      parseOptionalRecipeDuration(prepTimeMinutes, 'Czas przygotowania')
      parseOptionalRecipeDuration(cookTimeMinutes, 'Czas gotowania / pieczenia')
      validateRecipeSections(sections)
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Sprawdź dane przepisu.'))
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      const sectionPayload: RecipeSectionDraftInput[] = sections.map((section) => ({
        id: section.id,
        name: section.name,
        isPrimary: section.isPrimary,
      }))

      const ingredientPayload: RecipeIngredientDraftInput[] = orderedIngredients.map((ingredient) => ({
        id: ingredient.id,
        productId: ingredient.productId,
        productName: ingredient.productName,
        quantity: ingredient.quantity,
        unitCode: ingredient.unitCode,
        sectionId: ingredient.sectionId,
        note: ingredient.note,
      }))

      const recipeId = await saveRecipeSnapshot({
        ownerId,
        mode: mode.kind === 'create' ? 'create' : 'update',
        recipeId: mode.kind === 'edit' ? mode.recipe.id : null,
        name,
        servings: parsedServings,
        prepTimeMinutes,
        cookTimeMinutes,
        instructions,
        coverFocusX,
        coverFocusY,
        cover: mode.kind === 'create' && coverChange.kind === 'keep'
          ? { kind: 'remove' }
          : coverChange,
        sections: sectionPayload,
        ingredients: ingredientPayload,
      })

      onSaved(recipeId)
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
      await deleteRecipe({ ownerId, recipeId: mode.recipe.id })
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
          <section className="recipe-authoring-section">
            <label className="form-field" htmlFor="recipe-name">
              <span>Nazwa przepisu</span>
              <input
                ref={firstInputRef}
                id="recipe-name"
                value={name}
                maxLength={160}
                placeholder="np. Szarlotka"
                disabled={busy}
                onChange={(event) => { setName(event.target.value); setErrorMessage('') }}
              />
            </label>

            <label className="form-field recipe-servings-field" htmlFor="recipe-servings">
              <span>Liczba porcji</span>
              <input
                id="recipe-servings"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                step={1}
                value={servings}
                disabled={busy}
                onChange={(event) => { setServings(event.target.value); setErrorMessage('') }}
              />
            </label>

            <div className="recipe-time-fields">
              <label className="form-field" htmlFor="recipe-prep-time">
                <span>Czas przygotowania <small>opcjonalnie</small></span>
                <div className="recipe-duration-input">
                  <input
                    id="recipe-prep-time"
                    type="number"
                    inputMode="numeric"
                    min={RECIPE_DURATION_MIN}
                    max={RECIPE_DURATION_MAX}
                    step={1}
                    value={prepTimeMinutes}
                    placeholder="np. 30"
                    disabled={busy}
                    onChange={(event) => { setPrepTimeMinutes(event.target.value); setErrorMessage('') }}
                  />
                  <span>min</span>
                </div>
              </label>

              <label className="form-field" htmlFor="recipe-cook-time">
                <span>Czas gotowania / pieczenia <small>opcjonalnie</small></span>
                <div className="recipe-duration-input">
                  <input
                    id="recipe-cook-time"
                    type="number"
                    inputMode="numeric"
                    min={RECIPE_DURATION_MIN}
                    max={RECIPE_DURATION_MAX}
                    step={1}
                    value={cookTimeMinutes}
                    placeholder="np. 45"
                    disabled={busy}
                    onChange={(event) => { setCookTimeMinutes(event.target.value); setErrorMessage('') }}
                  />
                  <span>min</span>
                </div>
              </label>
            </div>
          </section>

          <section className="recipe-authoring-section recipe-cover-editor" aria-label="Zdjęcie przepisu">
            <div className="recipe-authoring-heading">
              <strong>Zdjęcie</strong>
            </div>

            <div className={`recipe-cover-preview${currentCoverUrl ? ' has-image' : ''}`} style={{ aspectRatio: RECIPE_COVER_HERO_ASPECT }}>
              {currentCoverUrl ? (
                <RecipeCoverImage
                  src={currentCoverUrl}
                  alt=""
                  focusX={coverFocusX}
                  focusY={coverFocusY}
                />
              ) : (
                <span className="recipe-cover-placeholder" aria-hidden="true"><KitchenIcon name="image" size={30} /></span>
              )}
              {imageBusy && <span className="recipe-cover-processing">Optymalizuję…</span>}
            </div>

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
                <button className="recipe-media-button recipe-media-focus" type="button" onClick={() => setFocusEditorOpen(true)} disabled={busy}>
                  <KitchenIcon name="edit" size={17} />
                  <span>Ustaw kadr</span>
                </button>
              )}
              {currentCoverUrl && (
                <button className="recipe-media-button recipe-media-remove" type="button" onClick={removeCover} disabled={busy}>
                  <KitchenIcon name="trash" size={17} />
                  <span>Usuń zdjęcie</span>
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
          </section>

          <section className="recipe-authoring-section" aria-labelledby="recipe-authoring-ingredients-title">
            <div className="recipe-authoring-heading recipe-authoring-heading-action">
              <strong id="recipe-authoring-ingredients-title">Składniki</strong>
              <button className="recipe-inline-add" type="button" onClick={startAddIngredient} disabled={busy || catalogLoading || units.length === 0}>
                <KitchenIcon name="plus" size={17} />
                <span>Dodaj składnik</span>
              </button>
            </div>

            <div className="recipe-section-manager" aria-label="Sekcje składników">
              <div className="recipe-section-manager-heading">
                <div>
                  <strong>Sekcje składników</strong>
                  <small>Pierwsza sekcja jest zawsze główna.</small>
                </div>
                <button className="recipe-inline-add" type="button" onClick={() => beginCreateSection('manager')} disabled={busy}>
                  <KitchenIcon name="plus" size={16} />
                  <span>Dodaj sekcję</span>
                </button>
              </div>

              <div className="recipe-section-manager-list">
                {sections.map((section) => {
                  const sectionIngredientCount = ingredients.filter((ingredient) => ingredient.sectionId === section.id).length
                  return (
                    <div className="recipe-section-manager-row" key={section.id}>
                      <span className="recipe-section-manager-copy">
                        <strong>{section.name}</strong>
                        <small>
                          {section.isPrimary ? 'Główna' : 'Dodatkowa'}
                          {sectionIngredientCount > 0 ? ` · ${sectionIngredientCount}` : ''}
                        </small>
                      </span>
                      <span className="recipe-section-manager-actions">
                        <button
                          className="icon-button compact-icon-button"
                          type="button"
                          onClick={() => beginRenameSection(section)}
                          disabled={busy}
                          aria-label={`Zmień nazwę sekcji ${section.name}`}
                          title="Zmień nazwę"
                        >
                          <KitchenIcon name="edit" size={16} />
                        </button>
                        {!section.isPrimary && (
                          <button
                            className="icon-button compact-icon-button recipe-section-delete"
                            type="button"
                            onClick={() => removeSection(section.id)}
                            disabled={busy}
                            aria-label={`Usuń sekcję ${section.name}`}
                            title="Usuń sekcję"
                          >
                            <KitchenIcon name="trash" size={16} />
                          </button>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>

              {sectionEditor && (sectionEditor.kind === 'rename' || sectionEditor.source === 'manager') && (
                <div className="recipe-section-inline-editor">
                  <label className="form-field" htmlFor="recipe-section-name-editor">
                    <span>{sectionEditor.kind === 'rename' ? 'Nowa nazwa sekcji' : 'Nazwa nowej sekcji'}</span>
                    <input
                      id="recipe-section-name-editor"
                      value={sectionEditor.name}
                      maxLength={80}
                      placeholder="np. Sos"
                      disabled={busy}
                      onChange={(event) => {
                        setSectionEditor((current) => current ? { ...current, name: event.target.value } : current)
                        setErrorMessage('')
                      }}
                    />
                  </label>
                  <div className="recipe-section-inline-actions">
                    <button className="secondary-button compact-button" type="button" onClick={() => setSectionEditor(null)} disabled={busy}>Anuluj</button>
                    <button className="primary-button compact-button" type="button" onClick={applySectionEditor} disabled={busy}>
                      {sectionEditor.kind === 'rename' ? 'Zmień nazwę' : 'Dodaj sekcję'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {orderedIngredients.length > 0 && (
              <div className="recipe-authoring-ingredients">
                {sections.map((section) => {
                  const sectionIngredients = orderedIngredients.filter((ingredient) => ingredient.sectionId === section.id)
                  if (sectionIngredients.length === 0) return null

                  return (
                    <div className="recipe-authoring-section-group" key={section.id}>
                      {sections.length > 1 && <h3 className="recipe-ingredient-section-title">{section.name}</h3>}
                      {sectionIngredients.map((ingredient) => (
                        <button className="recipe-authoring-ingredient-row" key={ingredient.id} type="button" onClick={() => startEditIngredient(ingredient)} disabled={busy}>
                          <span className="recipe-authoring-ingredient-copy">
                            <strong>{ingredient.productName}</strong>
                            {ingredient.note && <small>{ingredient.note}</small>}
                          </span>
                          <span className="recipe-authoring-ingredient-quantity">{formatQuantity(ingredient.quantity)} {ingredient.unitSymbol}</span>
                          <KitchenIcon name="chevronRight" size={17} />
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {orderedIngredients.length === 0 && !ingredientForm && (
              <button className="recipe-empty-add" type="button" onClick={startAddIngredient} disabled={catalogLoading || units.length === 0}>
                <KitchenIcon name="plus" size={18} />
                <span>Dodaj składnik</span>
              </button>
            )}

            {ingredientForm && (
              <div className="recipe-ingredient-draft-card">
                <div className="recipe-ingredient-draft-heading">
                  <strong>{ingredients.some((item) => item.id === ingredientForm.id) ? 'Edytuj składnik' : 'Nowy składnik'}</strong>
                  <button
                    className="icon-button compact-icon-button"
                    type="button"
                    onClick={() => {
                      setIngredientForm(null)
                      if (sectionEditor?.kind === 'create' && sectionEditor.source === 'ingredient') setSectionEditor(null)
                    }}
                    disabled={busy}
                    aria-label="Anuluj składnik"
                  >
                    <KitchenIcon name="close" size={17} />
                  </button>
                </div>

                <ProductAutocompleteField
                  inputId="recipe-ingredient-product"
                  label="Produkt"
                  value={ingredientForm.productName}
                  exactProduct={autocomplete.exactProduct}
                  suggestions={autocomplete.suggestions}
                  disabled={busy}
                  placeholder="np. Mleko"
                  inputRef={ingredientProductRef}
                  onChange={(value) => {
                    setIngredientForm((current) => current ? { ...current, productName: value, productId: null } : current)
                    setErrorMessage('')
                  }}
                  onChoose={chooseProduct}
                />

                <div className="recipe-ingredient-quantity-unit">
                  <div className="form-field">
                    <label htmlFor="recipe-ingredient-quantity">Ilość</label>
                    <QuantityStepperInput
                      inputId="recipe-ingredient-quantity"
                      value={ingredientForm.quantity}
                      onChange={(value) => setIngredientForm((current) => current ? { ...current, quantity: value } : current)}
                      disabled={busy}
                      suffix={ingredientUnit?.symbol}
                      ariaLabel="Ilość składnika"
                    />
                  </div>

                  <label className="form-field" htmlFor="recipe-ingredient-unit">
                    <span>Jednostka</span>
                    <select
                      id="recipe-ingredient-unit"
                      value={ingredientForm.unitCode}
                      disabled={busy}
                      onChange={(event) => setIngredientForm((current) => current ? { ...current, unitCode: event.target.value } : current)}
                    >
                      {units.map((unit) => <option key={unit.code} value={unit.code}>{unit.labelPl} ({unit.symbol})</option>)}
                    </select>
                  </label>
                </div>

                <div className="form-field recipe-ingredient-section-field">
                  <span>Sekcja</span>
                  <div className="recipe-section-choice-list" role="group" aria-label="Wybierz sekcję składnika">
                    {sections.map((section) => (
                      <button
                        className={`recipe-section-choice${ingredientForm.sectionId === section.id ? ' is-active' : ''}`}
                        key={section.id}
                        type="button"
                        aria-pressed={ingredientForm.sectionId === section.id}
                        disabled={busy}
                        onClick={() => {
                          setIngredientForm((current) => current ? { ...current, sectionId: section.id } : current)
                          setSectionEditor((current) => (
                            current?.kind === 'create' && current.source === 'ingredient' ? null : current
                          ))
                          setErrorMessage('')
                        }}
                      >
                        {section.name}
                      </button>
                    ))}
                    <button
                      className="recipe-section-choice recipe-section-choice-add"
                      type="button"
                      disabled={busy}
                      onClick={() => beginCreateSection('ingredient')}
                    >
                      <KitchenIcon name="plus" size={15} />
                      <span>Nowa</span>
                    </button>
                  </div>
                </div>

                {sectionEditor?.kind === 'create' && sectionEditor.source === 'ingredient' && (
                  <div className="recipe-section-inline-editor recipe-section-inline-editor-ingredient">
                    <label className="form-field" htmlFor="recipe-ingredient-new-section">
                      <span>Nazwa nowej sekcji</span>
                      <input
                        id="recipe-ingredient-new-section"
                        value={sectionEditor.name}
                        maxLength={80}
                        placeholder="np. Sos"
                        disabled={busy}
                        onChange={(event) => {
                          setSectionEditor((current) => current ? { ...current, name: event.target.value } : current)
                          setErrorMessage('')
                        }}
                      />
                    </label>
                    <div className="recipe-section-inline-actions">
                      <button className="secondary-button compact-button" type="button" onClick={() => setSectionEditor(null)} disabled={busy}>Anuluj</button>
                      <button className="primary-button compact-button" type="button" onClick={applySectionEditor} disabled={busy}>Dodaj i wybierz</button>
                    </div>
                  </div>
                )}

                <label className="form-field" htmlFor="recipe-ingredient-note">
                  <span>Notatka <small>opcjonalnie</small></span>
                  <input
                    id="recipe-ingredient-note"
                    value={ingredientForm.note}
                    maxLength={240}
                    placeholder="np. do posmarowania formy"
                    disabled={busy}
                    onChange={(event) => setIngredientForm((current) => current ? { ...current, note: event.target.value } : current)}
                  />
                </label>

                {ingredients.some((item) => item.id === ingredientForm.id)
                  && ingredients.find((item) => item.id === ingredientForm.id)?.sectionId === ingredientForm.sectionId && (
                  <div className="recipe-ingredient-draft-order">
                    <button type="button" className="secondary-button" disabled={busy || ingredientSectionRows[0]?.id === ingredientForm.id} onClick={() => moveIngredient(ingredientForm.id, -1)}>
                      <KitchenIcon name="chevronUp" size={16} />
                      <span>Wyżej</span>
                    </button>
                    <button type="button" className="secondary-button" disabled={busy || ingredientSectionRows[ingredientSectionRows.length - 1]?.id === ingredientForm.id} onClick={() => moveIngredient(ingredientForm.id, 1)}>
                      <KitchenIcon name="chevronDown" size={16} />
                      <span>Niżej</span>
                    </button>
                  </div>
                )}

                <div className="recipe-ingredient-draft-actions">
                  {ingredients.some((item) => item.id === ingredientForm.id) ? (
                    <button className="recipe-ingredient-delete" type="button" onClick={() => removeIngredient(ingredientForm.id)} disabled={busy}>
                      <KitchenIcon name="trash" size={16} />
                      <span>Usuń</span>
                    </button>
                  ) : <span />}
                  <button className="primary-button" type="button" onClick={applyIngredientDraft} disabled={busy || sectionEditor !== null}>
                    {ingredients.some((item) => item.id === ingredientForm.id) ? 'Zastosuj' : 'Dodaj'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="recipe-authoring-section">
            <label className="form-field" htmlFor="recipe-instructions">
              <span>Przygotowanie</span>
              <textarea
                id="recipe-instructions"
                value={instructions}
                placeholder="Opisz sposób przygotowania…"
                disabled={busy}
                onChange={(event) => { setInstructions(event.target.value); setErrorMessage('') }}
              />
            </label>
          </section>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="sheet-actions recipe-authoring-save-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Anuluj</button>
            <button className="primary-button" type="submit" disabled={busy || catalogLoading}>
              {imageBusy ? 'Przygotowuję zdjęcie…' : saving ? 'Zapisuję…' : 'Zapisz'}
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
                <p>Usunąć „{mode.recipe.name}”?</p>
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
