import { useEffect, useState } from 'react'

/** The native prompt is an optional browser capability, not a condition for showing help. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false
  const displayMode = typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = typeof navigator !== 'undefined' &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return Boolean(displayMode || iosStandalone)
}

export function usePwaInstall() {
  // Only the current display context is observable across browsers.
  // An appinstalled event does not mean this browser tab is running standalone.
  const [runningStandalone, setRunningStandalone] = useState(isStandaloneApp)
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      const candidate = event as InstallPromptEvent
      if (typeof candidate.prompt !== 'function' || !candidate.userChoice) return
      event.preventDefault()
      setPromptEvent(candidate)
    }
    const onInstalled = () => {
      setPromptEvent(null)
    }
    const onModeChange = () => setRunningStandalone(isStandaloneApp())
    const mode = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)') : null

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('pageshow', onModeChange)
    if (mode) {
      if (typeof mode.addEventListener === 'function') mode.addEventListener('change', onModeChange)
      else mode.addListener(onModeChange)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('pageshow', onModeChange)
      if (mode) {
        if (typeof mode.removeEventListener === 'function') mode.removeEventListener('change', onModeChange)
        else mode.removeListener(onModeChange)
      }
    }
  }, [])

  async function requestInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!promptEvent || runningStandalone) return 'unavailable'
    const event = promptEvent
    setPromptEvent(null) // A deferred event is single-use.
    setInstalling(true)
    try {
      await event.prompt()
      const choice = await event.userChoice
      // Accepted is not synonymous with installed; appinstalled confirms it.
      return choice.outcome
    } catch {
      return 'unavailable'
    } finally {
      setInstalling(false)
    }
  }

  return { runningStandalone, canPrompt: Boolean(promptEvent) && !runningStandalone, installing, requestInstall }
}

export type PwaInstallState = ReturnType<typeof usePwaInstall>
