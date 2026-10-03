import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'

type AppShellProps = {
  user: User
}

export function AppShell({ user }: AppShellProps) {
  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  return (
    <main className="app-layout">
      <header className="app-header">
        <div>
          <p className="eyebrow">Foundation V0.2</p>
          <h1>Kitchen</h1>
        </div>
        <button className="secondary-button" type="button" onClick={handleLogout}>Wyloguj</button>
      </header>

      <section className="status-panel" aria-labelledby="foundation-title">
        <div className="status-icon" aria-hidden="true">✓</div>
        <div>
          <h2 id="foundation-title">Warstwa właściciela działa</h2>
          <p>Sesja Supabase Auth oraz dodatkowa weryfikacja pojedynczego właściciela są aktywne.</p>
        </div>
      </section>

      <section className="foundation-grid" aria-label="Status fundamentu">
        <article><strong>React + TypeScript</strong><span>gotowe</span></article>
        <article><strong>Vite + PWA</strong><span>gotowe</span></article>
        <article><strong>Supabase Auth</strong><span>sesja aktywna</span></article>
        <article><strong>Owner Gate</strong><span>potwierdzony</span></article>
      </section>

      <p className="session-meta">Zalogowano jako <strong>{user.email ?? 'użytkownik'}</strong></p>
    </main>
  )
}
