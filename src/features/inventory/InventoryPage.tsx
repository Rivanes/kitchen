import { useCallback, useEffect, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { InventoryEditor } from './InventoryEditor'
import { loadInventoryReadModel } from './inventoryReadModel'
import type { InventoryLocation, InventoryLot, InventoryReadModel, StorageLocationKind } from './types'

type InventoryPageProps = {
  ownerId: string
  createRequestToken?: number
}

type LoadState =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: InventoryReadModel }
  | { status: 'error'; model: null }

type EditorState =
  | { kind: 'create' }
  | { kind: 'edit'; lot: InventoryLot }
  | null

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
        <p>{count} {count === 1 ? 'pozycja' : 'pozycji'}</p>
      </div>
    </div>
  )
}

export function InventoryPage({ ownerId, createRequestToken = 0 }: InventoryPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', model: null })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [editor, setEditor] = useState<EditorState>(null)
  const handledCreateRequest = useRef(0)

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

  useEffect(() => {
    if (
      createRequestToken > 0 &&
      createRequestToken !== handledCreateRequest.current &&
      loadState.status === 'ready'
    ) {
      handledCreateRequest.current = createRequestToken
      setEditor({ kind: 'create' })
    }
  }, [createRequestToken, loadState.status])

  function handleSaved() {
    setEditor(null)
    reload()
  }

  const occupiedGroups = loadState.status === 'ready'
    ? loadState.model.groups.filter((group) => group.lots.length > 0)
    : []

  return (
    <section className="inventory-page" aria-labelledby="inventory-title">
      <div className="page-heading-row inventory-page-heading">
        <div>
          <h1 id="inventory-title">Zapasy</h1>
          {loadState.status === 'ready' && loadState.model.totalLots > 0 && (
            <p className="page-intro">{loadState.model.stockedProducts} {loadState.model.stockedProducts === 1 ? 'produkt' : 'produktów'} · {loadState.model.totalLots} {loadState.model.totalLots === 1 ? 'pozycja' : 'pozycji'}</p>
          )}
        </div>
        <div className="page-actions">
          <button className="icon-button icon-button-quiet" type="button" onClick={reload} disabled={loadState.status === 'loading'} aria-label="Odśwież zapasy" title="Odśwież zapasy">
            <KitchenIcon name="refresh" />
          </button>
          <button className="primary-icon-button" type="button" onClick={() => setEditor({ kind: 'create' })} disabled={loadState.status !== 'ready'} aria-label="Dodaj produkt" title="Dodaj produkt">
            <KitchenIcon name="plus" />
          </button>
        </div>
      </div>

      {loadState.status === 'loading' && (
        <div className="inventory-state-card" aria-live="polite">
          <div className="loading-dot" aria-hidden="true" />
          <div><strong>Pobieram zapasy…</strong></div>
        </div>
      )}

      {loadState.status === 'error' && (
        <div className="inventory-state-card inventory-state-error" role="alert">
          <div className="inventory-state-icon" aria-hidden="true">!</div>
          <div>
            <strong>Nie udało się pobrać zapasów</strong>
            <button className="secondary-button compact-button" type="button" onClick={reload}>Spróbuj ponownie</button>
          </div>
        </div>
      )}

      {loadState.status === 'ready' && loadState.model.totalLots === 0 && (
        <div className="inventory-empty-smart">
          <div className="inventory-empty-icon" aria-hidden="true"><KitchenIcon name="inventory" size={24} /></div>
          <strong>Dodaj pierwszy produkt</strong>
          <button className="primary-button" type="button" onClick={() => setEditor({ kind: 'create' })}>
            <KitchenIcon name="plus" size={19} /> Dodaj
          </button>
        </div>
      )}

      {loadState.status === 'ready' && loadState.model.totalLots > 0 && (
        <div className="inventory-groups">
          {occupiedGroups.map((group) => (
            <section className="inventory-location-card" key={group.location.id} aria-labelledby={`location-${group.location.id}`}>
              <LocationHeading location={group.location} count={group.lots.length} headingId={`location-${group.location.id}`} />
              <ul className="inventory-list">
                {group.lots.map((lot) => (
                  <li key={lot.id}>
                    <button className="inventory-row inventory-row-action" type="button" onClick={() => setEditor({ kind: 'edit', lot })}>
                      <div className="inventory-product-copy">
                        <strong>{lot.productName}</strong>
                        {lot.expiryDate && <span>Termin: {formatExpiryDate(lot.expiryDate)}</span>}
                      </div>
                      <span className="inventory-row-end">
                        <span className="quantity-pill">{formatQuantity(lot.quantity)} {lot.unitSymbol}</span>
                        <KitchenIcon name="edit" size={17} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {loadState.status === 'ready' && editor && (
        <InventoryEditor
          ownerId={ownerId}
          model={loadState.model}
          mode={editor}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}
