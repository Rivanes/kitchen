import { type FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase/client'

/** H7.3B: Token-gated registration, not public signUp.
 * The trusted Edge Function creates the Auth account and its membership.
 * Never persist the password or the one-time token in browser storage.
 */
export function InvitationPage({ token }: { token: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy || created || !email.trim()) return
    if (password.length < 12 || password.length > 128 || password !== confirmation) {
      setMessage('Hasło musi mieć od 12 do 128 znaków, a oba pola muszą być identyczne.')
      return
    }
    setBusy(true)
    setMessage('')
    const normalizedEmail = email.trim().toLowerCase()
    try {
      const { data, error } = await supabase.functions.invoke('kitchen-invites', {
        body: { action: 'claim', email: normalizedEmail, password, token },
      })
      if (error || data?.registered !== true) throw Error('registration failed')
      setCreated(true)
      // The password is sent only to the trusted Edge Function / Supabase Auth.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (!signInError) {
        window.location.replace(import.meta.env.BASE_URL)
      } else {
        setMessage('Konto jest utworzone. Przejdź do logowania i zaloguj się podanym e-mailem i hasłem.')
      }
    } catch {
      setMessage('Nie udało się utworzyć konta. Link mógł wygasnąć lub zostać wykorzystany. Poproś administratora o nowy link.')
    } finally {
      setPassword('')
      setConfirmation('')
      setBusy(false)
    }
  }

  return <main className="auth-layout">
    <section className="login-card" aria-labelledby="invite-title">
      <div className="brand-row"><div className="brand-mark" aria-hidden="true">K</div>
        <div><p className="brand-kicker">Kitchen</p><p className="brand-caption">Prywatny dostęp</p></div>
      </div>
      <div className="login-heading">
        <p className="eyebrow">Jednorazowe zaproszenie</p>
        <h1 id="invite-title">Utwórz konto Kitchen</h1>
        <p className="login-intro">Podaj swój e-mail i ustaw hasło. Konto zostanie utworzone po wykorzystaniu zaproszenia — bez wiadomości aktywacyjnej.</p>
      </div>
      {created ? <div role="status" className="notice">
        Konto zostało utworzone. {message || 'Możesz teraz zalogować się do Kitchen.'}
        <p><a href={import.meta.env.BASE_URL}>Przejdź do logowania</a></p>
      </div> : <form className="login-form" onSubmit={submit}>
        <label><span>E-mail</span><input type="email" required value={email}
          autoComplete="email" inputMode="email" disabled={busy || !supabase}
          onChange={(e) => setEmail(e.target.value)}/></label>
        <label><span>Hasło (12–128 znaków)</span><input type="password" required minLength={12} maxLength={128}
          autoComplete="new-password" value={password} disabled={busy || !supabase}
          onChange={(e) => setPassword(e.target.value)}/></label>
        <label><span>Powtórz hasło</span><input type="password" required minLength={12} maxLength={128}
          autoComplete="new-password" value={confirmation} disabled={busy || !supabase}
          onChange={(e) => setConfirmation(e.target.value)}/></label>
        {message ? <div className="notice notice-error" role="alert">{message}</div> : null}
        <button className="primary-button" type="submit" disabled={busy || !supabase}>
          {busy ? 'Tworzenie konta…' : 'Utwórz konto'}
        </button>
      </form>}
      <p className="login-footnote">Link jest ważny 24 godziny i może utworzyć tylko jedno konto. W tej wersji testowej nie weryfikujemy własności adresu e-mail.</p>
    </section>
  </main>
}
