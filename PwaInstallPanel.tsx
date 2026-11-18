import { useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import type { PwaInstallState } from './usePwaInstall'

type Props = { install: PwaInstallState }

/**
 * Browser tabs always offer installation instructions, even without a native prompt.
 * Running as a standalone PWA does not need an install entry or an installed status.
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

  if (install.runningStandalone) return null

  return (
    <div className="pwa-hub-help">
      <button type="button" className="pwa-hub-help-trigger"
        aria-expanded={expanded} aria-controls="pwa-install-instructions"
        onClick={() => { setExpanded(value => !value); setFeedback('') }}>
        <KitchenIcon name="link" size={17} />
        <span>Zainstaluj Kitchen</span>
        <KitchenIcon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} />
      </button>
      {expanded && (
        <section id="pwa-install-instructions" className="pwa-install-panel" aria-label="Instalacja Kitchen">
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
          <button className="pwa-close-help" type="button" onClick={() => setExpanded(false)}>Zamknij instrukcję</button>
        </section>
      )}
    </div>
  )
}
