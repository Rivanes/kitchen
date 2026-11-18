import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { usePwaInstall } from './features/pwa/usePwaInstall'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from './components/LoginPage'
import { StartupPending } from './components/StartupScreen'
import { InvitationPage } from './components/InvitationPage'
import { MembershipGate } from './components/MembershipGate'
import { hasSupabaseConfig, supabase } from './lib/supabase/client'

// H7.3: token is kept in component memory, then removed from the URL on mount.
const initialInviteToken = new URLSearchParams(window.location.search).get('invite')
const adminPath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/admin`
function isAdminLocation(): boolean {
  return window.location.pathname.replace(/\/$/, '') === adminPath
    || new URLSearchParams(window.location.search).get('kitchen_admin_route') === '1'
}

export default function App() {
  const install = usePwaInstall()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(hasSupabaseConfig)
  const [adminRoute, setAdminRoute] = useState(isAdminLocation)

  function navigateAdmin(next: boolean) {
    window.history.pushState(null, '', next ? adminPath : import.meta.env.BASE_URL)
    setAdminRoute(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.get('kitchen_admin_route') === '1') {
      query.delete('kitchen_admin_route')
      window.history.replaceState(null, '', adminPath + (query.size ? '?' + query.toString() : ''))
      setAdminRoute(true)
    }
    const onPopState = () => setAdminRoute(isAdminLocation())
    window.addEventListener('popstate', onPopState)
    if (initialInviteToken) {
      const sanitized = new URL(window.location.href)
      sanitized.searchParams.delete('invite')
      window.history.replaceState(null, '', sanitized.pathname + sanitized.search + sanitized.hash)
    }
    if (!supabase) {
      setCheckingSession(false)
      return () => window.removeEventListener('popstate', onPopState)
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
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  if (checkingSession) {
    return <StartupPending message="Sprawdzanie sesji…" />
  }

  if (initialInviteToken) return <InvitationPage token={initialInviteToken} />

  if (!session?.user) {
    return <LoginPage configurationMissing={!hasSupabaseConfig} />
  }

  return <MembershipGate key={session.user.id} user={session.user} adminRoute={adminRoute} onNavigateAdmin={navigateAdmin} install={install}
    needPwaRefresh={needRefresh} updatePwa={updateServiceWorker} />
}
