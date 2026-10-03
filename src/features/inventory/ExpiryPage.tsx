import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { formatQuantity } from '../quantity/quantity'
import { getInventoryExpiryMeta } from './expiry'
import { InventoryConsumeSheet } from './InventoryConsumeSheet'
import { InventoryEditor } from './InventoryEditor'
import { useInventoryShoppingBridge } from './InventoryShoppingBridge'
import { loadInventoryReadModel } from './inventoryReadModel'
import type { InventoryLot, InventoryReadModel } from './types'

type ExpiryPageProps = {
  ownerId: string
  onBack: () => void
}

type LoadState =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: InventoryReadModel }
  | { status: 'error'; model: null }

type ExpiryFilter = 'all' | 'with-date' | 'without-date'


function filterLabel(filter: ExpiryFilter) {
  if (filter === 'with-date') return 'Z terminem'
  if (filter === 'without-date') return 'Bez terminu'
  return 'Wszystkie'
}

function expiryPriority(lot: InventoryLot) {
  const meta = getInventoryExpiryMeta(lot.expiryDate, lot.openedUseByDate)
  if (meta.tone === 'critical') return 0
  if (!lot.expiryDate) return 1
  if (meta.tone === 'warning') return 2
  if (meta.tone === 'good') return 3
  return 4
}

export function ExpiryPage({ ownerId, onBack }: ExpiryPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', model: null })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [filter, setFilter] = useState<ExpiryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editLot, setEditLot] = useState<InventoryLot | null>(null)
  const [consumeLot, setConsumeLot] = useState<InventoryLot | null>(null)

  const reload = useCallback(() => {
    setLoadState({ status: 'loading', model: null })
    setReloadVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    let active = true

    loadInventoryReadModel(ownerId)
      .then((model) => {
        if (active) setLoadState({ status: 'ready', model })
      })
      .catch((error: unknown) => {
        console.error('Kitchen expiry center read failed.', error)
        if (active) setLoadState({ status: 'error', model: null })
      })

    return () => {
      active = false
    }
  }, [ownerId, reloadVersion])

  const allLots = useMemo(() => {
    if (loadState.status !== 'ready') return []
    return loadState.model.groups.flatMap((group) => group.lots)
  }, [loadState])

  const locationNames = useMemo(() => {
    if (loadState.status !== 'ready') return new Map<string, string>()
    return new Map(loadState.model.locations.map((location) => [location.id, location.name]))
  }, [loadState])

  const visibleLots = useMemo(() => {
    const normalizedSearch = allLots.length >= 10 ? searchQuery.trim().toLocaleLowerCase('pl') : ''
    const filtered = allLots.filter((lot) => {
      const matchesFilter = filter === 'with-date'
        ? lot.expiryDate !== null
        : filter === 'without-date'
          ? lot.expiryDate === null
          : true

      if (!matchesFilter) return false
      if (!normalizedSearch) return true

      const locationName = locationNames.get(lot.storageLocationId) ?? ''
      return lot.productName.toLocaleLowerCase('pl').includes(normalizedSearch)
        || locationName.toLocaleLowerCase('pl').includes(normalizedSearch)
    })

    return [...filtered].sort((a, b) => {
      const priority = expiryPriority(a) - expiryPriority(b)
      if (priority !== 0) return priority

      const aMeta = getInventoryExpiryMeta(a.expiryDate, a.openedUseByDate)
      const bMeta = getInventoryExpiryMeta(b.expiryDate, b.openedUseByDate)
      const aDays = aMeta.daysUntil ?? Number.POSITIVE_INFINITY
      const bDays = bMeta.daysUntil ?? Number.POSITIVE_INFINITY
      if (aDays !== bDays) return aDays - bDays

      return a.productName.localeCompare(b.productName, 'pl', { sensitivity: 'base' })
    })
  }, [allLots, filter, locationNames, searchQuery])

  const counts = useMemo(() => {
    let critical = 0
    let warning = 0
    let missing = 0

    for (const lot of allLots) {
      const meta = getInventoryExpiryMeta(lot.expiryDate, lot.openedUseByDate)
      if (meta.tone === 'critical') critical += 1
      if (meta.tone === 'warning') warning += 1
      if (!lot.expiryDate) missing += 1
    }

    return { critical, warning, missing }
  }, [allLots])

  function handleSaved() {
    setEditLot(null)
    setConsumeLot(null)
    reload()
  }

  const inventoryShopping = useInventoryShoppingBridge({
    ownerId,
    catalog: loadState.status === 'ready'
      ? { products: loadState.model.products, units: loadState.model.units }
      : null,
    onInventoryChanged: reload,
  })

  return (
    <section className="expiry-page" aria-labelledby="expiry-page-title">
      <button className="inventory-back-button" type="button" onClick={onBack}>
        <KitchenIcon name="chevronLeft" size={18} />
        Start
      </button>

      <div className="page-heading-row expiry-page-heading">
        <div>
          <p className="eyebrow">Terminy</p>
          <h1 id="expiry-page-title">Terminy ważności</h1>
        </div>
        <button className="icon-button icon-button-quiet" type="button" onClick={reload} disabled={loadState.status === 'loading'} aria-label="Odśwież terminy" title="Odśwież">
          <KitchenIcon name="refresh" />
        </button>
      </div>

      {loadState.status === 'loading' && (
        <div className="inventory-state-card" aria-live="polite">
          <div className="loading-dot" aria-hidden="true" />
          <div><strong>Pobieram terminy…</strong></div>
        </div>
      )}

      {loadState.status === 'error' && (
        <div className="inventory-state-card inventory-state-error" role="alert">
          <div className="inventory-state-icon" aria-hidden="true">!</div>
          <div>
            <strong>Nie udało się pobrać terminów</strong>
            <button className="secondary-button compact-button" type="button" onClick={reload}>Spróbuj ponownie</button>
          </div>
        </div>
      )}

      {loadState.status === 'ready' && (
        <>
          {allLots.length > 0 && (
            <>
              <div className="expiry-quick-summary" aria-label="Podsumowanie terminów">
                {counts.critical > 0 && <span className="expiry-summary-critical">{counts.critical} pilne</span>}
                {counts.warning > 0 && <span className="expiry-summary-warning">{counts.warning} wkrótce</span>}
                {counts.missing > 0 && <span className="expiry-summary-missing">{counts.missing} bez terminu</span>}
                {counts.critical === 0 && counts.warning === 0 && counts.missing === 0 && (
                  <span className="expiry-summary-good">Wszystko w porządku</span>
                )}
              </div>

              <div className="expiry-filter" role="group" aria-label="Filtr terminów ważności">
                {(['all', 'with-date', 'without-date'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={filter === value ? 'is-active' : ''}
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                  >
                    {filterLabel(value)}
                  </button>
                ))}
              </div>

              {allLots.length >= 10 && (
                <label className="inventory-search expiry-search">
                  <span className="sr-only">Szukaj produktu lub miejsca w terminach</span>
                  <KitchenIcon name="search" size={19} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Szukaj produktu lub miejsca"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} aria-label="Wyczyść wyszukiwanie">
                      <KitchenIcon name="close" size={17} />
                    </button>
                  )}
                </label>
              )}
            </>
          )}

          {allLots.length === 0 ? (
            <div className="inventory-location-empty">
              <strong>Brak produktów do sprawdzenia</strong>
              <span>Terminy pojawią się tutaj razem z zapasami.</span>
            </div>
          ) : visibleLots.length === 0 ? (
            <div className="inventory-search-empty" role="status">
              <strong>Brak pasujących produktów</strong>
              <span>Zmień filtr albo wyszukiwane hasło.</span>
            </div>
          ) : (
            <div className="expiry-list-card">
              <ul className="expiry-list">
                {visibleLots.map((lot) => {
                  const meta = getInventoryExpiryMeta(lot.expiryDate, lot.openedUseByDate)
                  const openedEffective = meta.effectiveSource === 'opened'
                  return (
                    <li key={lot.id}>
                      <button className="expiry-row" type="button" onClick={() => setEditLot(lot)}>
                        <span className={`expiry-dot expiry-dot-${meta.tone}`} aria-hidden="true" />
                        <span className="expiry-row-copy">
                          <strong>{lot.productName}</strong>
                          <span>{locationNames.get(lot.storageLocationId) ?? 'Zapasy'} · {formatQuantity(lot.quantity)} {lot.unitSymbol}</span>
                          {lot.openedAt && <small>Otwarty{openedEffective ? ' · termin po otwarciu' : ''}</small>}
                        </span>
                        <span className="expiry-row-status">
                          <span className={`expiry-status expiry-${meta.tone}`}>{meta.label}</span>
                          <small>{lot.expiryDate ? meta.exactLabel : 'Termin: nie podano'}</small>
                        </span>
                        <KitchenIcon name="chevronRight" size={17} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {editLot && (
            <InventoryEditor
              ownerId={ownerId}
              model={loadState.model}
              mode={{ kind: 'edit', lot: editLot }}
              onClose={() => setEditLot(null)}
              onSaved={handleSaved}
              onConsumeRequested={(lot) => {
                setEditLot(null)
                setConsumeLot(lot)
              }}
            />
          )}

          {consumeLot && (
            <InventoryConsumeSheet
              ownerId={ownerId}
              lot={consumeLot}
              onClose={() => setConsumeLot(null)}
              onConsumed={(result) => {
                setConsumeLot(null)
                inventoryShopping.handleConsumed(consumeLot, result)
              }}
            />
          )}
        </>
      )}

      {inventoryShopping.bridgeUi}
    </section>
  )
}
