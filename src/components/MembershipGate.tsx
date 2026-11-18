import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { HomeHubShell } from './HomeHubShell'
import { KitchenIcon } from './KitchenIcon'
import { StartupPending } from './StartupScreen'
import type { PwaInstallState } from '../features/pwa/usePwaInstall'

type MemberStatus = 'checking' | 'active' | 'suspended' | 'denied' | 'error'
type MemberAccess = { kitchen_role: 'admin' | 'member'; kitchen_status: 'active' | 'suspended' }

/** Keyed by user.id in App: old account state is unmounted BEFORE this renders. */
export function MembershipGate({ user, adminRoute = false, onNavigateAdmin, install, needPwaRefresh, updatePwa }: {
  user: User
  adminRoute?: boolean
  onNavigateAdmin?: (active: boolean) => void
  install: PwaInstallState
  needPwaRefresh: boolean
  updatePwa: (reloadPage?: boolean) => Promise<void>
}) {
  const [status, setStatus] = useState<MemberStatus>('checking')
  const [role, setRole] = useState<MemberAccess['kitchen_role'] | null>(null)
  const [rechecking, setRechecking] = useState(false)

  useEffect(() => {
    let current = true
    let inFlight = false
    let foregroundQueued = false
    setStatus('checking')
    setRole(null)
    setRechecking(false)

    async function verifyMembership(foreground = false) {
      // Focus, visibility and online can fire together. Serialize checks; if
      // resume happens during an older read, make ONE fresh read afterward.
      if (inFlight) {
        if (foreground) foregroundQueued = true
        return
      }
      inFlight = true
      if (foreground) setRechecking(true)
      if (!supabase) {
        if (current) setStatus('error')
        inFlight = false
        return
      }
      try {
        const { data, error } = await supabase.rpc('kitchen_my_access')
        if (!current) return
        if (error) {
          setRole(null)
          setStatus('error')
          return
        }
        const rows = Array.isArray(data) ? data as MemberAccess[] : []
        const account = rows[0]
        if (!account || !['admin', 'member'].includes(account.kitchen_role)) {
          setRole(null)
          setStatus('denied')
        } else if (account.kitchen_status === 'active') {
          setRole(account.kitchen_role)
          setStatus('active')
        } else if (account.kitchen_status === 'suspended') {
          setRole(null)
          setStatus('suspended')
        } else {
          setRole(null)
          setStatus('denied')
        }
      } catch {
        if (current) {
          setRole(null)
          setStatus('error')
        }
      } finally {
        inFlight = false
        if (current) {
          setRechecking(false)
          if (foregroundQueued) {
            foregroundQueued = false
            void verifyMembership(true)
          }
        }
      }
    }

    function checkForeground() {
      if (current && document.visibilityState === 'visible') void verifyMembership(true)
    }
    document.addEventListener('visibilitychange', checkForeground)
    window.addEventListener('focus', checkForeground)
    window.addEventListener('pageshow', checkForeground)
    window.addEventListener('online', checkForeground)
    // Also revalidate long-lived foreground sessions, not only resumed PWAs.
    const periodicCheck = window.setInterval(checkForeground, 5 * 60 * 1000)
    void verifyMembership()
    return () => {
      current = false
      foregroundQueued = false
      window.clearInterval(periodicCheck)
      document.removeEventListener('visibilitychange', checkForeground)
      window.removeEventListener('focus', checkForeground)
      window.removeEventListener('pageshow', checkForeground)
      window.removeEventListener('online', checkForeground)
    }
  }, [user.id])

  if (status === 'active') {
    if (adminRoute && role !== 'admin') return <main className="auth-layout">
      <section className="login-card access-card" aria-labelledby="admin-rejected">
        <p className="eyebrow">Kitchen</p>
        <h1 id="admin-rejected">Brak dostępu do administratora</h1>
        <p className="login-intro">Panel zaproszeń jest dostępny wyłącznie dla administratora.</p>
        <button type="button" className="secondary-button" onClick={() => onNavigateAdmin?.(false)}>Wróć do Kitchen</button>
      </section>
    </main>
    return <>
      {/* Keep in-progress editors mounted, but do not expose cached private UI
          until the server has confirmed membership again. */}
      <div hidden={rechecking} aria-hidden={rechecking}>
        <HomeHubShell user={user} isAdmin={role === 'admin'} adminRoute={adminRoute} onNavigateAdmin={onNavigateAdmin}
          install={install} needPwaRefresh={needPwaRefresh} updatePwa={updatePwa} />
      </div>
      {rechecking ? <StartupPending message="Ponowne sprawdzanie dostępu…" /> : null}
    </>
  }
  if (status === 'checking') {
    return <StartupPending message="Sprawdzanie dostępu do Kitchen…" />
  }

  const message = status === 'suspended'
    ? 'Dostęp do tego konta Kitchen został wstrzymany.'
    : status === 'denied'
      ? 'To konto nie zostało zaproszone do Kitchen.'
      : 'Nie udało się potwierdzić dostępu. Aplikacja pozostaje zablokowana.'

  return <main className="auth-layout">
    <section className="login-card access-card" aria-labelledby="member-gate-title">
      <div className="brand-row">
        <div className="brand-mark" aria-hidden="true">K</div>
        <div><p className="brand-kicker">Kitchen</p><p className="brand-caption">Prywatna aplikacja domowa</p></div>
      </div>
      <div className="access-icon" aria-hidden="true"><KitchenIcon name="lock" size={26} /></div>
      <p className="eyebrow">Bezpieczny dostęp</p>
      <h1 id="member-gate-title">Dostęp zablokowany</h1>
      <p className="login-intro">{message}</p>
      <button className="secondary-button" type="button"
        onClick={() => { void supabase?.auth.signOut() }}>Wyloguj</button>
    </section>
  </main>
}
