import { useEffect, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { InventoryEditor } from '../inventory/InventoryEditor'
import { loadInventoryReadModel } from '../inventory/inventoryReadModel'
import type { CreateInventoryLotInput } from '../inventory/inventoryMutations'
import type { InventoryReadModel } from '../inventory/types'
import { transferPurchasedShoppingItemToInventory } from './shoppingMutations'
import type { ShoppingItem } from './types'

type ShoppingInventoryBridgeProps = {
  ownerId: string
  item: ShoppingItem
  onClose: () => void
  onTransferred: () => void
}

type LoadState =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: InventoryReadModel }
  | { status: 'error'; model: null }

export function ShoppingInventoryBridge({
  ownerId,
  item,
  onClose,
  onTransferred,
}: ShoppingInventoryBridgeProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading', model: null })

  useEffect(() => {
    let active = true

    async function load() {
      if (!item.productId) {
        if (active) setState({ status: 'error', model: null })
        return
      }

      try {
        const model = await loadInventoryReadModel(ownerId)
        if (active) setState({ status: 'ready', model })
      } catch {
        if (active) setState({ status: 'error', model: null })
      }
    }

    void load()
    return () => { active = false }
  }, [item.productId, ownerId])

  async function transfer(input: CreateInventoryLotInput) {
    if (!item.productId) {
      throw new Error('Ten starszy wpis zakupowy nie ma jeszcze wspólnej tożsamości produktu.')
    }

    if (
      input.existingProductId !== item.productId
      || input.quantity !== item.quantity
      || input.unitCode !== item.unitCode
    ) {
      throw new Error('Produkt, kupiona ilość i jednostka muszą pozostać zgodne z zakupem.')
    }

    await transferPurchasedShoppingItemToInventory({
      ownerId,
      itemId: item.id,
      storageLocationId: input.storageLocationId,
      expiryDate: input.expiryDate,
      afterOpenDays: input.afterOpenDays,
    })
  }

  if (state.status === 'loading') {
    return (
      <div className="sheet-backdrop" role="presentation">
        <section className="inventory-sheet shopping-inventory-bridge-state" role="dialog" aria-modal="true" aria-label="Przygotowanie zapasu">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="sheet-header">
            <div><p className="eyebrow">Kupione</p><h2>Dodaj do zapasów</h2></div>
            <button className="icon-button icon-button-quiet" type="button" onClick={onClose} aria-label="Zamknij"><KitchenIcon name="close" /></button>
          </div>
          <div className="shopping-inventory-bridge-message"><KitchenIcon name="inventory" /><strong>Przygotowuję miejsca przechowywania…</strong></div>
        </section>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="sheet-backdrop" role="presentation">
        <section className="inventory-sheet shopping-inventory-bridge-state" role="dialog" aria-modal="true" aria-label="Nie można dodać do zapasów">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="sheet-header">
            <div><p className="eyebrow">Kupione</p><h2>Dodaj do zapasów</h2></div>
            <button className="icon-button icon-button-quiet" type="button" onClick={onClose} aria-label="Zamknij"><KitchenIcon name="close" /></button>
          </div>
          <div className="shopping-inventory-bridge-message is-error">
            <KitchenIcon name="inventory" />
            <strong>Nie udało się przygotować zapisu.</strong>
            <span>{item.productId ? 'Spróbuj ponownie.' : 'Przywróć ten starszy wpis do listy i zapisz go ponownie, aby ujednolicić produkt.'}</span>
          </div>
        </section>
      </div>
    )
  }

  return (
    <InventoryEditor
      ownerId={ownerId}
      model={state.model}
      mode={{
        kind: 'create',
        seed: {
          productId: item.productId!,
          productName: item.name,
          quantity: item.quantity,
          unitCode: item.unitCode,
        },
      }}
      createHandler={transfer}
      onClose={onClose}
      onSaved={onTransferred}
    />
  )
}
