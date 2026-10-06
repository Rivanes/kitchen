import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import type { MeasurementUnit } from '../measurements/measurementUnits'
import { getDefaultUnitCode } from '../measurements/measurementUnits'
import {
  getPackageContentFromDefaults,
  getPackageContentUnits,
  isContainerMeasurementUnit,
  isDirectMeasurementUnit,
  resolveRecipePackageContent,
} from '../measurements/packageSemantics'
import {
  ProductAutocompleteField,
  useProductAutocomplete,
} from '../products/ProductAutocomplete'
import {
  cleanCanonicalProductName,
  type CanonicalProductIdentity,
} from '../products/productCatalogMutations'
import { normalizeProductName } from '../products/productIdentity'
import { formatQuantityInput, parseQuantityInput } from '../quantity/quantity'
import { QuantityStepperInput } from '../quantity/QuantityStepperInput'
import {
  cleanRecipeSectionName,
  recipeSectionIdentity,
} from './recipeSections'

export type RecipeIngredientEditorSection = {
  id: string
  name: string
  isPrimary: boolean
}

export type RecipeIngredientEditorRow = {
  id: string
  productId: string | null
  productName: string
  quantity: number
  unitCode: string
  unitSymbol: string
  packageContentValue: number | null
  packageContentUnitCode: string | null
  sectionId: string
  note: string
}

export type RecipeIngredientEditorCommit = {
  ingredient: RecipeIngredientEditorRow
  newSection: RecipeIngredientEditorSection | null
  desiredSectionIndex: number | null
}

type RecipeIngredientEditorSheetProps = {
  products: readonly CanonicalProductIdentity[]
  units: readonly MeasurementUnit[]
  sections: readonly RecipeIngredientEditorSection[]
  ingredients: readonly RecipeIngredientEditorRow[]
  ingredient: RecipeIngredientEditorRow | null
  onCancel: () => void
  onApply: (commit: RecipeIngredientEditorCommit) => void
  onRemove: (ingredientId: string) => void
}

type Draft = {
  id: string
  productId: string | null
  productName: string
  quantity: string
  unitCode: string
  packageContentValue: string
  packageContentUnitCode: string
  sectionId: string
  note: string
}

function createDraft(
  ingredient: RecipeIngredientEditorRow | null,
  sections: readonly RecipeIngredientEditorSection[],
  units: readonly MeasurementUnit[],
): Draft {
  if (ingredient) {
    return {
      id: ingredient.id,
      productId: ingredient.productId,
      productName: ingredient.productName,
      quantity: formatQuantityInput(ingredient.quantity),
      unitCode: ingredient.unitCode,
      packageContentValue: ingredient.packageContentValue === null ? '' : formatQuantityInput(ingredient.packageContentValue),
      packageContentUnitCode: ingredient.packageContentUnitCode ?? getPackageContentUnits(units)[0]?.code ?? '',
      sectionId: ingredient.sectionId,
      note: ingredient.note,
    }
  }

  return {
    id: crypto.randomUUID(),
    productId: null,
    productName: '',
    quantity: '1',
    unitCode: getDefaultUnitCode(units),
    packageContentValue: '',
    packageContentUnitCode: getPackageContentUnits(units)[0]?.code ?? '',
    sectionId: sections[0]?.id ?? '',
    note: '',
  }
}

function getProductDefaultPackageDraft(
  product: CanonicalProductIdentity,
  units: readonly MeasurementUnit[],
  rowUnitCode: string,
) {
  if (product.defaultUnitCode !== rowUnitCode) return null
  const content = getPackageContentFromDefaults(product)
  if (!content) return null
  const contentUnit = units.find((unit) => unit.code === content.unitCode)
  if (!isDirectMeasurementUnit(contentUnit)) return null
  return {
    value: formatQuantityInput(content.value),
    unitCode: content.unitCode,
  }
}

export function RecipeIngredientEditorSheet({
  products,
  units,
  sections,
  ingredients,
  ingredient,
  onCancel,
  onApply,
  onRemove,
}: RecipeIngredientEditorSheetProps) {
  const [draft, setDraft] = useState(() => createDraft(ingredient, sections, units))
  const [pendingSectionOpen, setPendingSectionOpen] = useState(false)
  const [pendingSectionName, setPendingSectionName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const productInputRef = useRef<HTMLInputElement>(null)

  const autocomplete = useProductAutocomplete(products, draft.productName)
  const packageContentUnits = useMemo(() => getPackageContentUnits(units), [units])
  const ingredientUnit = units.find((unit) => unit.code === draft.unitCode) ?? null
  const packageContentUnit = units.find((unit) => unit.code === draft.packageContentUnitCode) ?? null
  const isContainerIngredientUnit = isContainerMeasurementUnit(ingredientUnit)
  const selectedProduct = products.find((product) => product.id === draft.productId) ?? autocomplete.exactProduct ?? null
  const originalSectionId = ingredient?.sectionId ?? null
  const originalSectionRows = useMemo(() => (
    ingredient
      ? ingredients.filter((row) => row.sectionId === ingredient.sectionId)
      : []
  ), [ingredient, ingredients])
  const initialOrderIndex = ingredient
    ? Math.max(0, originalSectionRows.findIndex((row) => row.id === ingredient.id))
    : 0
  const [desiredSectionIndex, setDesiredSectionIndex] = useState(initialOrderIndex)

  const canReorder = Boolean(
    ingredient
    && !pendingSectionOpen
    && draft.sectionId === originalSectionId
    && originalSectionRows.length > 1,
  )

  useEffect(() => {
    let focusTimer: number | undefined
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      focusTimer = window.setTimeout(() => productInputRef.current?.focus(), 20)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel])

  function chooseProduct(product: CanonicalProductIdentity) {
    setDraft((current) => {
      if (current.productId === product.id) {
        return { ...current, productName: product.name }
      }

      const reselectsOriginalProduct = ingredient?.productId === product.id
      if (reselectsOriginalProduct && ingredient) {
        const currentUnit = units.find((unit) => unit.code === current.unitCode) ?? null
        const originalPackageContentValue = ingredient.packageContentValue
        const originalPackageContentUnitCode = ingredient.packageContentUnitCode
        const canRestoreOriginalSnapshot = Boolean(
          isContainerMeasurementUnit(currentUnit)
          && current.unitCode === ingredient.unitCode
          && !current.packageContentValue
          && originalPackageContentValue !== null
          && originalPackageContentUnitCode,
        )

        return {
          ...current,
          productId: product.id,
          productName: product.name,
          packageContentValue: canRestoreOriginalSnapshot && originalPackageContentValue !== null
            ? formatQuantityInput(originalPackageContentValue)
            : current.packageContentValue,
          packageContentUnitCode: canRestoreOriginalSnapshot && originalPackageContentUnitCode
            ? originalPackageContentUnitCode
            : current.packageContentUnitCode,
        }
      }

      const unitCode = getDefaultUnitCode(units, product.defaultUnitCode)
      const rowUnit = units.find((unit) => unit.code === unitCode) ?? null
      const defaultContent = isContainerMeasurementUnit(rowUnit)
        ? getProductDefaultPackageDraft(product, units, unitCode)
        : null

      return {
        ...current,
        productId: product.id,
        productName: product.name,
        unitCode,
        packageContentValue: defaultContent?.value ?? '',
        packageContentUnitCode: defaultContent?.unitCode ?? packageContentUnits[0]?.code ?? '',
      }
    })
    setErrorMessage('')
  }

  function chooseExistingSection(sectionId: string) {
    setDraft((current) => ({ ...current, sectionId }))
    setPendingSectionOpen(false)
    setPendingSectionName('')
    setErrorMessage('')
  }

  function beginNewSection() {
    setPendingSectionOpen(true)
    setPendingSectionName('')
    setErrorMessage('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      const productName = cleanCanonicalProductName(draft.productName)
      const quantity = parseQuantityInput(draft.quantity)
      if (!quantity) throw new Error('Podaj prawidłową ilość większą od 0.')

      const unit = units.find((item) => item.code === draft.unitCode)
      if (!unit) throw new Error('Wybierz jednostkę.')

      const exactProductId = autocomplete.exactProduct?.id ?? draft.productId
      const exactProduct = exactProductId
        ? products.find((product) => product.id === exactProductId) ?? null
        : null
      const parsedPackageContentValue = draft.packageContentValue
        ? parseQuantityInput(draft.packageContentValue)
        : null
      if (draft.packageContentValue && !parsedPackageContentValue) {
        throw new Error('Podaj prawidłową zawartość jednego opakowania.')
      }
      if (isContainerMeasurementUnit(unit) && Boolean(draft.packageContentValue) !== Boolean(draft.packageContentUnitCode)) {
        throw new Error('Uzupełnij wartość i jednostkę zawartości opakowania.')
      }
      const explicitPackageContent = parsedPackageContentValue && draft.packageContentUnitCode
        ? { value: parsedPackageContentValue, unitCode: draft.packageContentUnitCode }
        : null
      const packageContent = resolveRecipePackageContent({
        rowUnitCode: unit.code,
        units,
        explicitContent: explicitPackageContent,
        productDefault: exactProduct,
        productDefaultUnitCode: exactProduct?.defaultUnitCode ?? null,
      })

      let sectionId = draft.sectionId
      let newSection: RecipeIngredientEditorSection | null = null

      if (pendingSectionOpen) {
        const name = cleanRecipeSectionName(pendingSectionName)
        const identity = recipeSectionIdentity(name)
        const duplicate = sections.find((section) => recipeSectionIdentity(section.name) === identity)
        if (duplicate) {
          throw new Error(`Sekcja „${duplicate.name}” już istnieje. Wybierz ją z przycisków.`)
        }

        newSection = {
          id: crypto.randomUUID(),
          name,
          isPrimary: false,
        }
        sectionId = newSection.id
      } else if (!sections.some((section) => section.id === sectionId)) {
        throw new Error('Wybierz sekcję składnika.')
      }

      onApply({
        ingredient: {
          id: draft.id,
          productId: exactProductId,
          productName,
          quantity,
          unitCode: unit.code,
          unitSymbol: unit.symbol,
          packageContentValue: packageContent?.value ?? null,
          packageContentUnitCode: packageContent?.unitCode ?? null,
          sectionId,
          note: draft.note.trim().replace(/\s+/g, ' '),
        },
        newSection,
        desiredSectionIndex: ingredient && !pendingSectionOpen && sectionId === originalSectionId
          ? desiredSectionIndex
          : null,
      })
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Sprawdź składnik.'))
    }
  }

  return (
    <div
      className="sheet-backdrop recipe-ingredient-editor-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <section
        className="inventory-sheet recipe-ingredient-editor-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-ingredient-editor-title"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <p className="eyebrow">{ingredient ? 'Edycja składnika' : 'Nowy składnik'}</p>
            <h2 id="recipe-ingredient-editor-title">{ingredient ? ingredient.productName : 'Dodaj składnik'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </header>

        <form className="inventory-form recipe-ingredient-editor-form" onSubmit={submit}>
          <ProductAutocompleteField
            inputId="recipe-ingredient-product"
            label="Produkt"
            value={draft.productName}
            exactProduct={autocomplete.exactProduct}
            suggestions={autocomplete.suggestions}
            placeholder="np. Mleko"
            inputRef={productInputRef}
            onChange={(value) => {
              setDraft((current) => {
                const currentProduct = current.productId
                  ? products.find((product) => product.id === current.productId) ?? null
                  : null
                const detachesProductIdentity = Boolean(
                  currentProduct
                  && normalizeProductName(value) !== normalizeProductName(currentProduct.name),
                )
                const returnsToOriginalProduct = Boolean(
                  ingredient
                  && normalizeProductName(value) === normalizeProductName(ingredient.productName)
                  && current.unitCode === ingredient.unitCode
                  && ingredient.packageContentValue !== null
                  && ingredient.packageContentUnitCode,
                )

                return {
                  ...current,
                  productName: value,
                  productId: null,
                  packageContentValue: returnsToOriginalProduct
                    ? formatQuantityInput(ingredient!.packageContentValue!)
                    : detachesProductIdentity ? '' : current.packageContentValue,
                  packageContentUnitCode: returnsToOriginalProduct
                    ? ingredient!.packageContentUnitCode!
                    : detachesProductIdentity
                      ? packageContentUnits[0]?.code ?? ''
                      : current.packageContentUnitCode,
                }
              })
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
                onChange={(value) => {
                  setDraft((current) => ({ ...current, quantity: value }))
                  setErrorMessage('')
                }}
                suffix={ingredientUnit?.symbol}
                ariaLabel="Ilość składnika"
              />
            </div>

            <label className="form-field" htmlFor="recipe-ingredient-unit">
              <span>Jednostka</span>
              <select
                id="recipe-ingredient-unit"
                value={draft.unitCode}
                onChange={(event) => {
                  const nextUnitCode = event.target.value
                  const nextUnit = units.find((unit) => unit.code === nextUnitCode) ?? null
                  const fallback = selectedProduct && isContainerMeasurementUnit(nextUnit)
                    ? getProductDefaultPackageDraft(selectedProduct, units, nextUnitCode)
                    : null

                  setDraft((current) => {
                    if (isDirectMeasurementUnit(nextUnit)) {
                      return {
                        ...current,
                        unitCode: nextUnitCode,
                        packageContentValue: '',
                        packageContentUnitCode: packageContentUnits[0]?.code ?? '',
                      }
                    }

                    if (isContainerMeasurementUnit(nextUnit)) {
                      const sameContainerUnit = current.unitCode === nextUnitCode
                      const restoresOriginalSnapshot = Boolean(
                        ingredient
                        && selectedProduct?.id === ingredient.productId
                        && nextUnitCode === ingredient.unitCode
                        && ingredient.packageContentValue !== null
                        && ingredient.packageContentUnitCode,
                      )

                      return {
                        ...current,
                        unitCode: nextUnitCode,
                        packageContentValue: sameContainerUnit
                          ? current.packageContentValue
                          : restoresOriginalSnapshot
                            ? formatQuantityInput(ingredient!.packageContentValue!)
                            : fallback?.value ?? '',
                        packageContentUnitCode: sameContainerUnit
                          ? current.packageContentUnitCode
                          : restoresOriginalSnapshot
                            ? ingredient!.packageContentUnitCode!
                            : fallback?.unitCode ?? packageContentUnits[0]?.code ?? '',
                      }
                    }

                    return {
                      ...current,
                      unitCode: nextUnitCode,
                      packageContentValue: '',
                      packageContentUnitCode: packageContentUnits[0]?.code ?? '',
                    }
                  })
                  setErrorMessage('')
                }}
              >
                {units.map((unit) => <option key={unit.code} value={unit.code}>{unit.labelPl} ({unit.symbol})</option>)}
              </select>
            </label>
          </div>

          {isContainerIngredientUnit && (
            <div className="package-content-card recipe-package-content-card">
              <div className="package-content-heading">
                <strong>Zawartość 1 {ingredientUnit?.labelPl ?? 'opakowania'}</strong>
                <span>Ta zawartość zostanie zapamiętana dla tego przepisu.</span>
              </div>
              <div className="package-content-fields">
                <div className="form-field">
                  <label htmlFor="recipe-package-content-value">Ilość</label>
                  <QuantityStepperInput
                    inputId="recipe-package-content-value"
                    value={draft.packageContentValue}
                    onChange={(value) => {
                      setDraft((current) => ({ ...current, packageContentValue: value }))
                      setErrorMessage('')
                    }}
                    suffix={packageContentUnit?.symbol}
                    ariaLabel="Zawartość jednego opakowania składnika"
                  />
                </div>
                <label className="form-field" htmlFor="recipe-package-content-unit">
                  <span>Jednostka</span>
                  <select
                    id="recipe-package-content-unit"
                    value={draft.packageContentUnitCode}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, packageContentUnitCode: event.target.value }))
                      setErrorMessage('')
                    }}
                  >
                    {packageContentUnits.map((unit) => (
                      <option key={unit.code} value={unit.code}>{unit.labelPl} ({unit.symbol})</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="form-field recipe-ingredient-section-field">
            <span>Sekcja</span>
            <div className="recipe-section-choice-list" role="group" aria-label="Wybierz sekcję składnika">
              {sections.map((section) => (
                <button
                  className={`recipe-section-choice${!pendingSectionOpen && draft.sectionId === section.id ? ' is-active' : ''}`}
                  key={section.id}
                  type="button"
                  aria-pressed={!pendingSectionOpen && draft.sectionId === section.id}
                  onClick={() => chooseExistingSection(section.id)}
                >
                  {section.name}
                </button>
              ))}
              <button
                className={`recipe-section-choice recipe-section-choice-add${pendingSectionOpen ? ' is-active' : ''}`}
                type="button"
                aria-pressed={pendingSectionOpen}
                onClick={beginNewSection}
              >
                <KitchenIcon name="plus" size={15} />
                <span>Nowa</span>
              </button>
            </div>
          </div>

          {pendingSectionOpen && (
            <label className="form-field recipe-new-section-field" htmlFor="recipe-ingredient-new-section">
              <span>Nazwa nowej sekcji</span>
              <input
                id="recipe-ingredient-new-section"
                value={pendingSectionName}
                maxLength={80}
                placeholder="np. Sos"
                onChange={(event) => {
                  setPendingSectionName(event.target.value)
                  setErrorMessage('')
                }}
              />
              <small>Sekcja powstanie dopiero po zastosowaniu składnika.</small>
            </label>
          )}

          <label className="form-field" htmlFor="recipe-ingredient-note">
            <span>Notatka <small>opcjonalnie</small></span>
            <input
              id="recipe-ingredient-note"
              value={draft.note}
              maxLength={240}
              placeholder="np. do posmarowania formy"
              onChange={(event) => {
                setDraft((current) => ({ ...current, note: event.target.value }))
                setErrorMessage('')
              }}
            />
          </label>

          {canReorder && (
            <div className="recipe-ingredient-draft-order" aria-label="Kolejność składnika w sekcji">
              <button
                type="button"
                className="secondary-button"
                disabled={desiredSectionIndex <= 0}
                onClick={() => setDesiredSectionIndex((current) => Math.max(0, current - 1))}
              >
                <KitchenIcon name="chevronUp" size={16} />
                <span>Wyżej</span>
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={desiredSectionIndex >= originalSectionRows.length - 1}
                onClick={() => setDesiredSectionIndex((current) => Math.min(originalSectionRows.length - 1, current + 1))}
              >
                <KitchenIcon name="chevronDown" size={16} />
                <span>Niżej</span>
              </button>
            </div>
          )}

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="recipe-ingredient-editor-actions">
            {ingredient ? (
              <button className="recipe-ingredient-delete" type="button" onClick={() => onRemove(ingredient.id)}>
                <KitchenIcon name="trash" size={16} />
                <span>Usuń</span>
              </button>
            ) : (
              <button className="secondary-button" type="button" onClick={onCancel}>Anuluj</button>
            )}
            <button className="primary-button" type="submit">
              {ingredient ? 'Zastosuj' : 'Dodaj'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
