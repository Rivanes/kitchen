import { useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { getInventoryExpiryMeta } from '../inventory/expiry'
import { loadInventoryReadModel } from '../inventory/inventoryReadModel'
import type { InventoryReadModel } from '../inventory/types'

type HomePageProps = {
  ownerId: string
  onAddProduct: () => void
  onOpenExpiry: () => void
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

function expiryHubSummary(critical: number, warning: number, missing: number, total: number) {
  if (total === 0) return 'Pojawią się razem z zapasami'

  const parts: string[] = []
  if (critical > 0) parts.push(`${critical} pilne`)
  if (warning > 0) parts.push(`${warning} wkrótce`)
  if (missing > 0) parts.push(`${missing} bez terminu`)

  return parts.length > 0 ? parts.join(' · ') : 'Wszystkie terminy są spokojne'
}

export function HomePage({ ownerId, onAddProduct, onOpenExpiry }: HomePageProps) {
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

  const expirySummary = useMemo(() => {
    if (homeStatus.status !== 'ready') return { critical: 0, warning: 0, missing: 0, total: 0 }

    let critical = 0
    let warning = 0
    let missing = 0
    const lots = homeStatus.model.groups.flatMap((group) => group.lots)

    for (const lot of lots) {
      const meta = getInventoryExpiryMeta(lot.expiryDate, lot.openedUseByDate)
      if (meta.tone === 'critical') critical += 1
      if (meta.tone === 'warning') warning += 1
      if (!lot.expiryDate) missing += 1
    }

    return { critical, warning, missing, total: lots.length }
  }, [homeStatus])

  const expiryTone = homeStatus.status !== 'ready' || expirySummary.total === 0
    ? 'none'
    : expirySummary.critical > 0
      ? 'critical'
      : expirySummary.warning > 0 || expirySummary.missing > 0
        ? 'warning'
        : 'good'

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

      <button className={`home-expiry-hub home-expiry-hub-${expiryTone}`} type="button" onClick={onOpenExpiry}>
        <span className="home-expiry-hub-icon" aria-hidden="true"><KitchenIcon name="calendar" size={21} /></span>
        <span className="home-expiry-hub-copy">
          <strong>Terminy ważności</strong>
          <small>
            {homeStatus.status === 'ready'
              ? expiryHubSummary(expirySummary.critical, expirySummary.warning, expirySummary.missing, expirySummary.total)
              : homeStatus.status === 'loading'
                ? 'Sprawdzam terminy…'
                : 'Otwórz centrum terminów'}
          </small>
        </span>
        <KitchenIcon name="chevronRight" size={19} />
      </button>

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
