import { FormEvent, useEffect, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { consumeAllInventoryLot, consumeInventoryLot } from './inventoryMutations'
import type { InventoryLot } from './types'

type InventoryConsumeSheetProps = {
  ownerId: string
  lot: InventoryLot
  onClose: () => void
  onSaved: () => void
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 }).format(value)
}

function parseConsumeQuantity(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 999999999.999) return null
  return parsed
}

export function InventoryConsumeSheet({ ownerId, lot, onClose, onSaved }: InventoryConsumeSheetProps) {
  const [quantity, setQuantity] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20)

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

  async function consume(quantityToUse: number) {
    if (saving) return
    if (quantityToUse > lot.quantity) {
      setErrorMessage('Nie możesz zużyć więcej niż masz w zapasach.')
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      await consumeInventoryLot({
        ownerId,
        lotId: lot.id,
        quantity: quantityToUse,
      })
      onSaved()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zmienić zapasu.')
      setSaving(false)
    }
  }

  async function handleConsumeAll() {
    if (saving) return
    setSaving(true)
    setErrorMessage('')

    try {
      await consumeAllInventoryLot({ ownerId, lotId: lot.id })
      onSaved()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zużyć całego zapasu.')
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseConsumeQuantity(quantity)
    if (!parsed) {
      setErrorMessage('Podaj ilość większą od 0, maksymalnie do 3 miejsc po przecinku.')
      return
    }
    await consume(parsed)
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className="inventory-sheet inventory-consume-sheet" role="dialog" aria-modal="true" aria-labelledby="inventory-consume-title">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">Zużycie</p>
            <h2 id="inventory-consume-title">{lot.productName}</h2>
          </div>
          <button className="icon-button icon-button-quiet" type="button" onClick={onClose} disabled={saving} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </div>

        <div className="consume-current">
          <span>Masz</span>
          <strong>{formatQuantity(lot.quantity)} {lot.unitSymbol}</strong>
        </div>

        <form className="inventory-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="inventory-consume-quantity">Ile zużyto?</label>
            <div className="quantity-input-with-unit">
              <input
                ref={inputRef}
                id="inventory-consume-quantity"
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value)
                  setErrorMessage('')
                }}
                placeholder="0"
                autoComplete="off"
                disabled={saving}
              />
              <span>{lot.unitSymbol}</span>
            </div>
          </div>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <button className="consume-all-button" type="button" onClick={handleConsumeAll} disabled={saving}>
            <KitchenIcon name="minus" size={18} />
            Zużyj wszystko
          </button>

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Anuluj</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Zapisuję…' : 'Zużyj'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
