import { useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { getExpiryMeta } from '../inventory/expiry'
import { loadInventoryReadModel } from '../inventory/inventoryReadModel'
import type { InventoryReadModel } from '../inventory/types'

type HomePageProps = {
  ownerId: string
  onAddProduct: () => void
  onOpenInventory: () => void
}

type HomeStatus =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: InventoryReadModel }
  | { status: 'error'; model: null }

function polishProducts(value: number) {
  if (value === 1) return '1 produkt w zapasach'
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${value} produkty w zapasach`
  }
  return `${value} produktów w zapasach`
}

export function HomePage({ ownerId, onAddProduct, onOpenInventory }: HomePageProps) {
  const [homeStatus, setHomeStatus] = useState<HomeStatus>({ status: 'loading', model: null })

  useEffect(() => {
    let active = true

    loadInventoryReadModel(ownerId)
      .then((model) => {
        if (active) setHomeStatus({ status: 'ready', model })
      })
      .catch(() => {
        if (active) setHomeStatus({ status: 'error', model: null })
      })

    return () => {
      active = false
    }
  }, [ownerId])

  const hasStock = homeStatus.status === 'ready' && homeStatus.model.totalLots > 0

  const attentionLots = useMemo(() => {
    if (homeStatus.status !== 'ready') return []
    const locationNames = new Map(homeStatus.model.locations.map((location) => [location.id, location.name]))

    return homeStatus.model.groups
      .flatMap((group) => group.lots)
      .map((lot) => ({
        lot,
        expiry: getExpiryMeta(lot.expiryDate),
        locationName: locationNames.get(lot.storageLocationId) ?? 'Zapasy',
      }))
      .filter((item) => item.expiry.needsAttention)
      .sort((a, b) => (a.expiry.daysUntil ?? Number.POSITIVE_INFINITY) - (b.expiry.daysUntil ?? Number.POSITIVE_INFINITY))
  }, [homeStatus])

  const visibleAttentionLots = attentionLots.slice(0, 3)

  return (
    <section className="home-page" aria-label="Start">
      <section className="home-overview" aria-labelledby="home-overview-title">
        <p className="eyebrow">Dzisiaj</p>
        <div className="home-overview-row">
          <div>
            <h1 id="home-overview-title">Twoja kuchnia</h1>
            {homeStatus.status === 'loading' && <p>Sprawdzam stan zapasów…</p>}
            {homeStatus.status === 'error' && <p>Zapasy są dostępne w dolnym menu.</p>}
            {homeStatus.status === 'ready' && !hasStock && <p>Dodaj pierwszy produkt i zacznij budować zapasy.</p>}
            {homeStatus.status === 'ready' && hasStock && <p>{polishProducts(homeStatus.model.stockedProducts)}</p>}
          </div>
          <span className="home-overview-icon" aria-hidden="true"><KitchenIcon name="inventory" size={22} /></span>
        </div>
      </section>

      <button className="home-quick-action" type="button" onClick={onAddProduct}>
        <span className="home-quick-icon" aria-hidden="true"><KitchenIcon name="plus" size={23} /></span>
        <strong>{hasStock ? 'Dodaj produkt' : 'Dodaj pierwszy produkt'}</strong>
        <KitchenIcon name="chevronRight" size={20} />
      </button>

      {visibleAttentionLots.length > 0 && (
        <section className="home-attention" aria-labelledby="home-attention-title">
          <div className="home-section-heading home-attention-heading">
            <div>
              <p className="eyebrow">Do zużycia</p>
              <h2 id="home-attention-title">Sprawdź najpierw</h2>
            </div>
            <button type="button" onClick={onOpenInventory}>Zapasy</button>
          </div>

          <div className="home-expiry-list">
            {visibleAttentionLots.map(({ lot, expiry, locationName }) => (
              <article className={`home-expiry-row expiry-${expiry.tone}`} key={lot.id}>
                <span className="home-expiry-icon" aria-hidden="true"><KitchenIcon name="calendar" size={18} /></span>
                <div>
                  <strong>{lot.productName}</strong>
                  <span>{locationName}</span>
                </div>
                <span className="home-expiry-status">{expiry.label}</span>
              </article>
            ))}
          </div>

          {attentionLots.length > visibleAttentionLots.length && (
            <button className="home-attention-more" type="button" onClick={onOpenInventory}>
              +{attentionLots.length - visibleAttentionLots.length} kolejnych
              <KitchenIcon name="chevronRight" size={17} />
            </button>
          )}
        </section>
      )}

      <section className="home-coming" aria-labelledby="home-coming-title">
        <div className="home-section-heading">
          <p className="eyebrow">Wkrótce</p>
          <h2 id="home-coming-title">Kitchen podpowie więcej</h2>
        </div>

        <div className="home-coming-grid">
          <article className="home-coming-card" aria-disabled="true">
            <span className="home-coming-icon" aria-hidden="true"><KitchenIcon name="shopping" size={20} /></span>
            <div>
              <strong>Do kupienia</strong>
              <span>Lista zakupów</span>
            </div>
            <span className="coming-badge">V2</span>
          </article>

          <article className="home-coming-card" aria-disabled="true">
            <span className="home-coming-icon" aria-hidden="true"><KitchenIcon name="sparkles" size={20} /></span>
            <div>
              <strong>Co ugotować</strong>
              <span>Pomysły z zapasów</span>
            </div>
            <span className="coming-badge">V4</span>
          </article>
        </div>
      </section>
    </section>
  )
}
