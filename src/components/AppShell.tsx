import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { KitchenIcon } from './KitchenIcon'

type AppShellProps = {
  user: User
}

type AppView = 'home' | 'inventory'

const futureModules = [
  { label: 'Zakupy', description: 'Lista zakupów i szybkie odhaczanie', icon: 'shopping' as const, stage: 'V2' },
  { label: 'Przepisy', description: 'Twoja własna baza przepisów', icon: 'recipes' as const, stage: 'V3' },
]

export function AppShell({ user }: AppShellProps) {
  const [view, setView] = useState<AppView>('home')

  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  function changeView(nextView: AppView) {
    setView(nextView)
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
        <>
          <section className="welcome-card" aria-labelledby="home-title">
            <div className="welcome-icon" aria-hidden="true"><KitchenIcon name="inventory" size={24} strokeWidth={2.1} /></div>
            <div>
              <p className="eyebrow">Twoja kuchnia</p>
              <h1 id="home-title">Wszystko pod ręką</h1>
              <p>Kitchen porządkuje zapasy, a kolejne moduły połączą je z zakupami i przepisami.</p>
            </div>
          </section>

          <section className="section-block" aria-labelledby="modules-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Moduły</p>
                <h2 id="modules-title">Co chcesz sprawdzić?</h2>
              </div>
            </div>

            <div className="module-grid">
              <button className="module-card module-card-action" type="button" onClick={() => changeView('inventory')}>
                <div className="module-icon" aria-hidden="true"><KitchenIcon name="inventory" /></div>
                <div className="module-copy">
                  <div className="module-title-row">
                    <h3>Zapasy</h3>
                    <span className="module-status-live">Aktywne</span>
                  </div>
                  <p>Lodówka, zamrażarka i szafki.</p>
                  <small>Sprawdź aktualny stan produktów.</small>
                </div>
              </button>

              {futureModules.map((module) => (
                <article className="module-card module-card-future" key={module.label}>
                  <div className="module-icon" aria-hidden="true"><KitchenIcon name={module.icon} /></div>
                  <div className="module-copy">
                    <div className="module-title-row">
                      <h3>{module.label}</h3>
                      <span>{module.stage}</span>
                    </div>
                    <p>{module.description}</p>
                    <small>Moduł pojawi się w kolejnym etapie.</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="account-card" aria-label="Informacje o sesji">
            <div>
              <span className="account-label">Zalogowano jako</span>
              <strong>{user.email ?? 'użytkownik'}</strong>
            </div>
            <span className="security-badge"><KitchenIcon name="lock" size={16} /> Właściciel</span>
          </section>
        </>
      ) : (
        <InventoryPage ownerId={user.id} />
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
