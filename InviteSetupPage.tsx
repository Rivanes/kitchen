import { type FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'

/** Shown after native Supabase Auth invite email verification.
 * Membership is activated only after a verified session sets a password.
 */
export function InviteSetupPage({ userId }: { userId: string | null }) {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    setChecking(true)
    setReady(false)
    async function verify() {
      if (!userId || !supabase) { if (active) setChecking(false); return }
      try {
        const { data, error } = await supabase.functions.invoke('kitchen-invites', { body: { action: 'status' } })
        if (active && !error) setReady(data?.pending === true)
      } finally { if (active) setChecking(false) }
    }
    void verify()
    return () => { active = false }
  }, [userId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !userId || !ready || busy) return
    if (password.length < 12 || password !== confirm) {
      setMessage('Hasło musi mieć co najmniej 12 znaków i oba pola muszą być identyczne.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw Error('password')
      const { data, error } = await supabase.functions.invoke('kitchen-invites', { body: { action: 'activate' } })
      if (error || data?.activated !== true) throw Error('activate')
      // Reload with fresh MembershipGate; old or denied user state is unmounted.
      window.location.replace(import.meta.env.BASE_URL)
    } catch {
      setMessage('Nie udało się ukończyć aktywacji. Jeśli hasło zostało zapisane, skontaktuj się z administratorem przed ponowną próbą.')
    } finally { setBusy(false) }
  }

  return <main className="auth-layout">
    <section className="login-card" aria-labelledby="setup-title">
      <div className="brand-row"><div className="brand-mark" aria-hidden="true">K</div>
        <div><p className="brand-kicker">Kitchen</p><p className="brand-caption">Aktywacja konta</p></div>
      </div>
      <div className="login-heading">
        <p className="eyebrow">Weryfikacja e-mail</p>
        <h1 id="setup-title">Ustaw hasło</h1>
        <p className="login-intro">Po zapisaniu hasła Twoje konto Kitchen zostanie aktywowane.</p>
      </div>
      {checking ? <p role="status">Sprawdzanie zaproszenia…</p>
        : !userId ? <div className="notice notice-error" role="alert">Nie ma aktywnej sesji. Otwórz wiadomość zapraszającą ponownie.</div>
          : !ready ? <div className="notice notice-error" role="alert">Zaproszenie nie może zostać aktywowane. Sprawdź konto i link z wiadomości.</div>
            : <form className="login-form" onSubmit={submit}>
              <label><span>Hasło (minimum 12 znaków)</span><input type="password" autoComplete="new-password" minLength={12} required disabled={busy}
                value={password} onChange={e => setPassword(e.target.value)}/></label>
              <label><span>Powtórz hasło</span><input type="password" autoComplete="new-password" minLength={12} required disabled={busy}
                value={confirm} onChange={e => setConfirm(e.target.value)}/></label>
              {message ? <div className="notice notice-error" role="alert">{message}</div> : null}
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Aktywacja…' : 'Ustaw hasło i aktywuj'}</button>
            </form>}
      <p className="login-footnote">W razie problemów możesz wrócić do zaproszenia w swojej skrzynce.</p>
    </section>
  </main>
}
