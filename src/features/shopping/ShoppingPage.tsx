import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { ShoppingEditor } from './ShoppingEditor'
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

function formatQuantity(value: number) {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 }).format(value)
}

function thingsLabel(count: number) {
  if (count === 1) return '1 rzecz'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${count} rzeczy`
  }
  return `${count} rzeczy`
}

export function ShoppingPage({ ownerId }: ShoppingPageProps) {
  const [shoppingStatus, setShoppingStatus] = useState<ShoppingStatus>({ status: 'loading', model: null })
  const [editor, setEditor] = useState<EditorState>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
  const visibleItems = useMemo(() => {
    if (!model) return []
    if (!normalizedSearch) return model.items
    return model.items.filter((item) => item.name.toLocaleLowerCase('pl-PL').includes(normalizedSearch))
  }, [model, normalizedSearch])

  async function handleSaved() {
    setEditor(null)
    await load()
  }

  return (
    <section className="shopping-page" aria-label="Zakupy">
      <div className="page-heading shopping-page-heading">
        <div>
          <p className="eyebrow">Bieżąca lista</p>
          <h1>Zakupy</h1>
          {model && model.items.length > 0 && <p>{thingsLabel(model.items.length)} do kupienia</p>}
          {model && model.items.length === 0 && <p>Dodaj to, czego brakuje w domu.</p>}
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

      {model && model.items.length === 0 && (
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

      {model && model.items.length >= 8 && (
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

      {model && model.items.length > 0 && (
        <section className="shopping-list-card" aria-label="Rzeczy do kupienia">
          {visibleItems.length > 0 ? (
            <ul className="shopping-list">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <button className="shopping-row" type="button" onClick={() => setEditor({ kind: 'edit', item })}>
                    <span className="shopping-row-icon" aria-hidden="true"><KitchenIcon name="shopping" size={18} /></span>
                    <span className="shopping-row-copy">
                      <strong>{item.name}</strong>
                      <small>{formatQuantity(item.quantity)} {item.unitSymbol}</small>
                    </span>
                    <KitchenIcon name="chevronRight" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="shopping-search-empty">
              <strong>Brak wyników</strong>
              <span>Spróbuj innej nazwy.</span>
            </div>
          )}
        </section>
      )}

      {model && model.items.length > 0 && (
        <button className="shopping-add-footer" type="button" onClick={() => setEditor({ kind: 'create' })}>
          <KitchenIcon name="plus" size={18} />
          Dodaj do listy
        </button>
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
