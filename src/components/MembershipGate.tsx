import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { HomeHubShell } from './HomeHubShell'
import { KitchenIcon } from './KitchenIcon'
import { StartupPending } from './StartupScreen'
import type { PwaInstallState } from '../features/pwa/usePwaInstall'

type MemberStatus = 'checking' | 'active' | 'suspended' | 'denied' | 'error'
type MemberAccess = { kitchen_role: 'admin' | 'member'; kitchen_status: 'active' | 'suspended' }
// A lost browser focus/visibility event must not leave private data exposed
// for five minutes. This is a foreground safety net, NOT a substitute for RLS.
const FOREGROUND_RECHECK_MS = 30 * 1000

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
    let backgroundRevision = 0
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
      const verifiedRevision = backgroundRevision
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
          if (foregroundQueued) {
            foregroundQueued = false
            void verifyMembership(true)
          } else if (verifiedRevision !== backgroundRevision && document.visibilityState === 'visible') {
            // The app was backgrounded during this read: its ACTIVE result
            // predates a new exposure and must never unlock the cached view.
            void verifyMembership(true)
          } else if (verifiedRevision === backgroundRevision && document.visibilityState === 'visible') {
            setRechecking(false)
          } else {
            // Remain hidden while the browser is in the background.
            setRechecking(true)
          }
        }
      }
    }

    // Hide the mounted private subtree as soon as the document loses focus,
    // including when the browser/PWA is backgrounded. On return an ACTIVE
    // server response is required before the subtree is shown again.
    function pausePrivateView() {
      if (current) {
        backgroundRevision += 1
        setRechecking(true)
      }
    }
    function checkForeground() {
      if (current && document.visibilityState === 'visible') void verifyMembership(true)
    }
    function checkVisibility() {
      if (document.visibilityState === 'hidden') pausePrivateView()
      else checkForeground()
    }
    document.addEventListener('visibilitychange', checkVisibility)
    window.addEventListener('blur', pausePrivateView)
    window.addEventListener('focus', checkForeground)
    window.addEventListener('pageshow', checkForeground)
    window.addEventListener('online', checkForeground)
    // Browsers and virtual PWAs can miss a resume event: cap the foreground
    // detection delay to 30 s even when focus/visibility never fires.
    const periodicCheck = window.setInterval(checkForeground, FOREGROUND_RECHECK_MS)
    void verifyMembership()
    return () => {
      current = false
      foregroundQueued = false
      window.clearInterval(periodicCheck)
      document.removeEventListener('visibilitychange', checkVisibility)
      window.removeEventListener('blur', pausePrivateView)
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
