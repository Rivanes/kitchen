import { FormEvent, useEffect, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { updateCanonicalProductSettings } from '../products/productCatalogMutations'
import { formatQuantityInput, parseQuantityInput } from '../quantity/quantity'
import { toUserErrorMessage } from '../../lib/userError'
import type { InventoryResource } from './types'

type HouseholdMinimumSheetProps = {
  ownerId: string
  resource: InventoryResource
  onClose: () => void
  onSaved: () => void
}

export function HouseholdMinimumSheet({ ownerId, resource, onClose, onSaved }: HouseholdMinimumSheetProps) {
  const [minimum, setMinimum] = useState(
    resource.product.minimumStockQuantity === null
      ? ''
      : formatQuantityInput(resource.product.minimumStockQuantity),
  )
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const parsed = minimum.trim() ? parseQuantityInput(minimum) : null
    if (minimum.trim() && !parsed) {
      setErrorMessage('Podaj prawidłowy minimalny zapas albo pozostaw pole puste.')
      return
    }

    setSaving(true)
    setErrorMessage('')
    try {
      await updateCanonicalProductSettings({
        ownerId,
        productId: resource.product.id,
        nextName: resource.product.name,
        packageContentValue: resource.product.packageContentValue,
        packageContentUnitCode: resource.product.packageContentUnitCode,
        minimumStockQuantity: parsed,
      })
      onSaved()
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error, 'Nie udało się zapisać minimalnego zapasu.'))
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <section className="inventory-sheet household-minimum-sheet" role="dialog" aria-modal="true" aria-labelledby="household-minimum-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <p className="eyebrow">{resource.product.name}</p>
            <h2 id="household-minimum-title">Minimalny zapas</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Zamknij">
            <KitchenIcon name="close" />
          </button>
        </header>

        <form className="inventory-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="household-minimum-stock">
            <span>Ilość</span>
            <div className="household-minimum-input-row">
              <input
                id="household-minimum-stock"
                type="text"
                inputMode="decimal"
                value={minimum}
                onChange={(event) => {
                  setMinimum(event.target.value)
                  setErrorMessage('')
                }}
                placeholder="Nie ustawiono"
                disabled={saving}
              />
              <span>{resource.unitSymbol}</span>
              {minimum && (
                <button
                  className="date-clear-button"
                  type="button"
                  onClick={() => setMinimum('')}
                  disabled={saving}
                  aria-label="Usuń minimalny zapas"
                >
                  <KitchenIcon name="close" size={17} />
                </button>
              )}
            </div>
          </label>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Anuluj</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Zapisuję…' : 'Zapisz'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
