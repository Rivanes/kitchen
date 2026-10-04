import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { ProductAutocompleteField, useProductAutocomplete } from '../products/ProductAutocomplete'
import { getDefaultUnitCode } from '../measurements/measurementUnits'
import {
  getPackageContentFromDefaults,
  getPackageContentUnits,
  isContainerMeasurementUnit,
  isDirectMeasurementUnit,
  resolveInventoryPackageContent,
} from '../measurements/packageSemantics'
import {
  cleanCanonicalProductName,
  updateCanonicalProductSettings,
} from '../products/productCatalogMutations'
import { findExactProduct } from '../products/productIdentity'
import { QuantityStepperInput } from '../quantity/QuantityStepperInput'
import { formatQuantityInput, parseQuantityInput, QUANTITY_INPUT_ERROR } from '../quantity/quantity'
import { formatDateOnly, isValidDateOnly } from './expiry'
import { createInventoryLot, removeInventoryLot, updateInventoryLot } from './inventoryMutations'
import { StorageLocationPicker } from './StorageLocationPicker'
import type { CreateInventoryLotInput } from './inventoryMutations'
import type { InventoryCreateSeed, InventoryLot, InventoryProduct, InventoryReadModel } from './types'
import { toUserErrorMessage } from '../../lib/userError'

export type InventoryEditorMode =
  | { kind: 'create'; initialLocationId?: string; seed?: InventoryCreateSeed }
  | { kind: 'edit'; lot: InventoryLot }

export type InventoryEditorProps = {
  ownerId: string
  model: InventoryReadModel
  mode: InventoryEditorMode
  onClose: () => void
  onSaved: () => void
  onConsumeRequested?: (lot: InventoryLot) => void
  createHandler?: (input: CreateInventoryLotInput) => Promise<unknown>
}

function initialQuantity(mode: InventoryEditorMode) {
  if (mode.kind === 'edit') return formatQuantityInput(mode.lot.quantity)
  return formatQuantityInput(mode.seed?.quantity ?? 1)
}

function getInitialProduct(mode: InventoryEditorMode, products: readonly InventoryProduct[]) {
  if (mode.kind === 'edit') return products.find((product) => product.id === mode.lot.productId) ?? null
  if (mode.seed) return products.find((product) => product.id === mode.seed!.productId) ?? null
  return null
}

function getPackageDraft(product: InventoryProduct | null, unitCode: string, model: InventoryReadModel) {
  const rowUnit = model.units.find((unit) => unit.code === unitCode)
  const contentUnits = getPackageContentUnits(model.units)
  if (!isContainerMeasurementUnit(rowUnit)) {
    return { value: '', unitCode: contentUnits[0]?.code ?? '' }
  }

  const productDefault = getPackageContentFromDefaults(product)
  return {
    value: productDefault ? formatQuantityInput(productDefault.value) : '',
    unitCode: productDefault?.unitCode ?? contentUnits[0]?.code ?? '',
  }
}

export function InventoryEditor({
  ownerId,
  model,
  mode,
  onClose,
  onSaved,
  onConsumeRequested,
  createHandler = createInventoryLot,
}: InventoryEditorProps) {
  const initialLocationId = mode.kind === 'edit'
    ? mode.lot.storageLocationId
    : (mode.initialLocationId ?? model.locations[0]?.id ?? '')
  const createSeed = mode.kind === 'create' ? mode.seed : undefined
  const initialUnitCode = mode.kind === 'edit'
    ? mode.lot.unitCode
    : (createSeed?.unitCode ?? getDefaultUnitCode(model.units))
  const initialProduct = getInitialProduct(mode, model.products)
  const initialPackageDraft = mode.kind === 'edit' && mode.lot.packageContentValue !== null && mode.lot.packageContentUnitCode
    ? {
        value: formatQuantityInput(mode.lot.packageContentValue),
        unitCode: mode.lot.packageContentUnitCode,
      }
    : getPackageDraft(initialProduct, initialUnitCode, model)

  const [productName, setProductName] = useState(mode.kind === 'edit' ? mode.lot.productName : (createSeed?.productName ?? ''))
  const currentProductName = mode.kind === 'edit' ? mode.lot.productName : ''
  const [productSettingsOpen, setProductSettingsOpen] = useState(false)
  const [settingsName, setSettingsName] = useState(mode.kind === 'edit' ? mode.lot.productName : '')
  const [settingsPackageContentValue, setSettingsPackageContentValue] = useState(
    initialProduct?.packageContentValue ? formatQuantityInput(initialProduct.packageContentValue) : '',
  )
  const [settingsPackageContentUnitCode, setSettingsPackageContentUnitCode] = useState(
    initialProduct?.packageContentUnitCode ?? getPackageContentUnits(model.units)[0]?.code ?? '',
  )
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [quantity, setQuantity] = useState(initialQuantity(mode))
  const [unitCode, setUnitCode] = useState(initialUnitCode)
  const [packageContentValue, setPackageContentValue] = useState(initialPackageDraft.value)
  const [packageContentUnitCode, setPackageContentUnitCode] = useState(initialPackageDraft.unitCode)
  const [packageContentTouched, setPackageContentTouched] = useState(mode.kind === 'edit' && mode.lot.packageContentValue !== null)
  const [locationId, setLocationId] = useState(initialLocationId)
  const [expiryDate, setExpiryDate] = useState(mode.kind === 'edit' ? (mode.lot.expiryDate ?? '') : '')
  const [afterOpenDays, setAfterOpenDays] = useState(mode.kind === 'edit' && mode.lot.afterOpenDays ? String(mode.lot.afterOpenDays) : '')
  const [unitTouched, setUnitTouched] = useState(mode.kind === 'edit' || Boolean(createSeed))
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)
  const busy = saving || removing || settingsSaving

  const packageContentUnits = useMemo(() => getPackageContentUnits(model.units), [model.units])
  const rowUnit = model.units.find((unit) => unit.code === unitCode) ?? null
  const isContainerUnit = isContainerMeasurementUnit(rowUnit)
  const isDirectUnit = isDirectMeasurementUnit(rowUnit)

  const productAutocomplete = useProductAutocomplete(
    model.products,
    mode.kind === 'create' && !createSeed ? productName : '',
  )
  const exactProduct = mode.kind === 'create' && !createSeed ? productAutocomplete.exactProduct : null
  const suggestions = mode.kind === 'create' && !createSeed ? productAutocomplete.suggestions : []
  const activeProduct = mode.kind === 'edit'
    ? initialProduct
    : createSeed
      ? initialProduct
      : exactProduct

  const settingsCollision = useMemo(() => {
    if (mode.kind !== 'edit') return null
    return findExactProduct(model.products, settingsName, mode.lot.productId)
  }, [mode, model.products, settingsName])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let focusTimer: number | undefined
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 20)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || busy) return
      if (productSettingsOpen) {
        setProductSettingsOpen(false)
        setSettingsError('')
        return
      }
      onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, busy, productSettingsOpen])

  useEffect(() => {
    if (mode.kind !== 'create' || createSeed || unitTouched) return
    if (exactProduct) {
      setUnitCode(exactProduct.defaultUnitCode)
    } else {
      setUnitCode(getDefaultUnitCode(model.units))
    }
  }, [mode.kind, createSeed, exactProduct, model.units, unitTouched])

  useEffect(() => {
    if (mode.kind !== 'create' || createSeed || packageContentTouched) return
    const draft = getPackageDraft(exactProduct, unitCode, model)
    setPackageContentValue(draft.value)
    setPackageContentUnitCode(draft.unitCode)
  }, [mode.kind, createSeed, exactProduct, unitCode, model, packageContentTouched])

  function applyUnit(nextUnitCode: string, product: InventoryProduct | null = activeProduct) {
    setUnitCode(nextUnitCode)
    setUnitTouched(true)
    setPackageContentTouched(false)
    const draft = getPackageDraft(product, nextUnitCode, model)
    setPackageContentValue(draft.value)
    setPackageContentUnitCode(draft.unitCode)
    setErrorMessage('')
  }

  function chooseProduct(product: (typeof model.products)[number]) {
    setProductName(product.name)
    setUnitTouched(false)
    setPackageContentTouched(false)
    setUnitCode(product.defaultUnitCode)
    const draft = getPackageDraft(product, product.defaultUnitCode, model)
    setPackageContentValue(draft.value)
    setPackageContentUnitCode(draft.unitCode)
    setErrorMessage('')
  }

  function openProductSettings() {
    if (mode.kind !== 'edit' || busy || !initialProduct) return
    setSettingsName(currentProductName)
    setSettingsPackageContentValue(initialProduct.packageContentValue ? formatQuantityInput(initialProduct.packageContentValue) : '')
    setSettingsPackageContentUnitCode(initialProduct.packageContentUnitCode ?? packageContentUnits[0]?.code ?? '')
    setSettingsError('')
    setProductSettingsOpen(true)
  }

  function cancelProductSettings() {
    if (busy) return
    setSettingsError('')
    setProductSettingsOpen(false)
  }

  async function handleProductSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'edit' || busy) return

    let cleanName: string
    try {
      cleanName = cleanCanonicalProductName(settingsName)
    } catch (error) {
      setSettingsError(toUserErrorMessage(error, 'Podaj prawidłową nazwę produktu.'))
      return
    }

    if (settingsCollision) {
      setSettingsError(`Produkt „${settingsCollision.name}” już istnieje. Wybierz inną nazwę.`)
      return
    }

    let parsedDefaultContent: number | null = null
    if (settingsPackageContentValue.trim()) {
      parsedDefaultContent = parseQuantityInput(settingsPackageContentValue)
      if (!parsedDefaultContent || !packageContentUnits.some((unit) => unit.code === settingsPackageContentUnitCode)) {
        setSettingsError('Podaj prawidłową domyślną zawartość opakowania.')
        return
      }
    }

    setSettingsSaving(true)
    setSettingsError('')
    try {
      await updateCanonicalProductSettings({
        ownerId,
        productId: mode.lot.productId,
        nextName: cleanName,
        packageContentValue: parsedDefaultContent,
        packageContentUnitCode: parsedDefaultContent ? settingsPackageContentUnitCode : null,
      })
      onSaved()
    } catch (error: unknown) {
      setSettingsError(toUserErrorMessage(error, 'Nie udało się zapisać ustawień produktu.'))
      setSettingsSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const parsedQuantity = parseQuantityInput(quantity)
    if (!parsedQuantity) {
      setErrorMessage(QUANTITY_INPUT_ERROR)
      return
    }
    if (!locationId || !unitCode) {
      setErrorMessage('Wybierz miejsce i jednostkę.')
      return
    }

    if (!isContainerUnit && !isDirectUnit) {
      setErrorMessage('Wybrana jednostka nie ma jeszcze obsługiwanej semantyki.')
      return
    }

    let packageContent = null
    if (isContainerUnit) {
      const parsedContent = parseQuantityInput(packageContentValue)
      if (!parsedContent) {
        setErrorMessage('Podaj zawartość jednego opakowania.')
        return
      }
      try {
        packageContent = resolveInventoryPackageContent({
          rowUnitCode: unitCode,
          units: model.units,
          explicitContent: { value: parsedContent, unitCode: packageContentUnitCode },
          productDefault: activeProduct,
        })
      } catch (error) {
        setErrorMessage(toUserErrorMessage(error, 'Podaj prawidłową zawartość opakowania.'))
        return
      }
    }

    if (expiryDate && !isValidDateOnly(expiryDate)) {
      setErrorMessage('Podaj prawidłowy termin ważności.')
      return
    }

    let parsedAfterOpenDays: number | null = null
    if (afterOpenDays.trim()) {
      const parsed = Number(afterOpenDays)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650) {
        setErrorMessage('Termin po otwarciu musi mieć od 1 do 3650 dni.')
        return
      }
      parsedAfterOpenDays = parsed
    }

    if (mode.kind === 'create') {
      try {
        cleanCanonicalProductName(productName)
      } catch (error) {
        setErrorMessage(toUserErrorMessage(error, 'Podaj prawidłową nazwę produktu.'))
        return
      }
    }

    setSaving(true)
    setErrorMessage('')

    try {
      if (mode.kind === 'create') {
        await createHandler({
          ownerId,
          productName,
          existingProductId: createSeed?.productId ?? exactProduct?.id ?? null,
          storageLocationId: locationId,
          quantity: parsedQuantity,
          unitCode,
          packageContentValue: packageContent?.value ?? null,
          packageContentUnitCode: packageContent?.unitCode ?? null,
          expiryDate: expiryDate || null,
          afterOpenDays: parsedAfterOpenDays,
        })
      } else {
        await updateInventoryLot({
          ownerId,
          lotId: mode.lot.id,
          storageLocationId: locationId,
          quantity: parsedQuantity,
          unitCode,
          packageContentValue: packageContent?.value ?? null,
          packageContentUnitCode: packageContent?.unitCode ?? null,
          expiryDate: expiryDate || null,
          afterOpenDays: parsedAfterOpenDays,
        })
      }
      onSaved()
    } catch (error: unknown) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się zapisać zmian.'))
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (mode.kind !== 'edit' || busy) return
    setRemoving(true)
    setErrorMessage('')

    try {
      await removeInventoryLot({ ownerId, lotId: mode.lot.id })
      onSaved()
    } catch (error: unknown) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się usunąć zapasu.'))
      setRemoving(false)
      setConfirmingRemove(false)
    }
  }

  const packageLabel = rowUnit ? `Zawartość 1 ${rowUnit.labelPl}` : 'Zawartość opakowania'

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section className="inventory-sheet" role="dialog" aria-modal="true" aria-labelledby="inventory-editor-title">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">{mode.kind === 'create' ? (createSeed ? 'Kupione' : 'Nowy zapas') : productSettingsOpen ? 'Produkt' : 'Edycja'}</p>
            <div className="inventory-editor-title-row">
              <h2 id="inventory-editor-title">
                {mode.kind === 'create' ? (createSeed ? 'Dodaj do zapasów' : 'Dodaj produkt') : productSettingsOpen ? 'Ustawienia produktu' : currentProductName}
              </h2>
              {mode.kind === 'edit' && !productSettingsOpen && (
                <button
                  className="product-rename-trigger"
                  type="button"
                  onClick={openProductSettings}
                  disabled={busy}
                  aria-label={`Edytuj ustawienia produktu ${currentProductName}`}
                  title="Ustawienia produktu"
                >
                  <KitchenIcon name="edit" size={17} />
                </button>
              )}
            </div>
          </div>
          <button className="icon-button icon-button-quiet" type="button" onClick={onClose} disabled={busy} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </div>

        {mode.kind === 'edit' && productSettingsOpen ? (
          <form className="product-rename-form product-settings-form" onSubmit={handleProductSettingsSubmit}>
            <div className="form-field">
              <label htmlFor="inventory-product-settings-name">Nazwa produktu</label>
              <input
                id="inventory-product-settings-name"
                type="text"
                value={settingsName}
                onChange={(event) => {
                  setSettingsName(event.target.value)
                  setSettingsError('')
                }}
                autoComplete="off"
                maxLength={120}
                disabled={busy}
              />
              <p className="field-hint">Zmiana obejmie wszystkie partie tego produktu.</p>
            </div>

            <div className="product-package-default-card">
              <div>
                <strong>Domyślna zawartość opakowania</strong>
                <span>Używana jako podpowiedź dla opak., but., słoików, puszek i saszetek.</span>
              </div>
              <div className="package-content-fields">
                <div className="form-field">
                  <label htmlFor="product-package-content-value">Ilość</label>
                  <input
                    id="product-package-content-value"
                    type="text"
                    inputMode="decimal"
                    value={settingsPackageContentValue}
                    onChange={(event) => {
                      setSettingsPackageContentValue(event.target.value)
                      setSettingsError('')
                    }}
                    placeholder="np. 1"
                    disabled={busy}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="product-package-content-unit">Jednostka</label>
                  <select
                    id="product-package-content-unit"
                    value={settingsPackageContentUnitCode}
                    onChange={(event) => {
                      setSettingsPackageContentUnitCode(event.target.value)
                      setSettingsError('')
                    }}
                    disabled={busy}
                  >
                    {packageContentUnits.map((unit) => <option value={unit.code} key={unit.code}>{unit.symbol}</option>)}
                  </select>
                </div>
              </div>
              <p className="field-hint">Puste pole oznacza brak domyślnej zawartości. Zmiana nie przelicza istniejących partii w Zapachach.</p>
            </div>

            {settingsCollision && !settingsError && (
              <p className="form-error" role="alert">Produkt „{settingsCollision.name}” już istnieje. Wybierz inną nazwę.</p>
            )}
            {settingsError && <p className="form-error" role="alert">{settingsError}</p>}

            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={cancelProductSettings} disabled={busy}>Anuluj</button>
              <button className="primary-button" type="submit" disabled={busy || Boolean(settingsCollision)}>
                {settingsSaving ? 'Zapisuję…' : 'Zapisz ustawienia'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <form className="inventory-form" onSubmit={handleSubmit}>
              {mode.kind === 'create' && !createSeed && (
                <ProductAutocompleteField
                  inputRef={firstInputRef}
                  inputId="inventory-product-name"
                  label="Produkt"
                  value={productName}
                  exactProduct={exactProduct}
                  suggestions={suggestions}
                  exactHint="Użyję istniejącego produktu."
                  unmatchedHint="Powstanie nowy produkt."
                  placeholder="np. Mleko"
                  disabled={busy}
                  onChange={(nextName) => {
                    setProductName(nextName)
                    setPackageContentTouched(false)
                    setErrorMessage('')
                  }}
                  onChoose={chooseProduct}
                />
              )}

              {mode.kind === 'create' && createSeed && (
                <div className="inventory-create-seed-summary" aria-label="Kupiony produkt przenoszony do zapasów">
                  <strong>{createSeed.productName}</strong>
                  <span>{quantity} {model.units.find((unit) => unit.code === unitCode)?.symbol ?? unitCode}</span>
                  <small>Produkt i kupiona ilość pozostaną bez zmian.</small>
                </div>
              )}

              {!createSeed && <div className="form-split">
                <div className="form-field">
                  <label htmlFor="inventory-quantity">Ilość</label>
                  <QuantityStepperInput
                    inputRef={mode.kind === 'edit' ? firstInputRef : undefined}
                    inputId="inventory-quantity"
                    value={quantity}
                    onChange={(nextQuantity) => {
                      setQuantity(nextQuantity)
                      setErrorMessage('')
                    }}
                    disabled={busy}
                    ariaLabel="Ilość zapasu"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="inventory-unit">Jednostka</label>
                  <select
                    id="inventory-unit"
                    value={unitCode}
                    onChange={(event) => applyUnit(event.target.value)}
                    disabled={busy}
                  >
                    {model.units.map((unit) => (
                      <option value={unit.code} key={unit.code}>{unit.symbol}</option>
                    ))}
                  </select>
                </div>
              </div>}

              {isContainerUnit && (
                <div className="package-content-card">
                  <div className="package-content-heading">
                    <strong>{packageLabel}</strong>
                    <span>{mode.kind === 'edit' && mode.lot.packageContentValue === null ? 'Uzupełnij dla tej partii' : 'Na jedno opakowanie'}</span>
                  </div>
                  <div className="package-content-fields">
                    <div className="form-field">
                      <label htmlFor="inventory-package-content-value">Ilość</label>
                      <input
                        id="inventory-package-content-value"
                        type="text"
                        inputMode="decimal"
                        value={packageContentValue}
                        onChange={(event) => {
                          setPackageContentValue(event.target.value)
                          setPackageContentTouched(true)
                          setErrorMessage('')
                        }}
                        placeholder="np. 1"
                        disabled={busy}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="inventory-package-content-unit">Jednostka</label>
                      <select
                        id="inventory-package-content-unit"
                        value={packageContentUnitCode}
                        onChange={(event) => {
                          setPackageContentUnitCode(event.target.value)
                          setPackageContentTouched(true)
                          setErrorMessage('')
                        }}
                        disabled={busy}
                      >
                        {packageContentUnits.map((unit) => (
                          <option value={unit.code} key={unit.code}>{unit.symbol}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="field-hint">To zapis fizycznej zawartości tej partii. Zmiana domyślnej wartości produktu później jej nie zmieni.</p>
                </div>
              )}

              <div className="form-field storage-location-field">
                <span className="form-field-label" id="inventory-location-label">Miejsce</span>
                <StorageLocationPicker
                  locations={model.locations}
                  value={locationId}
                  onChange={(nextLocationId) => {
                    setLocationId(nextLocationId)
                    setErrorMessage('')
                  }}
                  disabled={busy}
                  labelId="inventory-location-label"
                />
              </div>

              <div className="form-field">
                <div className="field-label-row">
                  <label htmlFor="inventory-expiry">Termin ważności</label>
                  <span>Opcjonalnie</span>
                </div>
                <div className="date-input-row">
                  <input
                    id="inventory-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(event) => {
                      setExpiryDate(event.target.value)
                      setErrorMessage('')
                    }}
                    disabled={busy}
                  />
                  {expiryDate && (
                    <button
                      className="date-clear-button"
                      type="button"
                      onClick={() => setExpiryDate('')}
                      disabled={busy}
                      aria-label="Wyczyść termin ważności"
                      title="Wyczyść termin ważności"
                    >
                      <KitchenIcon name="close" size={18} />
                    </button>
                  )}
                </div>
              </div>

              <details className="after-open-details" open={mode.kind === 'edit' && Boolean(mode.lot.openedAt) ? true : undefined}>
                <summary>
                  <span>Po otwarciu</span>
                  <strong>{afterOpenDays ? `${afterOpenDays} dni` : 'Nie ustawiono'}</strong>
                </summary>
                <div className="after-open-config">
                  <label htmlFor="inventory-after-open-days">Zużyć w</label>
                  <div className="after-open-input-row">
                    <input
                      id="inventory-after-open-days"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="3650"
                      step="1"
                      value={afterOpenDays}
                      onChange={(event) => {
                        setAfterOpenDays(event.target.value)
                        setErrorMessage('')
                      }}
                      placeholder="np. 3"
                      disabled={busy}
                    />
                    <span>dni</span>
                    {afterOpenDays && (
                      <button
                        className="after-open-clear"
                        type="button"
                        onClick={() => setAfterOpenDays('')}
                        disabled={busy}
                        aria-label="Wyczyść termin po otwarciu"
                        title="Wyczyść termin po otwarciu"
                      >
                        <KitchenIcon name="close" size={17} />
                      </button>
                    )}
                  </div>
                  {mode.kind === 'edit' && mode.lot.openedAt && (
                    <p className="after-open-state">Otwarty od {formatDateOnly(mode.lot.openedAt)}</p>
                  )}
                </div>
              </details>

              {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

              <div className="sheet-actions">
                <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Anuluj</button>
                <button className="primary-button" type="submit" disabled={busy}>
                  {saving ? 'Zapisuję…' : 'Zapisz'}
                </button>
              </div>
            </form>

            {mode.kind === 'edit' && (
              <section className="inventory-stock-actions" aria-label="Akcje zapasu">
                {!confirmingRemove ? (
                  <div className="stock-action-buttons">
                    <button
                      className="stock-action-button"
                      type="button"
                      onClick={() => onConsumeRequested?.(mode.lot)}
                      disabled={busy}
                      aria-label={`Zużyj ${currentProductName}`}
                    >
                      <span className="stock-action-icon" aria-hidden="true"><KitchenIcon name="minus" size={18} /></span>
                      <strong>Zużyj</strong>
                    </button>
                    <button
                      className="stock-action-button stock-action-danger"
                      type="button"
                      onClick={() => setConfirmingRemove(true)}
                      disabled={busy}
                      aria-label={`Usuń ${currentProductName} z zapasów`}
                      title="Usuń z zapasów"
                    >
                      <span className="stock-action-icon" aria-hidden="true"><KitchenIcon name="trash" size={17} /></span>
                      <strong>Usuń</strong>
                    </button>
                  </div>
                ) : (
                  <div className="remove-confirm" role="alertdialog" aria-label={`Usuń ${currentProductName} z zapasów`}>
                    <strong>Usunąć ten wpis?</strong>
                    <span>Produkt zostanie w katalogu i będzie można dodać go ponownie.</span>
                    <div className="remove-confirm-actions">
                      <button className="secondary-button" type="button" onClick={() => setConfirmingRemove(false)} disabled={busy}>Zostaw</button>
                      <button className="danger-button" type="button" onClick={handleRemove} disabled={busy}>{removing ? 'Usuwam…' : 'Usuń'}</button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </div>
  )
}
