import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { InventoryConsumeSheet } from './InventoryConsumeSheet'
import { getExpiryMeta } from './expiry'
import { InventoryEditor } from './InventoryEditor'
import { loadInventoryReadModel } from './inventoryReadModel'
import type { InventoryLocation, InventoryLocationGroup, InventoryLot, InventoryReadModel, StorageLocationKind } from './types'

type InventoryPageProps = {
  ownerId: string
  createRequestToken?: number
  onCreateRequestHandled?: (requestToken: number) => void
  overviewRequestToken?: number
}

type LoadState =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: InventoryReadModel }
  | { status: 'error'; model: null }

type EditorState =
  | { kind: 'create'; initialLocationId?: string }
  | { kind: 'edit'; lot: InventoryLot }
  | null

function formatQuantity(value: number) {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 }).format(value)
}

function locationIcon(kind: StorageLocationKind) {
  if (kind === 'fridge') return 'fridge' as const
  if (kind === 'freezer') return 'freezer' as const
  if (kind === 'pantry') return 'pantry' as const
  return 'inventory' as const
}

function polishCount(value: number, one: string, few: string, many: string) {
  if (value === 1) return `${value} ${one}`
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${value} ${few}`
  return `${value} ${many}`
}

function pluralizeLots(value: number) {
  return polishCount(value, 'partia', 'partie', 'partii')
}

function pluralizeProducts(value: number) {
  return polishCount(value, 'produkt', 'produkty', 'produktów')
}

function uniqueProductCount(lots: InventoryLot[]) {
  return new Set(lots.map((lot) => lot.productId)).size
}

function locationStockLabel(lots: InventoryLot[]) {
  if (lots.length === 0) return 'Pusto'
  const products = uniqueProductCount(lots)
  return lots.length > products
    ? `${pluralizeProducts(products)} · ${pluralizeLots(lots.length)}`
    : pluralizeProducts(products)
}

function locationPreview(lots: InventoryLot[]) {
  if (lots.length === 0) return 'Pusto'
  const names = Array.from(new Set(lots.map((lot) => lot.productName)))
  const visible = names.slice(0, 2)
  const remaining = names.length - visible.length
  return `${visible.join(', ')}${remaining > 0 ? ` +${remaining}` : ''}`
}

function InventoryOverview({
  model,
  onOpenLocation,
  onAdd,
}: {
  model: InventoryReadModel
  onOpenLocation: (locationId: string) => void
  onAdd: () => void
}) {
  return (
    <>
      {model.totalLots === 0 && (
        <div className="inventory-overview-empty">
          <div className="inventory-empty-icon" aria-hidden="true"><KitchenIcon name="inventory" size={24} /></div>
          <div>
            <strong>Zapasy są jeszcze puste</strong>
            <span>Dodaj pierwszy produkt i wybierz, gdzie go przechowujesz.</span>
          </div>
          <button className="primary-button" type="button" onClick={onAdd}>
            <KitchenIcon name="plus" size={19} /> Dodaj produkt
          </button>
        </div>
      )}

      <div className="inventory-location-grid" aria-label="Miejsca przechowywania">
        {model.groups.map((group) => (
          <button
            className={`inventory-location-entry location-entry-${group.location.kind}`}
            type="button"
            key={group.location.id}
            onClick={() => onOpenLocation(group.location.id)}
          >
            <span className={`location-mark location-mark-${group.location.kind}`} aria-hidden="true">
              <KitchenIcon name={locationIcon(group.location.kind)} size={22} />
            </span>
            <span className="location-entry-copy">
              <strong>{group.location.name}</strong>
              <span>{locationPreview(group.lots)}</span>
            </span>
            <span className="location-entry-end">
              <span className="location-count-badge">{uniqueProductCount(group.lots)}</span>
              <KitchenIcon name="chevronRight" size={18} />
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

function InventoryLocationView({
  group,
  searchQuery,
  onSearchChange,
  onBack,
  onAdd,
  onEdit,
}: {
  group: InventoryLocationGroup
  searchQuery: string
  onSearchChange: (value: string) => void
  onBack: () => void
  onAdd: () => void
  onEdit: (lot: InventoryLot) => void
}) {
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pl')
  const visibleLots = normalizedSearch
    ? group.lots.filter((lot) => lot.productName.toLocaleLowerCase('pl').includes(normalizedSearch))
    : group.lots
  const shouldShowSearch = group.lots.length >= 8

  return (
    <section className="inventory-location-page" aria-labelledby="inventory-location-title">
      <button className="inventory-back-button" type="button" onClick={onBack}>
        <KitchenIcon name="chevronLeft" size={18} />
        Zapasy
      </button>

      <div className="inventory-location-hero">
        <div className={`location-mark location-mark-${group.location.kind}`} aria-hidden="true">
          <KitchenIcon name={locationIcon(group.location.kind)} size={23} />
        </div>
        <div>
          <h1 id="inventory-location-title">{group.location.name}</h1>
          <p>{locationStockLabel(group.lots)}</p>
        </div>
        <button className="primary-icon-button" type="button" onClick={onAdd} aria-label={`Dodaj produkt do: ${group.location.name}`} title="Dodaj produkt">
          <KitchenIcon name="plus" />
        </button>
      </div>

      {shouldShowSearch && (
        <label className="inventory-search inventory-location-search">
          <span className="sr-only">Szukaj produktu w: {group.location.name}</span>
          <KitchenIcon name="search" size={19} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Szukaj w: ${group.location.name}`}
            autoComplete="off"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange('')} aria-label="Wyczyść wyszukiwanie">
              <KitchenIcon name="close" size={17} />
            </button>
          )}
        </label>
      )}

      {group.lots.length === 0 ? (
        <div className="inventory-location-empty">
          <strong>Nic tu jeszcze nie ma</strong>
          <span>Dodaj pierwszy produkt bezpośrednio do tego miejsca.</span>
          <button className="primary-button" type="button" onClick={onAdd}>
            <KitchenIcon name="plus" size={18} /> Dodaj produkt
          </button>
        </div>
      ) : visibleLots.length === 0 ? (
        <div className="inventory-search-empty" role="status">
          <strong>Brak wyników</strong>
          <span>Spróbuj innej nazwy produktu.</span>
        </div>
      ) : (
        <div className="inventory-location-list-card">
          <ul className="inventory-list">
            {visibleLots.map((lot) => (
              <li key={lot.id}>
                <button className="inventory-row inventory-row-action" type="button" onClick={() => onEdit(lot)}>
                  <div className="inventory-product-copy">
                    <strong>{lot.productName}</strong>
                    {lot.expiryDate && (() => {
                      const expiry = getExpiryMeta(lot.expiryDate)
                      const label = expiry.tone === 'later' ? expiry.label : `${expiry.label} · ${expiry.exactLabel}`
                      return (
                        <span className={`expiry-status expiry-${expiry.tone}`} title={`Termin ważności: ${expiry.exactLabel}`}>
                          <KitchenIcon name="calendar" size={13} />
                          {label}
                        </span>
                      )
                    })()}
                  </div>
                  <span className="inventory-row-end">
                    <span className="quantity-pill">{formatQuantity(lot.quantity)} {lot.unitSymbol}</span>
                    <KitchenIcon name="edit" size={17} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export function InventoryPage({
  ownerId,
  createRequestToken = 0,
  onCreateRequestHandled,
  overviewRequestToken = 0,
}: InventoryPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', model: null })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [editor, setEditor] = useState<EditorState>(null)
  const [consumeLot, setConsumeLot] = useState<InventoryLot | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const handledCreateRequest = useRef(0)
  const handledOverviewRequest = useRef(0)

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
      setSelectedLocationId(null)
      setSearchQuery('')
      setEditor({ kind: 'create' })
      onCreateRequestHandled?.(createRequestToken)
    }
  }, [createRequestToken, loadState.status, onCreateRequestHandled])

  useEffect(() => {
    if (overviewRequestToken > 0 && overviewRequestToken !== handledOverviewRequest.current) {
      handledOverviewRequest.current = overviewRequestToken
      setSelectedLocationId(null)
      setSearchQuery('')
    }
  }, [overviewRequestToken])

  useEffect(() => {
    if (loadState.status !== 'ready' || !selectedLocationId) return
    if (!loadState.model.locations.some((location) => location.id === selectedLocationId)) {
      setSelectedLocationId(null)
      setSearchQuery('')
    }
  }, [loadState, selectedLocationId])

  function handleSaved() {
    setEditor(null)
    setConsumeLot(null)
    reload()
  }

  function openConsume(lot: InventoryLot) {
    setEditor(null)
    setConsumeLot(lot)
  }

  function openLocation(locationId: string) {
    setSelectedLocationId(locationId)
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeLocation() {
    setSelectedLocationId(null)
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectedGroup = useMemo(() => {
    if (loadState.status !== 'ready' || !selectedLocationId) return null
    return loadState.model.groups.find((group) => group.location.id === selectedLocationId) ?? null
  }, [loadState, selectedLocationId])

  return (
    <section className="inventory-page" aria-labelledby={selectedGroup ? undefined : 'inventory-title'}>
      {!selectedGroup && (
        <div className="page-heading-row inventory-page-heading">
          <div>
            <h1 id="inventory-title">Zapasy</h1>
            {loadState.status === 'ready' && (
              <p className="page-intro">Wybierz miejsce, żeby zobaczyć jego zawartość.</p>
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

      {loadState.status === 'ready' && !selectedGroup && (
        <InventoryOverview
          model={loadState.model}
          onOpenLocation={openLocation}
          onAdd={() => setEditor({ kind: 'create' })}
        />
      )}

      {loadState.status === 'ready' && selectedGroup && (
        <InventoryLocationView
          group={selectedGroup}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onBack={closeLocation}
          onAdd={() => setEditor({ kind: 'create', initialLocationId: selectedGroup.location.id })}
          onEdit={(lot) => setEditor({ kind: 'edit', lot })}
        />
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
