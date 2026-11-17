import { useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import type { PwaInstallState } from './usePwaInstall'

type Props = { install: PwaInstallState }

/**
 * The entry point is ALWAYS visible on the Home hub, regardless of browser support.
 * Browser capabilities control only the instruction/prompt inside the disclosure.
 * This component never reads or writes authentication or product data.
 */
export function PwaInstallPanel({ install }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handlePrompt() {
    setFeedback('')
    const outcome = await install.requestInstall()
    if (outcome === 'accepted') {
      setFeedback('Potwierdzono prośbę o instalację. Po jej zakończeniu otwórz Kitchen z ikony.')
    } else if (outcome === 'dismissed') {
      setFeedback('Instalacja została anulowana. Instrukcja ręczna pozostaje dostępna poniżej.')
    } else {
      setFeedback('Systemowe okno nie jest dostępne. Możesz skorzystać z instrukcji ręcznej.')
    }
  }

  return (
    <div className="pwa-hub-help">
      <button type="button" className="pwa-hub-help-trigger"
        aria-expanded={expanded} aria-controls="pwa-install-instructions"
        onClick={() => { setExpanded(value => !value); setFeedback('') }}>
        <KitchenIcon name={install.installed ? 'check' : 'link'} size={17} />
        <span>{install.installed ? 'Kitchen jest zainstalowany' : 'Zainstaluj Kitchen'}</span>
        <KitchenIcon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} />
      </button>
      {expanded && (
        <section id="pwa-install-instructions" className="pwa-install-panel" aria-label="Instalacja Kitchen">
          {install.installed ? (
            <>
              <h2>Kitchen jako aplikacja</h2>
              <p>Kitchen zostało dodane do ekranu głównego lub działa już jako aplikacja. Możesz otwierać je z ikony na swoim urządzeniu.</p>
            </>
          ) : (
            <>
              <h2>Kitchen na ekranie głównym</h2>
              <p>Dodaj Kitchen do telefonu, aby otwierać ją bezpośrednio z ikony.</p>
              {install.canPrompt && (
                <button className="primary-button" type="button" disabled={install.installing}
                  onClick={() => { void handlePrompt() }}>
                  {install.installing ? 'Otwieram instalację…' : 'Otwórz instalację systemową'}
                </button>
              )}
              <div className="pwa-install-guides">
                <div>
                  <h3>iPhone / iPad</h3>
                  <p>Otwórz <strong>Udostępnij</strong> lub menu przeglądarki, wybierz <strong>Dodaj do ekranu początkowego</strong> i potwierdź. Jeśli tej opcji nie ma, otwórz Kitchen w Safari i użyj przycisku Udostępnij.</p>
                </div>
                <div>
                  <h3>Android / inne urządzenia</h3>
                  <p>W menu przeglądarki wybierz <strong>Zainstaluj aplikację</strong> albo <strong>Dodaj do ekranu głównego</strong>. Dostępność zależy od przeglądarki.</p>
                </div>
              </div>
              <p className="pwa-install-note">Nie każda przeglądarka obsługuje instalację aplikacji. Do logowania i zapisywania danych Kitchen nadal potrzebuje internetu.</p>
              {feedback && <p role="status" className="pwa-install-feedback">{feedback}</p>}
            </>
          )}
          <button className="pwa-close-help" type="button" onClick={() => setExpanded(false)}>Zamknij instrukcję</button>
        </section>
      )}
    </div>
  )
}
