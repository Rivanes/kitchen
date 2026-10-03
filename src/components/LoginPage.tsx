import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { KitchenIcon } from './KitchenIcon'

type LoginPageProps = {
  configurationMissing: boolean
}

export function LoginPage({ configurationMissing }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!supabase) {
      setError('Brak konfiguracji Supabase. Uzupełnij zmienne środowiskowe.')
      return
    }

    if (!email.trim() || !password) {
      setError('Podaj e-mail i hasło.')
      return
    }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError('Nieprawidłowy e-mail lub hasło.')
    }

    setLoading(false)
  }

  return (
    <main className="auth-layout">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">K</div>
          <div>
            <p className="brand-kicker">Kitchen</p>
            <p className="brand-caption">Twoja domowa kuchnia w jednym miejscu</p>
          </div>
        </div>

        <div className="login-heading">
          <span className="soft-icon" aria-hidden="true"><KitchenIcon name="lock" size={20} /></span>
          <p className="eyebrow">Prywatny dostęp</p>
          <h1 id="login-title">Witaj ponownie</h1>
          <p className="login-intro">Zaloguj się, aby przejść do swoich zapasów, zakupów i przepisów.</p>
        </div>

        {configurationMissing ? (
          <div className="notice notice-error" role="alert">
            Brak konfiguracji Supabase. Dodaj lokalny plik <code>.env.local</code> albo zmienne w GitHub Actions.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={configurationMissing || loading}
              required
            />
          </label>

          <label>
            <span>Hasło</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={configurationMissing || loading}
              required
            />
          </label>

          {error ? <div className="notice notice-error" role="alert">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={configurationMissing || loading}>
            {loading ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>

        <p className="login-footnote">Dostęp jest ograniczony do właściciela Kitchen.</p>
      </section>
    </main>
  )
}
