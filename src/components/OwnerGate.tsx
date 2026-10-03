import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { AppShell } from './AppShell'

type OwnerGateProps = {
  user: User
}

type OwnerGateStatus = 'checking' | 'allowed' | 'denied' | 'error'

export function OwnerGate({ user }: OwnerGateProps) {
  const [status, setStatus] = useState<OwnerGateStatus>('checking')

  useEffect(() => {
    let active = true

    async function verifyOwner() {
      if (!supabase) {
        if (active) setStatus('error')
        return
      }

      setStatus('checking')
      const { data, error } = await supabase.rpc('is_kitchen_owner')

      if (!active) return

      if (error) {
        setStatus('error')
        return
      }

      setStatus(data === true ? 'allowed' : 'denied')
    }

    void verifyOwner()

    return () => {
      active = false
    }
  }, [user.id])

  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  if (status === 'allowed') {
    return <AppShell user={user} />
  }

  if (status === 'checking') {
    return (
      <main className="loading-layout" aria-live="polite">
        <div className="loading-dot" aria-hidden="true" />
        <p>Weryfikacja dostępu właściciela…</p>
      </main>
    )
  }

  return (
    <main className="auth-layout">
      <section className="login-card" aria-labelledby="owner-gate-title">
        <div className="brand-mark" aria-hidden="true">K</div>
        <p className="eyebrow">Kitchen security</p>
        <h1 id="owner-gate-title">Dostęp zablokowany</h1>
        <p className="login-intro">
          {status === 'denied'
            ? 'To konto nie jest właścicielem tej instalacji Kitchen.'
            : 'Nie udało się potwierdzić uprawnień właściciela. Aplikacja pozostaje zablokowana.'}
        </p>
        <button className="secondary-button" type="button" onClick={handleLogout}>Wyloguj</button>
      </section>
    </main>
  )
}
