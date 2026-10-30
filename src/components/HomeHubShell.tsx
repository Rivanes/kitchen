import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { AppShell } from './AppShell'
import { CleaningShell } from '../features/cleaning/CleaningShell'
import { KitchenIcon } from './KitchenIcon'

type HomeModule = 'hub' | 'food' | 'cleaning'

/** Auth and OwnerGate live above this component. Modules own their own navigation. */
export function HomeHubShell({ user }: { user: User }) {
  const [module, setModule] = useState<HomeModule>('hub')

  function openModule(nextModule: Exclude<HomeModule, 'hub'>) {
    setModule(nextModule)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function returnHome() {
    setModule('hub')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  if (module === 'food') return <AppShell user={user} onExit={returnHome} />
  if (module === 'cleaning') return <CleaningShell ownerId={user.id} onExit={returnHome} />

  return (
    <main className="app-layout home-hub-layout">
      <header className="app-header">
        <div className="app-brand">
          <div className="brand-mark brand-mark-small home-hub-brand" aria-hidden="true"><KitchenIcon name="home" size={22} /></div>
          <div>
            <p className="brand-kicker">Dom</p>
            <p className="app-greeting">Wszystko w jednym miejscu</p>
          </div>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => { void supabase?.auth.signOut() }}
          aria-label="Wyloguj"
          title="Wyloguj"
        >
          <KitchenIcon name="logout" />
        </button>
      </header>

      <section className="home-hub-main" aria-labelledby="home-hub-title">
        <div className="home-hub-heading">
          <p className="eyebrow">TWÓJ DOM</p>
          <h1 id="home-hub-title">Co dziś robimy?</h1>
          <p>Wybierz, czym chcesz się zająć.</p>
        </div>
        <div className="home-hub-modules">
          <button type="button" className="home-hub-module home-hub-food" onClick={() => openModule('food')}>
            <span className="home-hub-module-icon" aria-hidden="true"><KitchenIcon name="food" size={32} /></span>
            <span className="home-hub-module-label">Jedzenie</span>
            <span className="home-hub-module-caption">Zapasy, zakupy i przepisy</span>
            <span className="home-hub-module-arrow" aria-hidden="true"><KitchenIcon name="chevronRight" size={18} /></span>
          </button>
          <button type="button" className="home-hub-module home-hub-cleaning" onClick={() => openModule('cleaning')}>
            <span className="home-hub-module-icon" aria-hidden="true"><KitchenIcon name="cleaning" size={32} /></span>
            <span className="home-hub-module-label">Porządki</span>
            <span className="home-hub-module-caption">Pomieszczenia i harmonogram</span>
            <span className="home-hub-module-arrow" aria-hidden="true"><KitchenIcon name="chevronRight" size={18} /></span>
          </button>
        </div>
      </section>
    </main>
  )
}
