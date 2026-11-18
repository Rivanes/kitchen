import { useEffect, useRef } from 'react'

/** Revalidate a mounted view when the PWA resumes; coalesce focus and visibility events. */
export function useForegroundRefresh(refresh: () => void, enabled = true) {
  const latestRefresh = useRef(refresh)
  latestRefresh.current = refresh

  useEffect(() => {
    if (!enabled) return
    let lastRefreshAt = 0
    const onResume = () => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - lastRefreshAt < 1500) return
      lastRefreshAt = now
      latestRefresh.current()
    }

    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('focus', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [enabled])
}
