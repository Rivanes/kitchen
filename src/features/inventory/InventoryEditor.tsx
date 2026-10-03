import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { createInventoryLot, normalizeProductName, updateInventoryLot } from './inventoryMutations'
import type { InventoryLot, InventoryReadModel } from './types'

type InventoryEditorMode =
  | { kind: 'create' }
  | { kind: 'edit'; lot: InventoryLot }

type InventoryEditorProps = {
  ownerId: string
  model: InventoryReadModel
  mode: InventoryEditorMode
  onClose: () => void
  onSaved: () => void
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

export function InventoryEditor({ ownerId, model, mode, onClose, onSaved }: InventoryEditorProps) {
  const initialLocationId = mode.kind === 'edit' ? mode.lot.storageLocationId : (model.locations[0]?.id ?? '')
  const initialUnitCode = mode.kind === 'edit' ? mode.lot.unitCode : 'pcs'
  const [productName, setProductName] = useState(mode.kind === 'edit' ? mode.lot.productName : '')
  const [quantity, setQuantity] = useState(initialQuantity(mode))
  const [unitCode, setUnitCode] = useState(initialUnitCode)
  const [locationId, setLocationId] = useState(initialLocationId)
  const [unitTouched, setUnitTouched] = useState(mode.kind === 'edit')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 20)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, saving])

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const parsedQuantity = parseQuantity(quantity)
    if (!parsedQuantity) {
      setErrorMessage('Podaj ilość większą od 0, maksymalnie do 3 miejsc po przecinku.')
      return
    }
    if (!locationId || !unitCode) {
      setErrorMessage('Wybierz miejsce i jednostkę.')
      return
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
        })
      } else {
        await updateInventoryLot({
          ownerId,
          lotId: mode.lot.id,
          storageLocationId: locationId,
          quantity: parsedQuantity,
          unitCode,
        })
      }
      onSaved()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zapisać zmian.')
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className="inventory-sheet" role="dialog" aria-modal="true" aria-labelledby="inventory-editor-title">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">{mode.kind === 'create' ? 'Nowy zapas' : 'Edycja'}</p>
            <h2 id="inventory-editor-title">{mode.kind === 'create' ? 'Dodaj produkt' : mode.lot.productName}</h2>
          </div>
          <button className="icon-button icon-button-quiet" type="button" onClick={onClose} disabled={saving} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </div>

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
                disabled={saving}
              />
              {exactProduct && <p className="field-hint">Użyję istniejącego produktu.</p>}
              {!exactProduct && productName.trim() && <p className="field-hint">Powstanie nowy produkt.</p>}
              {suggestions.length > 0 && (
                <div className="product-suggestions" aria-label="Pasujące produkty">
                  {suggestions.map((product) => (
                    <button type="button" key={product.id} onClick={() => chooseProduct(product.id)} disabled={saving}>
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
                disabled={saving}
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
                disabled={saving}
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
              disabled={saving}
            >
              {model.locations.map((location) => (
                <option value={location.id} key={location.id}>{location.name}</option>
              ))}
            </select>
          </div>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Anuluj</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Zapisuję…' : 'Zapisz'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
