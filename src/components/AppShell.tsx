import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { HomePage } from '../features/home/HomePage'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { KitchenIcon } from './KitchenIcon'

type AppShellProps = {
  user: User
}

type AppView = 'home' | 'inventory'

export function AppShell({ user }: AppShellProps) {
  const [view, setView] = useState<AppView>('home')
  const [inventoryCreateRequest, setInventoryCreateRequest] = useState(0)

  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  function changeView(nextView: AppView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openInventoryCreate() {
    setInventoryCreateRequest((value) => value + 1)
    setView('inventory')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app-layout">
      <header className="app-header">
        <div className="app-brand">
          <div className="brand-mark brand-mark-small" aria-hidden="true">K</div>
          <div>
            <p className="brand-kicker">Kitchen</p>
            <p className="app-greeting">Dzień dobry</p>
          </div>
        </div>
        <button className="icon-button" type="button" onClick={handleLogout} aria-label="Wyloguj z Kitchen" title="Wyloguj">
          <KitchenIcon name="logout" />
        </button>
      </header>

      {view === 'home' ? (
        <HomePage ownerId={user.id} onAddProduct={openInventoryCreate} />
      ) : (
        <InventoryPage ownerId={user.id} createRequestToken={inventoryCreateRequest} />
      )}

      <nav className="bottom-nav" aria-label="Główna nawigacja Kitchen">
        <button className={`nav-item${view === 'home' ? ' is-active' : ''}`} type="button" onClick={() => changeView('home')} aria-current={view === 'home' ? 'page' : undefined}>
          <KitchenIcon name="home" />
          <span>Start</span>
        </button>
        <button className={`nav-item${view === 'inventory' ? ' is-active' : ''}`} type="button" onClick={() => changeView('inventory')} aria-current={view === 'inventory' ? 'page' : undefined}>
          <KitchenIcon name="inventory" />
          <span>Zapasy</span>
        </button>
        <button className="nav-item" type="button" disabled aria-label="Zakupy — moduł w przygotowaniu">
          <KitchenIcon name="shopping" />
          <span>Zakupy</span>
        </button>
        <button className="nav-item" type="button" disabled aria-label="Przepisy — moduł w przygotowaniu">
          <KitchenIcon name="recipes" />
          <span>Przepisy</span>
        </button>
      </nav>
    </main>
  )
}
