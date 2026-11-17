import { useEffect, useState } from 'react'

/** Browser connectivity hint only; never caches or queues private writes. */
export function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  if (online) return null
  return <div role="status" className="pwa-offline-banner">Brak połączenia z internetem. Zapisy danych wymagają połączenia.</div>
}
