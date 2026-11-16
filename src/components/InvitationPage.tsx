import { type FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase/client'

/** H7.3: Public only because the visitor holds a server-issued, 256-bit token.
 * Opening a URL is NOT a claim; only submitting an email consumes the token.
 */
export function InvitationPage({ token }: { token: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy || !email.trim()) return
    setBusy(true)
    setMessage('')
    try {
      const { data, error } = await supabase.functions.invoke('kitchen-invites', {
        body: { action: 'claim', email: email.trim(), token },
      })
      if (error || data?.ok !== true) throw Error('claim failed')
      setSent(true)
    } catch {
      setMessage('Nie udało się wykorzystać zaproszenia. Link mógł wygasnąć lub zostać już użyty. Poproś administratora o nowy.')
    } finally { setBusy(false) }
  }

  return <main className="auth-layout">
    <section className="login-card" aria-labelledby="invite-title">
      <div className="brand-row"><div className="brand-mark" aria-hidden="true">K</div>
        <div><p className="brand-kicker">Kitchen</p><p className="brand-caption">Prywatny dostęp</p></div>
      </div>
      <div className="login-heading">
        <p className="eyebrow">Jednorazowe zaproszenie</p>
        <h1 id="invite-title">Dołącz do Kitchen</h1>
        <p className="login-intro">Wprowadź swój e-mail. Otrzymasz wiadomość z bezpiecznym linkiem do ustawienia hasła.</p>
      </div>
      {sent ? <div className="notice" role="status">Wysłaliśmy wiadomość. Otwórz ją na urządzeniu, na którym chcesz aktywować konto. Sprawdź także spam.</div>
        : <form className="login-form" onSubmit={submit}>
          <label><span>E-mail</span><input type="email" required value={email}
            autoComplete="email" inputMode="email" disabled={busy || !supabase}
            onChange={(e) => setEmail(e.target.value)}/></label>
          {message ? <div className="notice notice-error" role="alert">{message}</div> : null}
          <button className="primary-button" type="submit" disabled={busy || !supabase}>
            {busy ? 'Wysyłanie…' : 'Wyślij wiadomość aktywacyjną'}
          </button>
        </form>}
      <p className="login-footnote">Zaproszenie można wykorzystać tylko raz. Hasło ustawisz po potwierdzeniu e-maila.</p>
    </section>
  </main>
}
