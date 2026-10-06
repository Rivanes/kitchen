import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { CompactQuantityStepper } from '../quantity/CompactQuantityStepper'
import { formatQuantity } from '../quantity/quantity'
import { InventoryConsumeSheet } from './InventoryConsumeSheet'
import { getInventoryExpiryMeta } from './expiry'
import { InventoryEditor } from './InventoryEditor'
import { loadInventoryReadModel } from './inventoryReadModel'
import { adjustHouseholdStock, setSpicePresence } from './resourceMutations'
import { adjustInventoryLotQuantity } from './inventoryMutations'
import { canQuickIncrementInventoryLot, isQuickAdjustableInventoryLot } from './quickQuantity'
import { isHouseholdLowStock } from './resourcePolicy'
import { HouseholdMinimumSheet } from './HouseholdMinimumSheet'
import { useInventoryShoppingBridge } from './InventoryShoppingBridge'
import type { InventoryLocation, InventoryLocationGroup, InventoryLot, InventoryReadModel, InventoryResource, StorageLocationKind } from './types'
import { toUserErrorMessage } from '../../lib/userError'

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


function locationIcon(kind: StorageLocationKind) {
  if (kind === 'fridge') return 'fridge' as const
  if (kind === 'freezer') return 'freezer' as const
  if (kind === 'pantry') return 'pantry' as const
  if (kind === 'spices') return 'spices' as const
  if (kind === 'household') return 'household' as const
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

function groupDisplayCount(group: InventoryLocationGroup) {
  return group.resources.length > 0 ? group.resources.length : uniqueProductCount(group.lots)
}

function locationStockLabel(group: InventoryLocationGroup) {
  if (group.location.kind === 'spices') {
    const count = group.resources.length
    if (count === 0) return 'Pusto'
    return polishCount(count, 'przyprawa', 'przyprawy', 'przypraw')
  }
  if (group.location.kind === 'household') {
    const count = group.resources.length
    return count === 0 ? 'Pusto' : pluralizeProducts(count)
  }
  if (group.lots.length === 0) return 'Pusto'
  const products = uniqueProductCount(group.lots)
  return group.lots.length > products
    ? `${pluralizeProducts(products)} · ${pluralizeLots(group.lots.length)}`
    : pluralizeProducts(products)
}

function locationPreview(group: InventoryLocationGroup) {
  const names = group.resources.length > 0
    ? group.resources.map((resource) => resource.product.name)
    : Array.from(new Set(group.lots.map((lot) => lot.productName)))
  if (names.length === 0) return 'Pusto'
  const visible = names.slice(0, 2)
  const remaining = names.length - visible.length
  return `${visible.join(', ')}${remaining > 0 ? ` +${remaining}` : ''}`
}

function InventoryOverview({
  model,
  searchQuery,
  onSearchChange,
  onOpenLocation,
  onAdd,
}: {
  model: InventoryReadModel
  searchQuery: string
  onSearchChange: (value: string) => void
  onOpenLocation: (locationId: string) => void
  onAdd: () => void
}) {
  const shouldShowSearch = model.totalDisplayItems >= 8
  const normalizedSearch = shouldShowSearch ? searchQuery.trim().toLocaleLowerCase('pl') : ''
  const visibleGroups = normalizedSearch
    ? model.groups.filter((group) => (
      group.location.name.toLocaleLowerCase('pl').includes(normalizedSearch)
      || group.lots.some((lot) => lot.productName.toLocaleLowerCase('pl').includes(normalizedSearch))
      || group.resources.some((resource) => resource.product.name.toLocaleLowerCase('pl').includes(normalizedSearch))
    ))
    : model.groups

  return (
    <>
      {model.totalDisplayItems === 0 && (
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

      {shouldShowSearch && (
        <label className="inventory-search inventory-overview-search">
          <span className="sr-only">Szukaj produktu lub miejsca w zapasach</span>
          <KitchenIcon name="search" size={19} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Szukaj produktu lub miejsca"
            autoComplete="off"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange('')} aria-label="Wyczyść wyszukiwanie">
              <KitchenIcon name="close" size={17} />
            </button>
          )}
        </label>
      )}

      {normalizedSearch && visibleGroups.length === 0 ? (
        <div className="inventory-search-empty inventory-overview-search-empty" aria-live="polite">
          <strong>Nie znaleziono produktu</strong>
          <span>Spróbuj innej nazwy albo wyszukaj miejsce przechowywania.</span>
        </div>
      ) : (
        <div className="inventory-location-grid" aria-label="Miejsca przechowywania">
          {visibleGroups.map((group) => {
            const locationMatches = normalizedSearch
              ? group.location.name.toLocaleLowerCase('pl').includes(normalizedSearch)
              : false
            const matchingLots = normalizedSearch
              ? group.lots.filter((lot) => lot.productName.toLocaleLowerCase('pl').includes(normalizedSearch))
              : group.lots
            const matchingResources = normalizedSearch
              ? group.resources.filter((resource) => resource.product.name.toLocaleLowerCase('pl').includes(normalizedSearch))
              : group.resources
            const displayGroup = normalizedSearch && locationMatches && matchingLots.length === 0 && matchingResources.length === 0
              ? group
              : { ...group, lots: matchingLots, resources: matchingResources }

            return (
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
                  <span>{locationPreview(displayGroup)}</span>
                </span>
                <span className="location-entry-end">
                  <span className="location-count-badge">{groupDisplayCount(displayGroup)}</span>
                  <KitchenIcon name="chevronRight" size={18} />
                </span>
              </button>
            )
          })}
        </div>
      )}
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
  onAddToShopping,
  onToggleSpice,
  onAdjustHousehold,
  onAdjustInventoryLot,
  onEditHouseholdMinimum,
  resourceUpdatingId,
  quickUpdatingLotId,
  resourceError,
}: {
  group: InventoryLocationGroup
  searchQuery: string
  onSearchChange: (value: string) => void
  onBack: () => void
  onAdd: () => void
  onEdit: (lot: InventoryLot) => void
  onAddToShopping: (lot: InventoryLot) => void
  onToggleSpice: (resource: InventoryResource) => void
  onAdjustHousehold: (resource: InventoryResource, delta: -1 | 1) => void
  onAdjustInventoryLot: (lot: InventoryLot, delta: -1 | 1) => void
  onEditHouseholdMinimum: (resource: InventoryResource) => void
  resourceUpdatingId: string | null
  quickUpdatingLotId: string | null
  resourceError: string
}) {
  const isSpecialResourceSection = group.location.kind === 'spices' || group.location.kind === 'household'
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pl')
  const visibleLots = normalizedSearch
    ? group.lots.filter((lot) => lot.productName.toLocaleLowerCase('pl').includes(normalizedSearch))
    : group.lots
  const visibleResources = normalizedSearch
    ? group.resources.filter((resource) => resource.product.name.toLocaleLowerCase('pl').includes(normalizedSearch))
    : group.resources
  const itemCount = isSpecialResourceSection ? group.resources.length : group.lots.length
  const shouldShowSearch = itemCount >= 8

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
          <p>{locationStockLabel(group)}</p>
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

      {resourceError && <p className="form-error resource-action-error" role="alert">{resourceError}</p>}

      {itemCount === 0 ? (
        <div className="inventory-location-empty">
          <strong>Nic tu jeszcze nie ma</strong>
          <button className="primary-button" type="button" onClick={onAdd}>
            <KitchenIcon name="plus" size={18} /> Dodaj produkt
          </button>
        </div>
      ) : isSpecialResourceSection && visibleResources.length === 0 ? (
        <div className="inventory-search-empty" aria-live="polite">
          <strong>Brak wyników</strong>
          <span>Spróbuj innej nazwy produktu.</span>
        </div>
      ) : !isSpecialResourceSection && visibleLots.length === 0 ? (
        <div className="inventory-search-empty" aria-live="polite">
          <strong>Brak wyników</strong>
          <span>Spróbuj innej nazwy produktu.</span>
        </div>
      ) : group.location.kind === 'spices' ? (
        <div className="inventory-location-list-card special-resource-list-card">
          <ul className="inventory-list special-resource-list">
            {visibleResources.map((resource) => {
              const updating = resourceUpdatingId === resource.product.id
              return (
                <li key={resource.product.id}>
                  <div className="special-resource-row spice-resource-row">
                    <strong>{resource.product.name}</strong>
                    <button
                      className={`spice-presence-button ${resource.present ? 'is-present' : 'is-missing'}`}
                      type="button"
                      onClick={() => onToggleSpice(resource)}
                      disabled={updating}
                      aria-pressed={resource.present}
                      aria-label={`${resource.product.name}: ${resource.present ? 'Mam. Oznacz jako brak' : 'Brak. Oznacz jako mam'}`}
                    >
                      {updating ? '…' : resource.present ? 'Mam' : 'Brak'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : group.location.kind === 'household' ? (
        <div className="inventory-location-list-card special-resource-list-card">
          <ul className="inventory-list special-resource-list">
            {visibleResources.map((resource) => {
              const updating = resourceUpdatingId === resource.product.id
              const minimum = resource.product.minimumStockQuantity
              const low = isHouseholdLowStock(resource.quantity, minimum)
              return (
                <li key={resource.product.id}>
                  <div className={`special-resource-row household-resource-row${low ? ' is-low' : ''}`}>
                    <button
                      className="household-resource-settings"
                      type="button"
                      onClick={() => onEditHouseholdMinimum(resource)}
                      disabled={updating}
                      aria-label={`Minimalny zapas: ${resource.product.name}`}
                    >
                      <span className="household-resource-copy">
                        <strong>{resource.product.name}</strong>
                        {low && minimum !== null && (
                          <small>Minimum {formatQuantity(minimum)} {resource.unitSymbol}</small>
                        )}
                      </span>
                      <KitchenIcon name="edit" size={15} />
                    </button>
                    <CompactQuantityStepper
                      ariaLabel={`Stan: ${resource.product.name}`}
                      value={`${formatQuantity(resource.quantity)} ${resource.unitSymbol}`}
                      onDecrement={() => onAdjustHousehold(resource, -1)}
                      onIncrement={() => onAdjustHousehold(resource, 1)}
                      decrementDisabled={resource.quantity <= 0}
                      busy={updating}
                      tone={low ? 'warning' : 'default'}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="inventory-location-list-card">
          <ul className="inventory-list">
            {visibleLots.map((lot) => {
              const quickAdjustable = isQuickAdjustableInventoryLot(lot)
              const quickUpdating = quickUpdatingLotId === lot.id
              return (
                <li key={lot.id}>
                  <div className={`inventory-row-shell${quickAdjustable ? ' has-quick-stepper' : ''}`}>
                    <button className="inventory-row inventory-row-action" type="button" onClick={() => onEdit(lot)}>
                      <div className="inventory-product-copy">
                        <strong>{lot.productName}</strong>
                        {lot.inventoryTrackingMode !== 'presence' && lot.packageContentValue !== null && lot.packageContentUnitSymbol && (
                          <span className="inventory-package-content">
                            1 {lot.unitSymbol} = {formatQuantity(lot.packageContentValue)} {lot.packageContentUnitSymbol}
                          </span>
                        )}
                        {lot.inventoryTrackingMode !== 'presence' && (lot.expiryDate || lot.openedUseByDate) && (() => {
                          const expiry = getInventoryExpiryMeta(lot.expiryDate, lot.openedUseByDate)
                          const openedPrefix = expiry.effectiveSource === 'opened' ? 'Otwarty · ' : ''
                          return (
                            <span className={`expiry-status expiry-${expiry.tone}`} title={expiry.exactLabel ? `Termin: ${expiry.exactLabel}` : undefined}>
                              <KitchenIcon name="calendar" size={13} />
                              {openedPrefix}{expiry.label}
                            </span>
                          )
                        })()}
                      </div>
                      <span className="inventory-row-end">
                        {!quickAdjustable && <span className="quantity-pill">{formatQuantity(lot.quantity)} {lot.unitSymbol}</span>}
                        <KitchenIcon name="edit" size={17} />
                      </span>
                    </button>
                    {quickAdjustable && (
                      <CompactQuantityStepper
                        ariaLabel={`Stan: ${lot.productName}`}
                        value={`${formatQuantity(lot.quantity)} ${lot.unitSymbol}`}
                        onDecrement={() => onAdjustInventoryLot(lot, -1)}
                        onIncrement={() => onAdjustInventoryLot(lot, 1)}
                        incrementDisabled={!canQuickIncrementInventoryLot(lot)}
                        busy={quickUpdating}
                      />
                    )}
                    <button
                      className="inventory-row-shopping"
                      type="button"
                      onClick={() => onAddToShopping(lot)}
                      aria-label={`Dodaj ${lot.productName} do listy zakupów`}
                      title="Dodaj do listy zakupów"
                    >
                      <KitchenIcon name="shoppingAdd" size={20} />
                    </button>
                  </div>
                </li>
              )
            })}
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
  const [resourceUpdatingId, setResourceUpdatingId] = useState<string | null>(null)
  const [quickUpdatingLotId, setQuickUpdatingLotId] = useState<string | null>(null)
  const [resourceError, setResourceError] = useState('')
  const [minimumResource, setMinimumResource] = useState<InventoryResource | null>(null)
  const handledCreateRequest = useRef(0)
  const handledOverviewRequest = useRef(0)

  const reload = useCallback(() => {
    setLoadState({ status: 'loading', model: null })
    setReloadVersion((version) => version + 1)
  }, [])

  const refreshSilently = useCallback(async () => {
    try {
      const model = await loadInventoryReadModel(ownerId)
      setLoadState({ status: 'ready', model })
    } catch (error) {
      console.error('Kitchen inventory silent refresh failed.', error)
      reload()
    }
  }, [ownerId, reload])

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


  async function handleSpiceToggle(resource: InventoryResource) {
    if (resourceUpdatingId) return
    setResourceUpdatingId(resource.product.id)
    setResourceError('')
    try {
      await setSpicePresence(ownerId, resource.product.id, !resource.present)
      await refreshSilently()
    } catch (error) {
      console.error('Kitchen Spice presence update failed.', error)
      setResourceError(toUserErrorMessage(error, 'Nie udało się zmienić stanu przyprawy.'))
    } finally {
      setResourceUpdatingId(null)
    }
  }

  async function handleHouseholdAdjust(resource: InventoryResource, delta: -1 | 1) {
    if (resourceUpdatingId) return
    setResourceUpdatingId(resource.product.id)
    setResourceError('')
    try {
      await adjustHouseholdStock(ownerId, resource.product.id, delta)
      await refreshSilently()
    } catch (error) {
      console.error('Kitchen Household quick stock update failed.', error)
      setResourceError(toUserErrorMessage(error, 'Nie udało się zmienić stanu Domowe.'))
    } finally {
      setResourceUpdatingId(null)
    }
  }

  async function handleInventoryLotAdjust(lot: InventoryLot, delta: -1 | 1) {
    if (quickUpdatingLotId) return
    setQuickUpdatingLotId(lot.id)
    setResourceError('')
    try {
      await adjustInventoryLotQuantity({ ownerId, lotId: lot.id, delta })
      await refreshSilently()
    } catch (error) {
      console.error('Kitchen Inventory quick quantity update failed.', error)
      setResourceError(toUserErrorMessage(error, 'Nie udało się zmienić liczby zapasu.'))
    } finally {
      setQuickUpdatingLotId(null)
    }
  }

  const selectedGroup = useMemo(() => {
    if (loadState.status !== 'ready' || !selectedLocationId) return null
    return loadState.model.groups.find((group) => group.location.id === selectedLocationId) ?? null
  }, [loadState, selectedLocationId])

  const inventoryShopping = useInventoryShoppingBridge({
    ownerId,
    catalog: loadState.status === 'ready'
      ? { products: loadState.model.products, units: loadState.model.units }
      : null,
    onInventoryChanged: reload,
  })

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
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
          onAddToShopping={inventoryShopping.openForLot}
          onToggleSpice={(resource) => void handleSpiceToggle(resource)}
          onAdjustHousehold={(resource, delta) => void handleHouseholdAdjust(resource, delta)}
          onAdjustInventoryLot={(lot, delta) => void handleInventoryLotAdjust(lot, delta)}
          onEditHouseholdMinimum={setMinimumResource}
          resourceUpdatingId={resourceUpdatingId}
          quickUpdatingLotId={quickUpdatingLotId}
          resourceError={resourceError}
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
          onConsumed={(result) => {
            setConsumeLot(null)
            inventoryShopping.handleConsumed(consumeLot, result)
          }}
        />
      )}


      {minimumResource && (
        <HouseholdMinimumSheet
          ownerId={ownerId}
          resource={minimumResource}
          onClose={() => setMinimumResource(null)}
          onSaved={() => {
            setMinimumResource(null)
            void refreshSilently()
          }}
        />
      )}

      {inventoryShopping.bridgeUi}
    </section>
  )
}
