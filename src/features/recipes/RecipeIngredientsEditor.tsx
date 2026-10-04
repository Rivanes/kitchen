import { useEffect, useMemo, useRef, useState } from 'react'
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
  loadOwnerProductCatalog,
  type CanonicalProductIdentity,
} from '../products/productCatalogMutations'
import {
  formatQuantity,
  formatQuantityInput,
  parseQuantityInput,
} from '../quantity/quantity'
import { QuantityStepperInput } from '../quantity/QuantityStepperInput'
import {
  deleteRecipeIngredient,
  reorderRecipeIngredients,
  saveRecipeIngredient,
} from './recipeIngredientMutations'
import type { RecipeIngredientRead, RecipeReadItem } from './types'

type RecipeIngredientsEditorProps = {
  ownerId: string
  recipe: RecipeReadItem
  onClose: () => void
  onChanged: () => Promise<void> | void
}

type IngredientDraft = {
  ingredientId: string | null
  productName: string
  selectedProductId: string | null
  quantity: string
  unitCode: string
  sectionLabel: string
  note: string
  sortOrder: number
}

function createBlankDraft(units: readonly MeasurementUnit[], sortOrder: number): IngredientDraft {
  return {
    ingredientId: null,
    productName: '',
    selectedProductId: null,
    quantity: '1',
    unitCode: getDefaultUnitCode(units),
    sectionLabel: '',
    note: '',
    sortOrder,
  }
}

function draftFromIngredient(ingredient: RecipeIngredientRead): IngredientDraft {
  return {
    ingredientId: ingredient.id,
    productName: ingredient.productName,
    selectedProductId: ingredient.productId,
    quantity: formatQuantityInput(ingredient.quantity),
    unitCode: ingredient.unitCode,
    sectionLabel: ingredient.sectionLabel ?? '',
    note: ingredient.note ?? '',
    sortOrder: ingredient.sortOrder,
  }
}

export function RecipeIngredientsEditor({
  ownerId,
  recipe,
  onClose,
  onChanged,
}: RecipeIngredientsEditorProps) {
  const [ingredients, setIngredients] = useState(recipe.ingredients)
  const [products, setProducts] = useState<CanonicalProductIdentity[]>([])
  const [units, setUnits] = useState<MeasurementUnit[]>([])
  const [draft, setDraft] = useState<IngredientDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const productInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    void Promise.all([
      loadOwnerProductCatalog(ownerId),
      loadMeasurementUnits(),
    ]).then(([loadedProducts, loadedUnits]) => {
      setProducts(loadedProducts)
      setUnits(loadedUnits)
      setLoading(false)
    }).catch((error) => {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się przygotować edycji składników.'))
      setLoading(false)
    })

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [ownerId])

  const autocomplete = useProductAutocomplete(products, draft?.productName ?? '')
  const currentUnit = units.find((unit) => unit.code === draft?.unitCode) ?? null

  const sectionSuggestions = useMemo(
    () => Array.from(new Set(
      ingredients
        .map((ingredient) => ingredient.sectionLabel)
        .filter((value): value is string => Boolean(value)),
    )),
    [ingredients],
  )

  function startAdd() {
    setDraft(createBlankDraft(units, ingredients.length))
    setErrorMessage('')
    window.setTimeout(() => productInputRef.current?.focus(), 20)
  }

  function startEdit(ingredient: RecipeIngredientRead) {
    setDraft(draftFromIngredient(ingredient))
    setErrorMessage('')
    window.setTimeout(() => productInputRef.current?.focus(), 20)
  }

  function chooseProduct(product: CanonicalProductIdentity) {
    setDraft((current) => current ? {
      ...current,
      productName: product.name,
      selectedProductId: product.id,
      unitCode: getDefaultUnitCode(units, product.defaultUnitCode),
    } : current)
  }

  async function saveDraft() {
    if (!draft || saving) return
    const quantity = parseQuantityInput(draft.quantity)
    if (!quantity) {
      setErrorMessage('Podaj prawidłową ilość większą od 0.')
      return
    }

    setSaving(true)
    setErrorMessage('')
    try {
      const result = await saveRecipeIngredient({
        ownerId,
        recipeId: recipe.id,
        ingredientId: draft.ingredientId,
        productName: draft.productName,
        selectedProductId: draft.selectedProductId,
        quantity,
        unitCode: draft.unitCode,
        sectionLabel: draft.sectionLabel,
        note: draft.note,
        sortOrder: draft.sortOrder,
      })

      const product = result.product
      setProducts((current) => {
        if (current.some((item) => item.id === product.id)) return current
        return [...current, product].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
      })

      const unit = units.find((item) => item.code === draft.unitCode)
      if (!unit) throw new Error('Nie udało się rozpoznać wybranej jednostki.')

      const nextIngredient: RecipeIngredientRead = {
        id: result.id,
        productId: product.id,
        productName: product.name,
        quantity,
        unitCode: draft.unitCode,
        unitSymbol: unit.symbol,
        sortOrder: draft.sortOrder,
        sectionLabel: draft.sectionLabel.trim() || null,
        note: draft.note.trim() || null,
      }

      setIngredients((current) => {
        const existingIndex = current.findIndex((item) => item.id === result.id)
        if (existingIndex >= 0) {
          const copy = [...current]
          copy[existingIndex] = nextIngredient
          return copy
        }
        return [...current, nextIngredient]
      })
      setDraft(null)
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się zapisać składnika.'))
    } finally {
      setSaving(false)
    }
  }

  async function removeIngredient(ingredient: RecipeIngredientRead) {
    if (saving) return
    setSaving(true)
    setErrorMessage('')
    try {
      await deleteRecipeIngredient({
        ownerId,
        recipeId: recipe.id,
        ingredientId: ingredient.id,
      })
      setIngredients((current) => current.filter((item) => item.id !== ingredient.id))
      if (draft?.ingredientId === ingredient.id) setDraft(null)
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się usunąć składnika.'))
    } finally {
      setSaving(false)
    }
  }

  async function moveIngredient(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (saving || nextIndex < 0 || nextIndex >= ingredients.length) return

    const next = [...ingredients]
    const [moved] = next.splice(index, 1)
    next.splice(nextIndex, 0, moved)

    setSaving(true)
    setErrorMessage('')
    try {
      await reorderRecipeIngredients({
        ownerId,
        recipeId: recipe.id,
        ingredientIds: next.map((ingredient) => ingredient.id),
      })
      setIngredients(next.map((ingredient, order) => ({ ...ingredient, sortOrder: order })))
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się zmienić kolejności składników.'))
    } finally {
      setSaving(false)
    }
  }

  async function closeAndRefresh() {
    if (saving) return
    await onChanged()
    onClose()
  }

  return (
    <div className="sheet-backdrop recipe-ingredients-backdrop" role="presentation">
      <section className="inventory-sheet recipe-ingredients-sheet" role="dialog" aria-modal="true" aria-labelledby="recipe-ingredients-editor-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Przepis</p>
            <h2 id="recipe-ingredients-editor-title">Składniki</h2>
            <p className="sheet-subtitle">{recipe.name}</p>
          </div>
          <button className="icon-button" type="button" onClick={() => void closeAndRefresh()} disabled={saving} aria-label="Zamknij edycję składników">
            <KitchenIcon name="close" />
          </button>
        </header>

        {loading && (
          <div className="recipe-ingredients-loading">
            <span className="loading-dot" aria-hidden="true" />
            <span>Przygotowuję składniki…</span>
          </div>
        )}

        {!loading && (
          <>
            <div className="recipe-ingredients-toolbar">
              <span>{ingredients.length === 1 ? '1 składnik' : `${ingredients.length} składników`}</span>
              <button className="primary-icon-button" type="button" onClick={startAdd} disabled={saving} aria-label="Dodaj składnik" title="Dodaj składnik">
                <KitchenIcon name="plus" />
              </button>
            </div>

            {ingredients.length === 0 && !draft && (
              <button className="recipe-ingredients-empty" type="button" onClick={startAdd}>
                <span className="recipes-empty-icon" aria-hidden="true"><KitchenIcon name="inventory" size={21} /></span>
                <span>
                  <strong>Dodaj pierwszy składnik</strong>
                  <small>Wyszukaj istniejący produkt albo utwórz nowy canonical Product.</small>
                </span>
              </button>
            )}

            {ingredients.length > 0 && (
              <ul className="recipe-ingredients-editor-list">
                {ingredients.map((ingredient, index) => (
                  <li key={ingredient.id}>
                    <div className="recipe-ingredients-editor-copy">
                      {ingredient.sectionLabel && <span className="recipe-ingredient-section-chip">{ingredient.sectionLabel}</span>}
                      <strong>{ingredient.productName}</strong>
                      <small>{formatQuantity(ingredient.quantity)} {ingredient.unitSymbol}{ingredient.note ? ` · ${ingredient.note}` : ''}</small>
                    </div>
                    <div className="recipe-ingredient-row-actions">
                      <button type="button" onClick={() => void moveIngredient(index, -1)} disabled={saving || index === 0} aria-label={`Przesuń ${ingredient.productName} wyżej`} title="Wyżej">
                        <KitchenIcon name="chevronUp" size={17} />
                      </button>
                      <button type="button" onClick={() => void moveIngredient(index, 1)} disabled={saving || index === ingredients.length - 1} aria-label={`Przesuń ${ingredient.productName} niżej`} title="Niżej">
                        <KitchenIcon name="chevronDown" size={17} />
                      </button>
                      <button type="button" onClick={() => startEdit(ingredient)} disabled={saving} aria-label={`Edytuj ${ingredient.productName}`} title="Edytuj">
                        <KitchenIcon name="edit" size={17} />
                      </button>
                      <button className="is-danger" type="button" onClick={() => void removeIngredient(ingredient)} disabled={saving} aria-label={`Usuń ${ingredient.productName}`} title="Usuń">
                        <KitchenIcon name="trash" size={17} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {draft && (
              <section className="recipe-ingredient-form-card" aria-label={draft.ingredientId ? 'Edytuj składnik' : 'Nowy składnik'}>
                <div className="recipe-ingredient-form-heading">
                  <strong>{draft.ingredientId ? 'Edytuj składnik' : 'Nowy składnik'}</strong>
                  <button className="icon-button compact-icon-button" type="button" onClick={() => setDraft(null)} disabled={saving} aria-label="Anuluj edycję składnika">
                    <KitchenIcon name="close" size={17} />
                  </button>
                </div>

                <ProductAutocompleteField
                  inputId="recipe-ingredient-product"
                  label="Produkt"
                  value={draft.productName}
                  exactProduct={autocomplete.exactProduct}
                  suggestions={autocomplete.suggestions}
                  disabled={saving}
                  placeholder="np. Mleko"
                  inputRef={productInputRef}
                  exactHint="Użyjemy istniejącego produktu."
                  unmatchedHint="Jeśli zapiszesz, utworzymy nowy produkt w wspólnym katalogu Kitchen."
                  onChange={(value) => {
                    setDraft((current) => current ? {
                      ...current,
                      productName: value,
                      selectedProductId: null,
                    } : current)
                    setErrorMessage('')
                  }}
                  onChoose={chooseProduct}
                />

                <div className="recipe-ingredient-quantity-unit">
                  <div className="form-field">
                    <label htmlFor="recipe-ingredient-quantity">Ilość</label>
                    <QuantityStepperInput
                      inputId="recipe-ingredient-quantity"
                      value={draft.quantity}
                      onChange={(value) => setDraft((current) => current ? { ...current, quantity: value } : current)}
                      disabled={saving}
                      suffix={currentUnit?.symbol}
                      ariaLabel="Ilość składnika"
                    />
                  </div>

                  <label className="form-field" htmlFor="recipe-ingredient-unit">
                    <span>Jednostka</span>
                    <select
                      id="recipe-ingredient-unit"
                      value={draft.unitCode}
                      disabled={saving}
                      onChange={(event) => setDraft((current) => current ? { ...current, unitCode: event.target.value } : current)}
                    >
                      {units.map((unit) => (
                        <option key={unit.code} value={unit.code}>{unit.labelPl} ({unit.symbol})</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="form-field" htmlFor="recipe-ingredient-section">
                  <span>Sekcja <small>opcjonalnie</small></span>
                  <input
                    id="recipe-ingredient-section"
                    value={draft.sectionLabel}
                    maxLength={80}
                    list="recipe-section-suggestions"
                    placeholder="np. Na biszkopt"
                    disabled={saving}
                    onChange={(event) => setDraft((current) => current ? { ...current, sectionLabel: event.target.value } : current)}
                  />
                  <datalist id="recipe-section-suggestions">
                    {sectionSuggestions.map((section) => <option key={section} value={section} />)}
                  </datalist>
                </label>

                <label className="form-field" htmlFor="recipe-ingredient-note">
                  <span>Notatka <small>opcjonalnie</small></span>
                  <input
                    id="recipe-ingredient-note"
                    value={draft.note}
                    maxLength={240}
                    placeholder="np. do posmarowania formy"
                    disabled={saving}
                    onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)}
                  />
                </label>

                <div className="recipe-ingredient-form-actions">
                  <button className="secondary-button" type="button" onClick={() => setDraft(null)} disabled={saving}>Anuluj</button>
                  <button className="primary-button" type="button" onClick={() => void saveDraft()} disabled={saving}>
                    {saving ? 'Zapisuję…' : draft.ingredientId ? 'Zapisz składnik' : 'Dodaj składnik'}
                  </button>
                </div>
              </section>
            )}

            {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          </>
        )}
      </section>
    </div>
  )
}
