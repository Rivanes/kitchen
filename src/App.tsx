import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from './components/LoginPage'
import { InvitationPage } from './components/InvitationPage'
import { InviteSetupPage } from './components/InviteSetupPage'
import { MembershipGate } from './components/MembershipGate'
import { hasSupabaseConfig, supabase } from './lib/supabase/client'

// H7.3: token is kept in component memory, then removed from the URL on mount.
const initialInviteToken = new URLSearchParams(window.location.search).get('invite')
const initialOnboarding = new URLSearchParams(window.location.search).get('onboarding') === '1'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(hasSupabaseConfig)

  useEffect(() => {
    if (initialInviteToken) {
      const sanitized = new URL(window.location.href)
      sanitized.searchParams.delete('invite')
      window.history.replaceState(null, '', sanitized.pathname + sanitized.search + sanitized.hash)
    }
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

  if (initialInviteToken) return <InvitationPage token={initialInviteToken} />
  if (initialOnboarding) return <InviteSetupPage userId={session?.user?.id ?? null} />

  if (!session?.user) {
    return <LoginPage configurationMissing={!hasSupabaseConfig} />
  }

  return <MembershipGate key={session.user.id} user={session.user} />
}
