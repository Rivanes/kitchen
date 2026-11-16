import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { HomeHubShell } from './HomeHubShell'
import { KitchenIcon } from './KitchenIcon'

type MemberStatus = 'checking' | 'active' | 'suspended' | 'denied' | 'error'
type MemberAccess = { kitchen_role: 'admin' | 'member'; kitchen_status: 'active' | 'suspended' }

/** Keyed by user.id in App: old account state is unmounted BEFORE this renders. */
export function MembershipGate({ user }: { user: User }) {
  const [status, setStatus] = useState<MemberStatus>('checking')

  useEffect(() => {
    let current = true
    setStatus('checking')

    async function verifyMembership() {
      if (!supabase) {
        if (current) setStatus('error')
        return
      }
      try {
        const { data, error } = await supabase.rpc('kitchen_my_access')
        if (!current) return
        if (error) {
          setStatus('error')
          return
        }
        const rows = Array.isArray(data) ? data as MemberAccess[] : []
        const account = rows[0]
        if (!account || !['admin', 'member'].includes(account.kitchen_role)) {
          setStatus('denied')
        } else if (account.kitchen_status === 'active') {
          setStatus('active')
        } else if (account.kitchen_status === 'suspended') {
          setStatus('suspended')
        } else {
          setStatus('denied')
        }
      } catch {
        if (current) setStatus('error')
      }
    }
    void verifyMembership()
    return () => { current = false }
  }, [user.id])

  if (status === 'active') return <HomeHubShell user={user} />
  if (status === 'checking') {
    return <main className="loading-layout" aria-live="polite">
      <div className="loading-mark" aria-hidden="true">K</div>
      <div className="loading-dot" aria-hidden="true" />
      <p>Sprawdzanie dostępu do Kitchen…</p>
    </main>
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
