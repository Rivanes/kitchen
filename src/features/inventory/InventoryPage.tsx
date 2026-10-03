import { useCallback, useEffect, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { loadInventoryReadModel } from './inventoryReadModel'
import type { InventoryLocation, InventoryReadModel, StorageLocationKind } from './types'

type InventoryPageProps = {
  ownerId: string
}

type LoadState =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: InventoryReadModel }
  | { status: 'error'; model: null }

function formatQuantity(value: number) {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 }).format(value)
}

function formatExpiryDate(value: string) {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}

function locationIcon(kind: StorageLocationKind) {
  if (kind === 'fridge') return 'fridge' as const
  if (kind === 'freezer') return 'freezer' as const
  if (kind === 'pantry') return 'pantry' as const
  return 'inventory' as const
}

function LocationHeading({ location, count, headingId }: { location: InventoryLocation; count: number; headingId: string }) {
  return (
    <div className="inventory-location-heading">
      <div className={`location-mark location-mark-${location.kind}`} aria-hidden="true">
        <KitchenIcon name={locationIcon(location.kind)} size={21} />
      </div>
      <div className="inventory-location-copy">
        <h2 id={headingId}>{location.name}</h2>
        <p>{count === 0 ? 'Brak produktów' : `${count} ${count === 1 ? 'pozycja' : 'pozycji'}`}</p>
      </div>
    </div>
  )
}

export function InventoryPage({ ownerId }: InventoryPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', model: null })
  const [reloadVersion, setReloadVersion] = useState(0)

  const reload = useCallback(() => {
    setLoadState({ status: 'loading', model: null })
    setReloadVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    let active = true

    loadInventoryReadModel(ownerId)
      .then((model) => {
        if (!active) return
        setLoadState({ status: 'ready', model })
      })
      .catch((error: unknown) => {
        console.error('Kitchen inventory read failed.', error)
        if (!active) return
        setLoadState({ status: 'error', model: null })
      })

    return () => {
      active = false
    }
  }, [ownerId, reloadVersion])

  return (
    <section className="inventory-page" aria-labelledby="inventory-title">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Zapasy</p>
          <h1 id="inventory-title">Co masz w domu</h1>
          <p className="page-intro">Lodówka, zamrażarka i szafki w jednym miejscu.</p>
        </div>
        <button className="icon-button" type="button" onClick={reload} disabled={loadState.status === 'loading'} aria-label="Odśwież zapasy" title="Odśwież zapasy">
          <KitchenIcon name="refresh" />
        </button>
      </div>

      {loadState.status === 'loading' && (
        <div className="inventory-state-card" aria-live="polite">
          <div className="loading-dot" aria-hidden="true" />
          <div>
            <strong>Pobieram zapasy…</strong>
            <p>Chwilę, sprawdzam aktualny stan Kitchen.</p>
          </div>
        </div>
      )}

      {loadState.status === 'error' && (
        <div className="inventory-state-card inventory-state-error" role="alert">
          <div className="inventory-state-icon" aria-hidden="true">!</div>
          <div>
            <strong>Nie udało się pobrać zapasów</strong>
            <p>Sprawdź połączenie i spróbuj ponownie.</p>
            <button className="secondary-button compact-button" type="button" onClick={reload}>Spróbuj ponownie</button>
          </div>
        </div>
      )}

      {loadState.status === 'ready' && (
        <>
          <div className="inventory-summary" aria-label="Podsumowanie zapasów">
            <div className="summary-cell">
              <strong>{loadState.model.stockedProducts}</strong>
              <span>produktów</span>
            </div>
            <div className="summary-cell">
              <strong>{loadState.model.totalLots}</strong>
              <span>pozycji</span>
            </div>
            <div className="summary-cell">
              <strong>{loadState.model.occupiedLocations}</strong>
              <span>lokalizacji</span>
            </div>
          </div>

          {loadState.model.totalLots === 0 && (
            <div className="inventory-empty-callout">
              <div className="inventory-empty-icon" aria-hidden="true"><KitchenIcon name="inventory" size={24} /></div>
              <div>
                <strong>Zapasy są jeszcze puste</strong>
                <p>Na razie nie ma tu żadnych produktów. W kolejnym kroku dodamy szybkie wprowadzanie zapasów.</p>
              </div>
            </div>
          )}

          <div className="inventory-groups">
            {loadState.model.groups.map((group) => (
              <section className="inventory-location-card" key={group.location.id} aria-labelledby={`location-${group.location.id}`}>
                <LocationHeading location={group.location} count={group.lots.length} headingId={`location-${group.location.id}`} />

                {group.lots.length === 0 ? (
                  <p className="location-empty">Nic tutaj jeszcze nie ma.</p>
                ) : (
                  <ul className="inventory-list">
                    {group.lots.map((lot) => (
                      <li className="inventory-row" key={lot.id}>
                        <div className="inventory-product-copy">
                          <strong>{lot.productName}</strong>
                          {lot.expiryDate && <span>Termin: {formatExpiryDate(lot.expiryDate)}</span>}
                        </div>
                        <span className="quantity-pill">{formatQuantity(lot.quantity)} {lot.unitSymbol}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
