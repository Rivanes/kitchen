import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { InventoryConsumeSheet } from './InventoryConsumeSheet'
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

function LocationHeading({
  location,
  count,
  expanded,
}: {
  location: InventoryLocation
  count: number
  expanded: boolean
}) {
  return (
    <>
      <div className={`location-mark location-mark-${location.kind}`} aria-hidden="true">
        <KitchenIcon name={locationIcon(location.kind)} size={21} />
      </div>
      <div className="inventory-location-copy">
        <h2>{location.name}</h2>
        <p>{count === 0 ? 'Pusto' : `${count} ${count === 1 ? 'pozycja' : 'pozycje'}`}</p>
      </div>
      <span className="inventory-location-toggle-end">
        {count > 0 && <span className="location-count-badge">{count}</span>}
        {count > 0 && <KitchenIcon name="chevronDown" size={19} />}
      </span>
      <span className="sr-only">{expanded ? 'Zwiń' : 'Rozwiń'}</span>
    </>
  )
}

export function InventoryPage({ ownerId, createRequestToken = 0 }: InventoryPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', model: null })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [editor, setEditor] = useState<EditorState>(null)
  const [consumeLot, setConsumeLot] = useState<InventoryLot | null>(null)
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(() => new Set())
  const [searchQuery, setSearchQuery] = useState('')
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
    setConsumeLot(null)
    reload()
  }

  function openConsume(lot: InventoryLot) {
    setEditor(null)
    setConsumeLot(lot)
  }

  function toggleLocation(locationId: string, count: number) {
    if (count === 0) return
    setExpandedLocations((current) => {
      const next = new Set(current)
      if (next.has(locationId)) next.delete(locationId)
      else next.add(locationId)
      return next
    })
  }

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pl')

  const visibleGroups = useMemo(() => {
    if (loadState.status !== 'ready') return []
    if (!normalizedSearch) return loadState.model.groups

    return loadState.model.groups
      .map((group) => ({
        ...group,
        lots: group.lots.filter((lot) => lot.productName.toLocaleLowerCase('pl').includes(normalizedSearch)),
      }))
      .filter((group) => group.lots.length > 0)
  }, [loadState, normalizedSearch])

  const shouldShowSearch = loadState.status === 'ready' && loadState.model.totalLots >= 8
  const searchHasNoResults = normalizedSearch.length > 0 && visibleGroups.length === 0

  return (
    <section className="inventory-page" aria-labelledby="inventory-title">
      <div className="page-heading-row inventory-page-heading">
        <div>
          <h1 id="inventory-title">Zapasy</h1>
          {loadState.status === 'ready' && loadState.model.totalLots > 0 && (
            <p className="page-intro">{loadState.model.stockedProducts} {loadState.model.stockedProducts === 1 ? 'produkt' : 'produkty'} · {loadState.model.totalLots} {loadState.model.totalLots === 1 ? 'pozycja' : 'pozycje'}</p>
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

      {shouldShowSearch && (
        <label className="inventory-search">
          <span className="sr-only">Szukaj produktu w zapasach</span>
          <KitchenIcon name="search" size={19} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Szukaj produktu"
            autoComplete="off"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Wyczyść wyszukiwanie">
              <KitchenIcon name="close" size={17} />
            </button>
          )}
        </label>
      )}

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
          <strong>Zapasy są puste</strong>
          <button className="primary-button" type="button" onClick={() => setEditor({ kind: 'create' })}>
            <KitchenIcon name="plus" size={19} /> Dodaj produkt
          </button>
        </div>
      )}

      {loadState.status === 'ready' && searchHasNoResults && (
        <div className="inventory-search-empty" role="status">
          <strong>Brak wyników</strong>
          <span>Spróbuj innej nazwy produktu.</span>
        </div>
      )}

      {loadState.status === 'ready' && !searchHasNoResults && (
        <div className="inventory-groups">
          {visibleGroups.map((group) => {
            const forcedExpanded = normalizedSearch.length > 0 && group.lots.length > 0
            const expanded = forcedExpanded || expandedLocations.has(group.location.id)
            const headingId = `location-${group.location.id}`
            const panelId = `location-panel-${group.location.id}`

            return (
              <section className={`inventory-location-card${expanded ? ' is-expanded' : ''}`} key={group.location.id} aria-labelledby={headingId}>
                <button
                  className="inventory-location-heading inventory-location-button"
                  type="button"
                  onClick={() => toggleLocation(group.location.id, group.lots.length)}
                  aria-expanded={group.lots.length > 0 ? expanded : undefined}
                  aria-controls={group.lots.length > 0 ? panelId : undefined}
                  disabled={group.lots.length === 0}
                >
                  <span id={headingId} className="sr-only">{group.location.name}</span>
                  <LocationHeading location={group.location} count={group.lots.length} expanded={expanded} />
                </button>

                {expanded && group.lots.length > 0 && (
                  <ul className="inventory-list" id={panelId}>
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
                )}
              </section>
            )
          })}
        </div>
      )}

      {loadState.status === 'ready' && editor && (
        <InventoryEditor
          ownerId={ownerId}
          model={loadState.model}
          mode={editor}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
          onConsumeRequested={openConsume}
        />
      )}

      {loadState.status === 'ready' && consumeLot && (
        <InventoryConsumeSheet
          ownerId={ownerId}
          lot={consumeLot}
          onClose={() => setConsumeLot(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}
