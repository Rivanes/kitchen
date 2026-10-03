import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { KitchenIcon } from './KitchenIcon'

type AppShellProps = {
  user: User
}

const futureModules = [
  { id: 'inventory', label: 'Zapasy', description: 'Lodówka, zamrażarka i szafki', icon: 'inventory' as const, stage: 'V1' },
  { id: 'shopping', label: 'Zakupy', description: 'Lista zakupów i szybkie odhaczanie', icon: 'shopping' as const, stage: 'V2' },
  { id: 'recipes', label: 'Przepisy', description: 'Twoja własna baza przepisów', icon: 'recipes' as const, stage: 'V3' },
]

export function AppShell({ user }: AppShellProps) {
  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="app-layout" id="start">
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

      <section className="welcome-card" aria-labelledby="foundation-title">
        <div className="welcome-icon" aria-hidden="true"><KitchenIcon name="check" size={24} strokeWidth={2.2} /></div>
        <div>
          <p className="eyebrow">Foundation V0.3</p>
          <h1 id="foundation-title">Kitchen jest gotowe</h1>
          <p>Bezpieczny fundament działa. Teraz aplikacja ma jasny, mobilny interfejs przygotowany pod kolejne moduły.</p>
        </div>
      </section>

      <section className="section-block" aria-labelledby="modules-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Następne etapy</p>
            <h2 id="modules-title">Twoja kuchnia</h2>
          </div>
          <span className="status-chip">Mobile first</span>
        </div>

        <div className="module-grid">
          {futureModules.map((module) => (
            <article className="module-card" id={module.id} key={module.id}>
              <div className="module-icon" aria-hidden="true"><KitchenIcon name={module.icon} /></div>
              <div className="module-copy">
                <div className="module-title-row">
                  <h3>{module.label}</h3>
                  <span>{module.stage}</span>
                </div>
                <p>{module.description}</p>
                <small>Moduł zostanie dodany w kolejnym etapie.</small>
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

      <nav className="bottom-nav" aria-label="Główna nawigacja Kitchen">
        <button className="nav-item is-active" type="button" onClick={() => scrollToSection('start')} aria-current="page">
          <KitchenIcon name="home" />
          <span>Start</span>
        </button>
        <button className="nav-item" type="button" onClick={() => scrollToSection('inventory')}>
          <KitchenIcon name="inventory" />
          <span>Zapasy</span>
        </button>
        <button className="nav-item" type="button" onClick={() => scrollToSection('shopping')}>
          <KitchenIcon name="shopping" />
          <span>Zakupy</span>
        </button>
        <button className="nav-item" type="button" onClick={() => scrollToSection('recipes')}>
          <KitchenIcon name="recipes" />
          <span>Przepisy</span>
        </button>
      </nav>
    </main>
  )
}
