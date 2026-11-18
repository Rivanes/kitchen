type Props = {
  needRefresh: boolean
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
}

/** Only mounted on the idle Hub, never over a Food/Cleaning editor. */
export function PwaUpdateNotice({ needRefresh, updateServiceWorker }: Props) {
  if (!needRefresh) return null
  return (
    <section className="pwa-update-notice" role="status" aria-label="Aktualizacja Kitchen">
      <p>Dostępna aktualizacja</p>
      <button type="button" className="secondary-button" onClick={() => { void updateServiceWorker(true) }}>Aktualizuj</button>
    </section>
  )
}
