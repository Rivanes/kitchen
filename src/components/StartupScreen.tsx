import { useEffect, useState } from 'react'
import { KitchenIcon } from './KitchenIcon'

// The exit animation ends before the component is removed. No auth or network
// operation is delayed by this purely visual, once-per-document sequence.
const INTRO_LIFETIME_MS = 1650

function shouldShowIntro(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && document.visibilityState !== 'hidden'
}

export function LaunchIntro() {
  const [visible, setVisible] = useState(shouldShowIntro)

  useEffect(() => {
    if (!visible) return

    const timer = window.setTimeout(() => setVisible(false), INTRO_LIFETIME_MS)
    const dismissWhenHidden = () => {
      if (document.visibilityState === 'hidden') setVisible(false)
    }
    document.addEventListener('visibilitychange', dismissWhenHidden)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', dismissWhenHidden)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="launch-intro" role="status" aria-label="Uruchamianie Kitchen">
      <div className="launch-intro-content" aria-hidden="true">
        <div className="launch-intro-symbol">
          <span className="launch-intro-halo launch-intro-halo-outer" />
          <span className="launch-intro-halo launch-intro-halo-inner" />
          <span className="launch-intro-emblem"><KitchenIcon name="home" size={43} strokeWidth={1.75} /></span>
        </div>
        <span className="launch-intro-wordmark">Kitchen</span>
        <span className="launch-intro-accent" />
      </div>
    </div>
  )
}

/** Shared slow-start fallback for Auth and Membership; it never grants access. */
export function StartupPending({ message }: { message: string }) {
  return (
    <main className="loading-layout" role="status" aria-live="polite">
      <span className="loading-mark" aria-hidden="true"><KitchenIcon name="home" size={25} /></span>
      <span className="loading-dot" aria-hidden="true" />
      <p>{message}</p>
    </main>
  )
}
