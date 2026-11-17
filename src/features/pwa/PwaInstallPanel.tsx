import { useEffect, useState } from 'react'
import type { PwaInstallState } from './usePwaInstall'

type Props = { install: PwaInstallState }

/** Discrete help on the hub; never inserts a third Home module tile. */
export function PwaInstallPanel({ install }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (install.installed) setExpanded(false)
  }, [install.installed])

  if (install.installed) return null

  async function handlePrompt() {
    setFeedback('')
    const outcome = await install.requestInstall()
    if (outcome === 'accepted') setFeedback('Jeśli instalacja się zakończy, otwórz Kitchen z ikony na ekranie.')
    else if (outcome === 'dismissed') setFeedback('Instalacja została anulowana. Możesz spróbować później.')
    else setFeedback('Instalacja nie jest teraz dostępna. Skorzystaj z menu przeglądarki.')
  }

  return (
    <div className="pwa-hub-help">
      <button type="button" className="pwa-hub-help-trigger" aria-expanded={expanded}
        aria-controls="pwa-install-instructions" onClick={() => { setExpanded((value) => !value); setFeedback('') }}>
        Zainstaluj Kitchen na telefonie
      </button>
      {expanded && (
        <section id="pwa-install-instructions" className="pwa-install-panel" aria-label="Instalacja Kitchen">
          <h2>Kitchen na ekranie głównym</h2>
          {install.ios ? (
            <p>Na iPhonie lub iPadzie otwórz menu <strong>Udostępnij</strong>, wybierz <strong>Dodaj do ekranu początkowego</strong> i potwierdź przyciskiem <strong>Dodaj</strong>.</p>
          ) : install.canPrompt ? (
            <button className="primary-button" type="button" disabled={install.installing}
              onClick={() => { void handlePrompt() }}>
              {install.installing ? 'Otwieram instalację…' : 'Zainstaluj Kitchen'}
            </button>
          ) : (
            <p>Otwórz menu przeglądarki i wybierz <strong>Zainstaluj aplikację</strong> albo <strong>Dodaj do ekranu głównego</strong>, jeśli ta opcja jest dostępna.</p>
          )}
          <p className="pwa-install-note">Kitchen uruchomi się z osobnej ikony. Do logowania i zapisywania danych potrzebujesz internetu.</p>
          {feedback && <p role="status" className="pwa-install-feedback">{feedback}</p>}
          <button className="pwa-close-help" type="button" onClick={() => setExpanded(false)}>Zamknij instrukcję</button>
        </section>
      )}
    </div>
  )
}
