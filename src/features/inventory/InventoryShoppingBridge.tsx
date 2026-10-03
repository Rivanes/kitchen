import { useEffect, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { ShoppingEditor } from '../shopping/ShoppingEditor'
import type { ShoppingCatalogModel, ShoppingCreateSeed } from '../shopping/types'
import type { ConsumeInventoryResult } from './inventoryMutations'
import type { InventoryLot } from './types'

type ShoppingLaunch = {
  seed: ShoppingCreateSeed
  model: ShoppingCatalogModel
}

type ShoppingNotice =
  | { kind: 'offer'; launch: ShoppingLaunch; depleted: boolean }
  | { kind: 'success'; productName: string }
  | null

type InventoryShoppingBridgeInput = {
  ownerId: string
  catalog: ShoppingCatalogModel | null
  onInventoryChanged: () => void
}

export function useInventoryShoppingBridge({
  ownerId,
  catalog,
  onInventoryChanged,
}: InventoryShoppingBridgeInput) {
  const [shoppingLaunch, setShoppingLaunch] = useState<ShoppingLaunch | null>(null)
  const [shoppingNotice, setShoppingNotice] = useState<ShoppingNotice>(null)

  useEffect(() => {
    if (shoppingNotice?.kind !== 'success') return
    const timer = window.setTimeout(() => setShoppingNotice(null), 3200)
    return () => window.clearTimeout(timer)
  }, [shoppingNotice])

  function buildLaunch(lot: InventoryLot): ShoppingLaunch | null {
    if (!catalog) return null
    const product = catalog.products.find((candidate) => candidate.id === lot.productId) ?? null

    return {
      seed: {
        productId: lot.productId,
        productName: lot.productName,
        unitCode: product?.defaultUnitCode ?? lot.unitCode,
        quantity: 1,
      },
      model: catalog,
    }
  }

  function openForLot(lot: InventoryLot) {
    const launch = buildLaunch(lot)
    if (!launch) return
    setShoppingNotice(null)
    setShoppingLaunch(launch)
  }

  function handleConsumed(lot: InventoryLot, result: ConsumeInventoryResult) {
    const launch = buildLaunch(lot)
    setShoppingLaunch(null)

    if (launch) {
      setShoppingNotice({
        kind: 'offer',
        launch,
        depleted: result.depleted,
      })
    }

    onInventoryChanged()
  }

  function handleShoppingSaved() {
    const productName = shoppingLaunch?.seed.productName
    setShoppingLaunch(null)
    if (productName) {
      setShoppingNotice({ kind: 'success', productName })
    }
  }

  const bridgeUi = (
    <>
      {shoppingLaunch && (
        <ShoppingEditor
          ownerId={ownerId}
          model={shoppingLaunch.model}
          mode={{ kind: 'create', seed: shoppingLaunch.seed }}
          onClose={() => setShoppingLaunch(null)}
          onSaved={handleShoppingSaved}
        />
      )}

      {shoppingNotice && (
        <aside className={`inventory-shopping-notice${shoppingNotice.kind === 'success' ? ' is-success' : ''}`} aria-live="polite">
          <div className="inventory-shopping-notice-copy">
            {shoppingNotice.kind === 'offer' ? (
              <>
                <strong>{shoppingNotice.depleted ? 'Produkt się skończył' : 'Zapas został zmniejszony'}</strong>
                <span>Dodać „{shoppingNotice.launch.seed.productName}” do listy zakupów?</span>
              </>
            ) : (
              <>
                <strong>Dodano do listy zakupów</strong>
                <span>„{shoppingNotice.productName}” jest już na liście.</span>
              </>
            )}
          </div>

          {shoppingNotice.kind === 'offer' ? (
            <div className="inventory-shopping-notice-actions">
              <button className="secondary-button compact-button" type="button" onClick={() => setShoppingNotice(null)}>
                Nie teraz
              </button>
              <button
                className="primary-button compact-button"
                type="button"
                onClick={() => {
                  setShoppingLaunch(shoppingNotice.launch)
                  setShoppingNotice(null)
                }}
              >
                <KitchenIcon name="shoppingAdd" size={17} />
                Dodaj do listy
              </button>
            </div>
          ) : (
            <button
              className="icon-button icon-button-quiet inventory-shopping-notice-close"
              type="button"
              onClick={() => setShoppingNotice(null)}
              aria-label="Zamknij potwierdzenie"
            >
              <KitchenIcon name="close" size={18} />
            </button>
          )}
        </aside>
      )}
    </>
  )

  return {
    openForLot,
    handleConsumed,
    bridgeUi,
  }
}
