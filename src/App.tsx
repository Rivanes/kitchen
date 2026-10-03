import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from './components/LoginPage'
import { OwnerGate } from './components/OwnerGate'
import { hasSupabaseConfig, supabase } from './lib/supabase/client'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(hasSupabaseConfig)

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false)
      return
    }

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setCheckingSession(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (checkingSession) {
    return (
      <main className="loading-layout" aria-live="polite">
        <div className="loading-dot" aria-hidden="true" />
        <p>Sprawdzanie sesji…</p>
      </main>
    )
  }

  if (!session?.user) {
    return <LoginPage configurationMissing={!hasSupabaseConfig} />
  }

  return <OwnerGate user={session.user} />
}
