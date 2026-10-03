import { useEffect, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { loadInventoryReadModel } from '../inventory/inventoryReadModel'

type HomePageProps = {
  ownerId: string
  onAddProduct: () => void
}

type HomeStatus =
  | { status: 'loading'; totalLots: 0 }
  | { status: 'ready'; totalLots: number }
  | { status: 'error'; totalLots: 0 }

export function HomePage({ ownerId, onAddProduct }: HomePageProps) {
  const [homeStatus, setHomeStatus] = useState<HomeStatus>({ status: 'loading', totalLots: 0 })

  useEffect(() => {
    let active = true

    loadInventoryReadModel(ownerId)
      .then((model) => {
        if (active) setHomeStatus({ status: 'ready', totalLots: model.totalLots })
      })
      .catch(() => {
        if (active) setHomeStatus({ status: 'error', totalLots: 0 })
      })

    return () => {
      active = false
    }
  }, [ownerId])

  return (
    <section className="home-page" aria-label="Start">
      {homeStatus.status === 'ready' && homeStatus.totalLots > 0 && (
        <p className="home-status">{homeStatus.totalLots} {homeStatus.totalLots === 1 ? 'pozycja' : 'pozycji'} w zapasach</p>
      )}

      <button className="home-quick-action" type="button" onClick={onAddProduct}>
        <span className="home-quick-icon" aria-hidden="true"><KitchenIcon name="plus" size={23} /></span>
        <strong>{homeStatus.status === 'ready' && homeStatus.totalLots === 0 ? 'Dodaj pierwszy produkt' : 'Dodaj produkt'}</strong>
        <KitchenIcon name="chevronRight" size={20} />
      </button>
    </section>
  )
}
