import { useEffect, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { loadInventoryReadModel } from '../inventory/inventoryReadModel'

type HomePageProps = {
  ownerId: string
  onAddProduct: () => void
}

type HomeStatus =
  | { status: 'loading'; totalLots: 0; stockedProducts: 0; occupiedLocations: 0 }
  | { status: 'ready'; totalLots: number; stockedProducts: number; occupiedLocations: number }
  | { status: 'error'; totalLots: 0; stockedProducts: 0; occupiedLocations: 0 }

export function HomePage({ ownerId, onAddProduct }: HomePageProps) {
  const [homeStatus, setHomeStatus] = useState<HomeStatus>({
    status: 'loading',
    totalLots: 0,
    stockedProducts: 0,
    occupiedLocations: 0,
  })

  useEffect(() => {
    let active = true

    loadInventoryReadModel(ownerId)
      .then((model) => {
        if (active) {
          setHomeStatus({
            status: 'ready',
            totalLots: model.totalLots,
            stockedProducts: model.stockedProducts,
            occupiedLocations: model.occupiedLocations,
          })
        }
      })
      .catch(() => {
        if (active) {
          setHomeStatus({ status: 'error', totalLots: 0, stockedProducts: 0, occupiedLocations: 0 })
        }
      })

    return () => {
      active = false
    }
  }, [ownerId])

  const hasStock = homeStatus.status === 'ready' && homeStatus.totalLots > 0

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
            {hasStock && (
              <p>
                {homeStatus.stockedProducts} {homeStatus.stockedProducts === 1 ? 'produkt' : 'produkty'} · {homeStatus.totalLots} {homeStatus.totalLots === 1 ? 'pozycja' : 'pozycje'} · {homeStatus.occupiedLocations} {homeStatus.occupiedLocations === 1 ? 'miejsce' : 'miejsca'}
              </p>
            )}
          </div>
          <span className="home-overview-icon" aria-hidden="true"><KitchenIcon name="inventory" size={22} /></span>
        </div>
      </section>

      <button className="home-quick-action" type="button" onClick={onAddProduct}>
        <span className="home-quick-icon" aria-hidden="true"><KitchenIcon name="plus" size={23} /></span>
        <strong>{hasStock ? 'Dodaj produkt' : 'Dodaj pierwszy produkt'}</strong>
        <KitchenIcon name="chevronRight" size={20} />
      </button>

      <section className="home-coming" aria-labelledby="home-coming-title">
        <div className="home-section-heading">
          <p className="eyebrow">Wkrótce</p>
          <h2 id="home-coming-title">Kitchen podpowie więcej</h2>
        </div>

        <div className="home-coming-grid">
          <article className="home-coming-card" aria-disabled="true">
            <span className="home-coming-icon" aria-hidden="true"><KitchenIcon name="calendar" size={20} /></span>
            <div>
              <strong>Do zużycia</strong>
              <span>Terminy ważności</span>
            </div>
            <span className="coming-badge">V1.6</span>
          </article>

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
