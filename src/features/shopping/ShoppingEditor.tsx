import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { createShoppingItem, normalizeShoppingName, removeShoppingItem, updateShoppingItem } from './shoppingMutations'
import type { ShoppingItem, ShoppingReadModel } from './types'

type ShoppingEditorMode =
  | { kind: 'create' }
  | { kind: 'edit'; item: ShoppingItem }

type ShoppingEditorProps = {
  ownerId: string
  model: ShoppingReadModel
  mode: ShoppingEditorMode
  onClose: () => void
  onSaved: () => void
}

function parseQuantity(value: string) {
  const normalized = value.trim().replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function ShoppingEditor({ ownerId, model, mode, onClose, onSaved }: ShoppingEditorProps) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const initialItem = mode.kind === 'edit' ? mode.item : null
  const defaultUnit = initialItem?.unitCode
    ?? model.units.find((unit) => unit.code === 'szt')?.code
    ?? model.units[0]?.code
    ?? ''

  const [name, setName] = useState(initialItem?.name ?? '')
  const [quantity, setQuantity] = useState(initialItem ? String(initialItem.quantity) : '1')
  const [unitCode, setUnitCode] = useState(defaultUnit)
  const [unitTouched, setUnitTouched] = useState(mode.kind === 'edit')
  const [busy, setBusy] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const normalizedProductMap = useMemo(
    () => new Map(model.products.map((product) => [normalizeShoppingName(product.name), product])),
    [model.products],
  )

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

  function handleNameChange(nextName: string) {
    setName(nextName)
    setErrorMessage('')

    if (!unitTouched) {
      const product = normalizedProductMap.get(normalizeShoppingName(nextName))
      if (product) setUnitCode(product.defaultUnitCode)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    const parsedQuantity = parseQuantity(quantity)
    if (!name.trim()) {
      setErrorMessage('Podaj, co chcesz kupić.')
      return
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage('Podaj ilość większą od 0.')
      return
    }
    if (!unitCode) {
      setErrorMessage('Wybierz jednostkę.')
      return
    }

    setBusy(true)
    try {
      if (mode.kind === 'create') {
        await createShoppingItem({
          ownerId,
          name,
          quantity: parsedQuantity,
          unitCode,
        })
      } else {
        await updateShoppingItem({
          ownerId,
          itemId: mode.item.id,
          name,
          quantity: parsedQuantity,
          unitCode,
        })
      }
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zapisać listy zakupów.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (mode.kind !== 'edit') return

    setBusy(true)
    setErrorMessage('')
    try {
      await removeShoppingItem({ ownerId, itemId: mode.item.id })
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się usunąć z listy.')
      setConfirmingRemove(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop shopping-editor-backdrop" role="presentation">
      <section className="inventory-sheet shopping-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="shopping-editor-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <p className="eyebrow">{mode.kind === 'create' ? 'Lista zakupów' : 'Edycja'}</p>
            <h2 id="shopping-editor-title">{mode.kind === 'create' ? 'Dodaj do listy' : 'Edytuj rzecz'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </header>

        <form className="inventory-form shopping-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="shopping-name">
            <span>Co kupić?</span>
            <input
              ref={firstInputRef}
              id="shopping-name"
              type="text"
              value={name}
              maxLength={120}
              list="shopping-product-suggestions"
              autoComplete="off"
              onChange={(event) => handleNameChange(event.target.value)}
              disabled={busy}
              placeholder="np. Mleko"
            />
            <datalist id="shopping-product-suggestions">
              {model.products.map((product) => <option key={product.id} value={product.name} />)}
            </datalist>
          </label>

          <div className="form-split">
            <label className="form-field" htmlFor="shopping-quantity">
              <span>Ilość</span>
              <input
                id="shopping-quantity"
                inputMode="decimal"
                type="text"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value)
                  setErrorMessage('')
                }}
                disabled={busy}
              />
            </label>

            <label className="form-field" htmlFor="shopping-unit">
              <span>Jednostka</span>
              <select
                id="shopping-unit"
                value={unitCode}
                onChange={(event) => {
                  setUnitCode(event.target.value)
                  setUnitTouched(true)
                  setErrorMessage('')
                }}
                disabled={busy}
              >
                {model.units.map((unit) => (
                  <option key={unit.code} value={unit.code}>{unit.symbol}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="shopping-editor-hint">
            Jeśli nazwa pasuje do produktu z Zapasy, Kitchen zachowa jego wspólną tożsamość.
          </p>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Anuluj</button>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Zapisuję…' : mode.kind === 'create' ? 'Dodaj' : 'Zapisz'}
            </button>
          </div>
        </form>

        {mode.kind === 'edit' && (
          <section className="shopping-remove-zone" aria-label="Usuń z listy">
            {!confirmingRemove ? (
              <button className="shopping-remove-button" type="button" onClick={() => setConfirmingRemove(true)} disabled={busy}>
                <KitchenIcon name="trash" size={17} />
                <span>Usuń z listy</span>
              </button>
            ) : (
              <div className="shopping-remove-confirm">
                <p>Usunąć „{mode.item.name}” z listy?</p>
                <div>
                  <button className="secondary-button" type="button" onClick={() => setConfirmingRemove(false)} disabled={busy}>Nie</button>
                  <button className="danger-button" type="button" onClick={handleRemove} disabled={busy}>Usuń</button>
                </div>
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  )
}
