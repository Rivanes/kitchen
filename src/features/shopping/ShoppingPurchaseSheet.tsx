import { FormEvent, useEffect, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { QuantityStepperInput } from '../quantity/QuantityStepperInput'
import {
  formatQuantity,
  formatQuantityInput,
  normalizeQuantityPrecision,
  parseQuantityInput,
  QUANTITY_INPUT_ERROR,
} from '../quantity/quantity'
import { adjustPurchasedShoppingQuantity } from './shoppingMutations'
import type { ShoppingItem } from './types'

type ShoppingPurchaseSheetProps = {
  ownerId: string
  item: ShoppingItem
  onClose: () => void
  onSaved: () => void
}

export function ShoppingPurchaseSheet({
  ownerId,
  item,
  onClose,
  onSaved,
}: ShoppingPurchaseSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [quantity, setQuantity] = useState(() => formatQuantityInput(item.quantity))
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const parsedQuantity = parseQuantityInput(quantity)
  const difference = parsedQuantity
    ? normalizeQuantityPrecision(item.quantity - parsedQuantity)
    : null

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let focusTimer: number | undefined
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      focusTimer = window.setTimeout(() => inputRef.current?.focus(), 20)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, saving])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = parseQuantityInput(quantity)
    if (!parsed) {
      setErrorMessage(QUANTITY_INPUT_ERROR)
      return
    }

    setSaving(true)
    setErrorMessage('')
    try {
      await adjustPurchasedShoppingQuantity({
        ownerId,
        itemId: item.id,
        quantity: parsed,
      })
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zmienić kupionej ilości.')
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section
        className="inventory-sheet shopping-purchase-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopping-purchase-title"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Kupione</p>
            <h2 id="shopping-purchase-title">Zmień kupioną ilość</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </header>

        <div className="shopping-purchase-summary">
          <strong>{item.name}</strong>
          <span>Aktualnie kupiono: {formatQuantity(item.quantity)} {item.unitSymbol}</span>
        </div>

        <form className="inventory-form shopping-purchase-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="shopping-purchased-quantity">Kupiona ilość</label>
            <QuantityStepperInput
              inputRef={inputRef}
              inputId="shopping-purchased-quantity"
              value={quantity}
              onChange={(nextQuantity) => {
                setQuantity(nextQuantity)
                setErrorMessage('')
              }}
              suffix={item.unitSymbol}
              disabled={saving}
              ariaLabel={`Kupiona ilość ${item.name} w ${item.unitSymbol}`}
            />
          </div>

          {difference !== null && difference > 0 && (
            <div className="shopping-purchase-remaining">
              <KitchenIcon name="shopping" size={17} />
              <span>Do „Do kupienia” wróci: {formatQuantity(difference)} {item.unitSymbol}</span>
            </div>
          )}

          {difference !== null && difference < 0 && (
            <div className="shopping-purchase-remaining">
              <KitchenIcon name="plus" size={17} />
              <span>
                Kupiona ilość wzrośnie o {formatQuantity(Math.abs(difference))} {item.unitSymbol}. Pozostała ilość z „Do kupienia” zostanie wykorzystana w pierwszej kolejności, a nadwyżka również zostanie zapisana jako kupiona.
              </span>
            </div>
          )}

          {difference === 0 && (
            <div className="shopping-purchase-remaining is-complete">
              <KitchenIcon name="check" size={17} />
              <span>Kupiona ilość pozostaje bez zmian.</span>
            </div>
          )}

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
              Anuluj
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Zapisuję…' : 'Zapisz'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
