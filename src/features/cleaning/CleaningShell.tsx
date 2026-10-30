import { useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { supabase } from '../../lib/supabase/client'

type CleaningView = 'start' | 'rooms' | 'schedule'

type CleaningShellProps = {
  onExit: () => void
}

/** H1 navigation shell only: no rooms/tasks persistence until H2/H3. */
export function CleaningShell({ onExit }: CleaningShellProps) {
  const [view, setView] = useState<CleaningView>('start')

  function changeView(nextView: CleaningView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <main className="app-layout cleaning-shell">
      <header className="app-header cleaning-header">
        <div className="app-brand">
          <div className="brand-mark brand-mark-small cleaning-brand-mark" aria-hidden="true"><KitchenIcon name="cleaning" size={23} /></div>
          <div>
            <p className="brand-kicker">Porządki</p>
            <p className="app-greeting">Twój dom, Twój rytm</p>
          </div>
        </div>
        <div className="module-header-actions">
          <button className="module-home-button" type="button" onClick={onExit} aria-label="Wróć do strony głównej Dom">
            <KitchenIcon name="home" size={19} /><span>Dom</span>
          </button>
          <button className="icon-button" type="button" onClick={() => { void supabase?.auth.signOut() }} aria-label="Wyloguj" title="Wyloguj">
            <KitchenIcon name="logout" />
          </button>
        </div>
      </header>

      {view === 'start' && (
        <section className="cleaning-page" aria-labelledby="cleaning-start-title">
          <div className="cleaning-hero">
            <div>
              <p className="eyebrow">DZISIAJ</p>
              <h1 id="cleaning-start-title">Spokojnie, po kolei.</h1>
              <p>W tym miejscu zobaczysz zadania na dziś, zaległe i nadchodzące.</p>
            </div>
            <span className="cleaning-hero-icon" aria-hidden="true"><KitchenIcon name="check" size={27} /></span>
          </div>
          <section className="cleaning-section" aria-labelledby="cleaning-today-title">
            <div className="cleaning-section-title"><h2 id="cleaning-today-title">Do zrobienia</h2><span className="cleaning-section-note">Brak zadań</span></div>
            <div className="cleaning-empty-state">
              <span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="room" size={26} /></span>
              <h3>Tu pojawią się Twoje porządki</h3>
              <p>W następnym etapie dodamy pomieszczenia, a później zadania i przypomnienia o ich wykonaniu.</p>
              <button type="button" className="cleaning-action" onClick={() => changeView('rooms')}>Przejdź do pomieszczeń <KitchenIcon name="chevronRight" size={18} /></button>
            </div>
          </section>
        </section>
      )}

      {view === 'rooms' && (
        <section className="cleaning-page" aria-labelledby="cleaning-rooms-title">
          <div className="cleaning-page-heading">
            <p className="eyebrow">TWÓJ DOM</p>
            <h1 id="cleaning-rooms-title">Pomieszczenia</h1>
            <p>Wszystkie miejsca, o które chcesz zadbać.</p>
          </div>
          <div className="cleaning-empty-state cleaning-empty-spacious">
            <span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="room" size={28} /></span>
            <h2>Jeszcze nie ma pomieszczeń</h2>
            <p>Dodawanie łazienki, kuchni i innych pomieszczeń udostępnimy w etapie H2. Na razie nie zapisujemy żadnych danych.</p>
          </div>
        </section>
      )}

      {view === 'schedule' && (
        <section className="cleaning-page" aria-labelledby="cleaning-schedule-title">
          <div className="cleaning-page-heading">
            <p className="eyebrow">PLAN DNIA</p>
            <h1 id="cleaning-schedule-title">Harmonogram</h1>
            <p>W jednym miejscu zobaczysz, co jest do zrobienia i kiedy.</p>
          </div>
          <div className="cleaning-empty-state cleaning-empty-spacious">
            <span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="calendar" size={29} /></span>
            <h2>Twój harmonogram jest pusty</h2>
            <p>Gdy powstaną zadania i cykle powtarzania, pojawi się tutaj agenda. Kalendarz uruchomimy w etapie H5.</p>
          </div>
        </section>
      )}

      <nav className="bottom-nav cleaning-bottom-nav" aria-label="Nawigacja Porządki">
        <button className={`nav-item${view === 'start' ? ' is-active' : ''}`} type="button" onClick={() => changeView('start')} aria-current={view === 'start' ? 'page' : undefined}>
          <KitchenIcon name="home" /><span>Start</span>
        </button>
        <button className={`nav-item${view === 'rooms' ? ' is-active' : ''}`} type="button" onClick={() => changeView('rooms')} aria-current={view === 'rooms' ? 'page' : undefined}>
          <KitchenIcon name="room" /><span>Pomieszczenia</span>
        </button>
        <button className={`nav-item${view === 'schedule' ? ' is-active' : ''}`} type="button" onClick={() => changeView('schedule')} aria-current={view === 'schedule' ? 'page' : undefined}>
          <KitchenIcon name="calendar" /><span>Harmonogram</span>
        </button>
      </nav>
    </main>
  )
}
