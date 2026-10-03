import { FormEvent, useEffect, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { QuantityStepperInput } from '../quantity/QuantityStepperInput'
import { formatQuantity, parseQuantityInput, QUANTITY_INPUT_ERROR } from '../quantity/quantity'
import { consumeAllInventoryLot, consumeInventoryLot } from './inventoryMutations'
import type { ConsumeInventoryResult } from './inventoryMutations'
import type { InventoryLot } from './types'

type InventoryConsumeSheetProps = {
  ownerId: string
  lot: InventoryLot
  onClose: () => void
  onConsumed: (result: ConsumeInventoryResult) => void
}


export function InventoryConsumeSheet({ ownerId, lot, onClose, onConsumed }: InventoryConsumeSheetProps) {
  const [quantity, setQuantity] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  async function consume(quantityToUse: number) {
    if (saving) return
    if (quantityToUse > lot.quantity) {
      setErrorMessage('Nie możesz zużyć więcej niż masz w zapasach.')
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      const result = await consumeInventoryLot({
        ownerId,
        lotId: lot.id,
        quantity: quantityToUse,
      })
      onConsumed(result)
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
      const result = await consumeAllInventoryLot({ ownerId, lotId: lot.id })
      onConsumed(result)
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zużyć całego zapasu.')
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseQuantityInput(quantity)
    if (!parsed) {
      setErrorMessage(QUANTITY_INPUT_ERROR)
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

        {lot.afterOpenDays && !lot.openedAt && (
          <div className="consume-open-rule">
            <KitchenIcon name="calendar" size={16} />
            <span>Po częściowym zużyciu: otwarty · {lot.afterOpenDays} dni</span>
          </div>
        )}

        {lot.openedAt && (
          <div className="consume-open-rule is-opened">
            <KitchenIcon name="check" size={16} />
            <span>Produkt jest otwarty</span>
          </div>
        )}

        <form className="inventory-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="inventory-consume-quantity">Ile zużyto?</label>
            <QuantityStepperInput
              inputRef={inputRef}
              inputId="inventory-consume-quantity"
              value={quantity}
              onChange={(nextQuantity) => {
                setQuantity(nextQuantity)
                setErrorMessage('')
              }}
              max={lot.quantity}
              suffix={lot.unitSymbol}
              placeholder="0"
              disabled={saving}
              ariaLabel={`Ilość zużyta w ${lot.unitSymbol}`}
            />
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
