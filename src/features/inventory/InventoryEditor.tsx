import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { formatDateOnly, isValidDateOnly } from './expiry'
import { createInventoryLot, normalizeProductName, removeInventoryLot, renameProduct, updateInventoryLot } from './inventoryMutations'
import type { InventoryLot, InventoryReadModel } from './types'

type InventoryEditorMode =
  | { kind: 'create'; initialLocationId?: string }
  | { kind: 'edit'; lot: InventoryLot }

type InventoryEditorProps = {
  ownerId: string
  model: InventoryReadModel
  mode: InventoryEditorMode
  onClose: () => void
  onSaved: () => void
  onConsumeRequested: (lot: InventoryLot) => void
}

function initialQuantity(mode: InventoryEditorMode) {
  return mode.kind === 'edit' ? String(mode.lot.quantity).replace('.', ',') : '1'
}

function parseQuantity(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 999999999.999) return null
  return parsed
}

export function InventoryEditor({ ownerId, model, mode, onClose, onSaved, onConsumeRequested }: InventoryEditorProps) {
  const initialLocationId = mode.kind === 'edit'
    ? mode.lot.storageLocationId
    : (mode.initialLocationId ?? model.locations[0]?.id ?? '')
  const initialUnitCode = mode.kind === 'edit' ? mode.lot.unitCode : 'pcs'
  const [productName, setProductName] = useState(mode.kind === 'edit' ? mode.lot.productName : '')
  const currentProductName = mode.kind === 'edit' ? mode.lot.productName : ''
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameName, setRenameName] = useState(mode.kind === 'edit' ? mode.lot.productName : '')
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState('')
  const [quantity, setQuantity] = useState(initialQuantity(mode))
  const [unitCode, setUnitCode] = useState(initialUnitCode)
  const [locationId, setLocationId] = useState(initialLocationId)
  const [expiryDate, setExpiryDate] = useState(mode.kind === 'edit' ? (mode.lot.expiryDate ?? '') : '')
  const [afterOpenDays, setAfterOpenDays] = useState(mode.kind === 'edit' && mode.lot.afterOpenDays ? String(mode.lot.afterOpenDays) : '')
  const [unitTouched, setUnitTouched] = useState(mode.kind === 'edit')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)
  const busy = saving || removing || renaming

  const exactProduct = useMemo(() => {
    if (mode.kind === 'edit') return null
    const normalized = normalizeProductName(productName)
    if (!normalized) return null
    return model.products.find((product) => normalizeProductName(product.name) === normalized) ?? null
  }, [mode.kind, model.products, productName])

  const suggestions = useMemo(() => {
    if (mode.kind === 'edit') return []
    const normalized = normalizeProductName(productName)
    if (normalized.length < 1) return []
    return model.products
      .filter((product) => normalizeProductName(product.name).includes(normalized))
      .filter((product) => product.id !== exactProduct?.id)
      .slice(0, 5)
  }, [mode.kind, model.products, productName, exactProduct?.id])

  const renameCollision = useMemo(() => {
    if (mode.kind !== 'edit') return null
    const normalized = normalizeProductName(renameName)
    if (!normalized) return null
    return model.products.find((product) => (
      product.id !== mode.lot.productId
      && normalizeProductName(product.name) === normalized
    )) ?? null
  }, [mode, model.products, renameName])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let focusTimer: number | undefined
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 20)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || busy) return
      if (renameOpen) {
        setRenameOpen(false)
        setRenameName(currentProductName)
        setRenameError('')
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
  }, [onClose, busy, renameOpen, currentProductName])

  useEffect(() => {
    if (mode.kind !== 'create' || unitTouched) return
    if (exactProduct) {
      setUnitCode(exactProduct.defaultUnitCode)
    } else {
      setUnitCode('pcs')
    }
  }, [mode.kind, exactProduct, unitTouched])

  function chooseProduct(productId: string) {
    const product = model.products.find((item) => item.id === productId)
    if (!product) return
    setProductName(product.name)
    setUnitCode(product.defaultUnitCode)
    setUnitTouched(false)
    setErrorMessage('')
  }

  function openRename() {
    if (mode.kind !== 'edit' || busy) return
    setRenameName(currentProductName)
    setRenameError('')
    setRenameOpen(true)
  }

  function cancelRename() {
    if (busy) return
    setRenameName(currentProductName)
    setRenameError('')
    setRenameOpen(false)
  }

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'edit' || busy) return

    const cleanName = renameName.trim().replace(/\s+/g, ' ')
    if (!cleanName || cleanName.length > 120) {
      setRenameError('Podaj nazwę produktu do 120 znaków.')
      return
    }

    if (renameCollision) {
      setRenameError(`Produkt „${renameCollision.name}” już istnieje. Wybierz inną nazwę.`)
      return
    }

    setRenaming(true)
    setRenameError('')

    try {
      await renameProduct({
        ownerId,
        productId: mode.lot.productId,
        nextName: cleanName,
      })
      onSaved()
    } catch (error: unknown) {
      setRenameError(error instanceof Error ? error.message : 'Nie udało się zmienić nazwy produktu.')
      setRenaming(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const parsedQuantity = parseQuantity(quantity)
    if (!parsedQuantity) {
      setErrorMessage('Podaj ilość większą od 0, maksymalnie do 3 miejsc po przecinku.')
      return
    }
    if (!locationId || !unitCode) {
      setErrorMessage('Wybierz miejsce i jednostkę.')
      return
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
      const cleanName = productName.trim().replace(/\s+/g, ' ')
      if (!cleanName || cleanName.length > 120) {
        setErrorMessage('Podaj nazwę produktu do 120 znaków.')
        return
      }
    }

    setSaving(true)
    setErrorMessage('')

    try {
      if (mode.kind === 'create') {
        await createInventoryLot({
          ownerId,
          productName,
          existingProductId: exactProduct?.id ?? null,
          storageLocationId: locationId,
          quantity: parsedQuantity,
          unitCode,
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
          expiryDate: expiryDate || null,
          afterOpenDays: parsedAfterOpenDays,
        })
      }
      onSaved()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zapisać zmian.')
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
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się usunąć zapasu.')
      setRemoving(false)
      setConfirmingRemove(false)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section className="inventory-sheet" role="dialog" aria-modal="true" aria-labelledby="inventory-editor-title">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">{mode.kind === 'create' ? 'Nowy zapas' : renameOpen ? 'Produkt' : 'Edycja'}</p>
            <div className="inventory-editor-title-row">
              <h2 id="inventory-editor-title">
                {mode.kind === 'create' ? 'Dodaj produkt' : renameOpen ? 'Zmień nazwę' : currentProductName}
              </h2>
              {mode.kind === 'edit' && !renameOpen && (
                <button
                  className="product-rename-trigger"
                  type="button"
                  onClick={openRename}
                  disabled={busy}
                  aria-label={`Zmień nazwę produktu ${currentProductName}`}
                  title="Zmień nazwę produktu"
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

        {mode.kind === 'edit' && renameOpen ? (
          <form className="product-rename-form" onSubmit={handleRenameSubmit}>
            <div className="form-field">
              <label htmlFor="inventory-product-rename">Nazwa produktu</label>
              <input
                id="inventory-product-rename"
                type="text"
                value={renameName}
                onChange={(event) => {
                  setRenameName(event.target.value)
                  setRenameError('')
                }}
                autoComplete="off"
                maxLength={120}
                disabled={busy}
              />
              <p className="field-hint">Zmiana obejmie wszystkie partie tego produktu.</p>
            </div>

            {renameCollision && !renameError && (
              <p className="form-error" role="alert">Produkt „{renameCollision.name}” już istnieje. Wybierz inną nazwę.</p>
            )}
            {renameError && <p className="form-error" role="alert">{renameError}</p>}

            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={cancelRename} disabled={busy}>Anuluj</button>
              <button className="primary-button" type="submit" disabled={busy || Boolean(renameCollision)}>
                {renaming ? 'Zapisuję…' : 'Zapisz nazwę'}
              </button>
            </div>
          </form>
        ) : (
          <>
        <form className="inventory-form" onSubmit={handleSubmit}>
          {mode.kind === 'create' && (
            <div className="form-field">
              <label htmlFor="inventory-product-name">Produkt</label>
              <input
                ref={firstInputRef}
                id="inventory-product-name"
                type="text"
                value={productName}
                onChange={(event) => {
                  setProductName(event.target.value)
                  setErrorMessage('')
                }}
                autoComplete="off"
                maxLength={120}
                placeholder="np. Mleko"
                disabled={busy}
              />
              {exactProduct && <p className="field-hint">Użyję istniejącego produktu.</p>}
              {!exactProduct && productName.trim() && <p className="field-hint">Powstanie nowy produkt.</p>}
              {suggestions.length > 0 && (
                <div className="product-suggestions" aria-label="Pasujące produkty">
                  {suggestions.map((product) => (
                    <button type="button" key={product.id} onClick={() => chooseProduct(product.id)} disabled={busy}>
                      {product.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-split">
            <div className="form-field">
              <label htmlFor="inventory-quantity">Ilość</label>
              <input
                ref={mode.kind === 'edit' ? firstInputRef : undefined}
                id="inventory-quantity"
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value)
                  setErrorMessage('')
                }}
                autoComplete="off"
                disabled={busy}
              />
            </div>

            <div className="form-field">
              <label htmlFor="inventory-unit">Jednostka</label>
              <select
                id="inventory-unit"
                value={unitCode}
                onChange={(event) => {
                  setUnitCode(event.target.value)
                  setUnitTouched(true)
                  setErrorMessage('')
                }}
                disabled={busy}
              >
                {model.units.map((unit) => (
                  <option value={unit.code} key={unit.code}>{unit.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="inventory-location">Miejsce</label>
            <select
              id="inventory-location"
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value)
                setErrorMessage('')
              }}
              disabled={busy}
            >
              {model.locations.map((location) => (
                <option value={location.id} key={location.id}>{location.name}</option>
              ))}
            </select>
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
                  onClick={() => onConsumeRequested(mode.lot)}
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
