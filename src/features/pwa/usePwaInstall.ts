import { useEffect, useState } from 'react'

/** Browser event is intentionally optional; Safari/iOS has no JS install prompt. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function isStandaloneApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function detectIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function usePwaInstall() {
  const [installed, setInstalled] = useState(isStandaloneApp)
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const ios = detectIos()

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    const mode = window.matchMedia('(display-mode: standalone)')
    const onModeChange = () => setInstalled(isStandaloneApp())
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    mode.addEventListener('change', onModeChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      mode.removeEventListener('change', onModeChange)
    }
  }, [])

  async function requestInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!promptEvent || installed) return 'unavailable'
    const event = promptEvent
    setPromptEvent(null) // A deferred event is single-use.
    setInstalling(true)
    try {
      await event.prompt()
      const choice = await event.userChoice
      // 'accepted' is not the same as installation completed; appinstalled signals that.
      return choice.outcome
    } catch {
      return 'unavailable'
    } finally {
      setInstalling(false)
    }
  }

  return { installed, ios, canPrompt: Boolean(promptEvent) && !installed, installing, requestInstall }
}

export type PwaInstallState = ReturnType<typeof usePwaInstall>
