import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { formatQuantity } from '../quantity/quantity'
import { ShoppingEditor } from './ShoppingEditor'
import { ShoppingPurchaseSheet } from './ShoppingPurchaseSheet'
import { ShoppingInventoryBridge } from './ShoppingInventoryBridge'
import { purchaseShoppingQuantity, restoreShoppingPurchase } from './shoppingMutations'
import { loadShoppingReadModel } from './shoppingReadModel'
import type { ShoppingItem, ShoppingReadModel } from './types'

type ShoppingPageProps = {
  ownerId: string
}

type ShoppingStatus =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: ShoppingReadModel }
  | { status: 'error'; model: null }

type EditorState =
  | { kind: 'create' }
  | { kind: 'edit'; item: ShoppingItem }
  | null

function thingsLabel(count: number) {
  if (count === 1) return '1 rzecz'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${count} rzeczy`
  }
  return `${count} rzeczy`
}

function filterItems(items: ShoppingItem[], normalizedSearch: string) {
  if (!normalizedSearch) return items
  return items.filter((item) => item.name.toLocaleLowerCase('pl-PL').includes(normalizedSearch))
}

export function ShoppingPage({ ownerId }: ShoppingPageProps) {
  const [shoppingStatus, setShoppingStatus] = useState<ShoppingStatus>({ status: 'loading', model: null })
  const [editor, setEditor] = useState<EditorState>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [completedOpen, setCompletedOpen] = useState(true)
  const [purchaseTarget, setPurchaseTarget] = useState<ShoppingItem | null>(null)
  const [inventoryTarget, setInventoryTarget] = useState<ShoppingItem | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setShoppingStatus({ status: 'loading', model: null })
    try {
      const model = await loadShoppingReadModel(ownerId)
      setShoppingStatus({ status: 'ready', model })
    } catch {
      setShoppingStatus({ status: 'error', model: null })
    }
  }, [ownerId])

  useEffect(() => {
    void load()
  }, [load])

  const model = shoppingStatus.status === 'ready' ? shoppingStatus.model : null
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pl-PL')
  const visibleActiveItems = useMemo(
    () => filterItems(model?.activeItems ?? [], normalizedSearch),
    [model, normalizedSearch],
  )
  const visiblePurchasedItems = useMemo(
    () => filterItems(model?.purchasedItems ?? [], normalizedSearch),
    [model, normalizedSearch],
  )
  const totalItemCount = model ? model.activeItems.length + model.purchasedItems.length : 0
  const searchHasNoResults = Boolean(model && normalizedSearch && visibleActiveItems.length === 0 && visiblePurchasedItems.length === 0)
  const completedVisible = completedOpen || Boolean(normalizedSearch)

  async function handleSaved() {
    setEditor(null)
    setActionError('')
    await load()
  }

  async function handlePurchasedSaved() {
    setPurchaseTarget(null)
    setActionError('')
    const nextModel = await loadShoppingReadModel(ownerId)
    setShoppingStatus({ status: 'ready', model: nextModel })
    setCompletedOpen(true)
  }

  async function handleQuickPurchase(item: ShoppingItem) {
    if (updatingItemId) return

    setUpdatingItemId(item.id)
    setActionError('')
    try {
      await purchaseShoppingQuantity({
        ownerId,
        itemId: item.id,
        quantity: item.quantity,
      })
      const nextModel = await loadShoppingReadModel(ownerId)
      setShoppingStatus({ status: 'ready', model: nextModel })
      setCompletedOpen(true)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nie udało się oznaczyć rzeczy jako kupione.')
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function handleTransferredToInventory() {
    setInventoryTarget(null)
    setActionError('')
    const nextModel = await loadShoppingReadModel(ownerId)
    setShoppingStatus({ status: 'ready', model: nextModel })
  }

  async function handleRestorePurchased(item: ShoppingItem) {
    if (updatingItemId) return

    setUpdatingItemId(item.id)
    setActionError('')
    try {
      await restoreShoppingPurchase({ ownerId, itemId: item.id })
      const nextModel = await loadShoppingReadModel(ownerId)
      setShoppingStatus({ status: 'ready', model: nextModel })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nie udało się przywrócić rzeczy do listy.')
    } finally {
      setUpdatingItemId(null)
    }
  }

  return (
    <section className="shopping-page" aria-label="Zakupy">
      <div className="page-heading shopping-page-heading">
        <div>
          <p className="eyebrow">Bieżąca lista</p>
          <h1>Zakupy</h1>
          {model && model.activeItems.length > 0 && <p>{thingsLabel(model.activeItems.length)} do kupienia</p>}
          {model && model.activeItems.length === 0 && model.purchasedItems.length > 0 && <p>Wszystko kupione</p>}
          {model && totalItemCount === 0 && <p>Dodaj to, czego brakuje w domu.</p>}
        </div>
        <div className="shopping-heading-actions">
          <button className="icon-button" type="button" onClick={() => void load()} aria-label="Odśwież listę zakupów" title="Odśwież">
            <KitchenIcon name="refresh" />
          </button>
          <button className="primary-icon-button" type="button" onClick={() => setEditor({ kind: 'create' })} aria-label="Dodaj do listy" title="Dodaj do listy">
            <KitchenIcon name="plus" />
          </button>
        </div>
      </div>

      {shoppingStatus.status === 'loading' && (
        <section className="shopping-state-card" aria-live="polite">
          <KitchenIcon name="shopping" size={24} />
          <strong>Ładuję listę…</strong>
        </section>
      )}

      {shoppingStatus.status === 'error' && (
        <section className="shopping-state-card shopping-state-error">
          <KitchenIcon name="shopping" size={24} />
          <strong>Nie udało się wczytać listy.</strong>
          <button className="secondary-button" type="button" onClick={() => void load()}>Spróbuj ponownie</button>
        </section>
      )}

      {actionError && <p className="shopping-action-error" role="alert">{actionError}</p>}

      {model && totalItemCount === 0 && (
        <section className="shopping-empty-card">
          <span className="shopping-empty-icon" aria-hidden="true"><KitchenIcon name="shopping" size={25} /></span>
          <div>
            <strong>Lista jest pusta</strong>
            <span>Dodaj pierwszą rzecz, którą chcesz kupić.</span>
          </div>
          <button className="primary-button" type="button" onClick={() => setEditor({ kind: 'create' })}>
            <KitchenIcon name="plus" size={18} />
            Dodaj
          </button>
        </section>
      )}

      {model && model.activeItems.length === 0 && model.purchasedItems.length > 0 && !normalizedSearch && (
        <section className="shopping-empty-card shopping-all-done-card">
          <span className="shopping-empty-icon" aria-hidden="true"><KitchenIcon name="check" size={25} /></span>
          <div>
            <strong>Wszystko kupione</strong>
            <span>Dodaj kolejną rzecz albo przywróć coś z sekcji „Kupione”.</span>
          </div>
          <button className="primary-button" type="button" onClick={() => setEditor({ kind: 'create' })}>
            <KitchenIcon name="plus" size={18} />
            Dodaj
          </button>
        </section>
      )}

      {model && totalItemCount >= 8 && (
        <label className="inventory-search shopping-search">
          <KitchenIcon name="search" size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Szukaj na liście"
            aria-label="Szukaj na liście zakupów"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Wyczyść wyszukiwanie">
              <KitchenIcon name="close" size={17} />
            </button>
          )}
        </label>
      )}

      {model && model.activeItems.length > 0 && (!normalizedSearch || visibleActiveItems.length > 0) && (
        <section className="shopping-list-section" aria-label="Rzeczy do kupienia">
          <div className="shopping-section-heading">
            <strong>Do kupienia</strong>
            <span>{model.activeItems.length}</span>
          </div>
          {visibleActiveItems.length > 0 ? (
            <div className="shopping-list-card">
              <ul className="shopping-list">
                {visibleActiveItems.map((item) => (
                  <li key={item.id} className="shopping-item-line">
                    <button
                      className="shopping-purchase-toggle"
                      type="button"
                      onClick={() => void handleQuickPurchase(item)}
                      disabled={Boolean(updatingItemId)}
                      aria-label={`Kupiono całość: ${item.name}, ${formatQuantity(item.quantity)} ${item.unitSymbol}`}
                      title="Kupiono całość"
                    >
                      <span aria-hidden="true" />
                    </button>
                    <div className="shopping-active-row">
                      <button className="shopping-row" type="button" onClick={() => setEditor({ kind: 'edit', item })} disabled={Boolean(updatingItemId)}>
                        <span className="shopping-row-copy">
                          <strong>{item.name}</strong>
                          <small>{formatQuantity(item.quantity)} {item.unitSymbol}</small>
                        </span>
                        <KitchenIcon name="chevronRight" size={18} />
                      </button>
                      <button
                        className="shopping-partial-purchase-button"
                        type="button"
                        onClick={() => setPurchaseTarget(item)}
                        disabled={Boolean(updatingItemId)}
                        aria-label={`Kup inną ilość produktu ${item.name}`}
                      >
                        <KitchenIcon name="edit" size={14} />
                        Zmień ilość
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {model && model.purchasedItems.length > 0 && (!normalizedSearch || visiblePurchasedItems.length > 0) && (
        <section className="shopping-completed-section" aria-label="Kupione rzeczy">
          <button
            className={`shopping-completed-heading${completedOpen ? ' is-open' : ''}`}
            type="button"
            onClick={() => setCompletedOpen((value) => !value)}
            aria-expanded={completedVisible}
          >
            <span className="shopping-completed-heading-copy">
              <span className="shopping-completed-heading-icon" aria-hidden="true"><KitchenIcon name="check" size={17} /></span>
              <strong>Kupione</strong>
              <small>{model.purchasedItems.length}</small>
            </span>
            <span className="shopping-completed-chevron" aria-hidden="true"><KitchenIcon name="chevronDown" size={18} /></span>
          </button>

          {completedVisible && (
            visiblePurchasedItems.length > 0 ? (
              <div className="shopping-list-card shopping-completed-card">
                <ul className="shopping-list shopping-completed-list">
                  {visiblePurchasedItems.map((item) => (
                    <li key={item.id} className="shopping-item-line shopping-item-completed">
                      <button
                        className="shopping-purchase-toggle is-checked"
                        type="button"
                        onClick={() => void handleRestorePurchased(item)}
                        disabled={Boolean(updatingItemId)}
                        aria-label={`Przywróć ${item.name} do listy zakupów`}
                        title="Przywróć do kupienia"
                      >
                        <span aria-hidden="true"><KitchenIcon name="check" size={16} /></span>
                      </button>
                      <div className="shopping-completed-row-copy">
                        <strong>{item.name}</strong>
                        <small>{formatQuantity(item.quantity)} {item.unitSymbol}</small>
                      </div>
                      <button
                        className="shopping-to-inventory-button"
                        type="button"
                        onClick={() => setInventoryTarget(item)}
                        disabled={Boolean(updatingItemId)}
                        aria-label={`Dodaj ${item.name} do zapasów`}
                        title="Dodaj do zapasów"
                      >
                        <KitchenIcon name="inventory" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </section>
      )}

      {searchHasNoResults && (
        <div className="shopping-search-empty">
          <strong>Brak wyników</strong>
          <span>Spróbuj innej nazwy.</span>
        </div>
      )}

      {model && totalItemCount > 0 && (
        <button className="shopping-add-footer" type="button" onClick={() => setEditor({ kind: 'create' })}>
          <KitchenIcon name="plus" size={18} />
          Dodaj do listy
        </button>
      )}

      {inventoryTarget && (
        <ShoppingInventoryBridge
          ownerId={ownerId}
          item={inventoryTarget}
          onClose={() => setInventoryTarget(null)}
          onTransferred={() => void handleTransferredToInventory()}
        />
      )}

      {purchaseTarget && (
        <ShoppingPurchaseSheet
          ownerId={ownerId}
          item={purchaseTarget}
          onClose={() => setPurchaseTarget(null)}
          onPurchased={() => void handlePurchasedSaved()}
        />
      )}

      {editor && model && (
        <ShoppingEditor
          ownerId={ownerId}
          model={model}
          mode={editor}
          onClose={() => setEditor(null)}
          onSaved={() => void handleSaved()}
        />
      )}
    </section>
  )
}
