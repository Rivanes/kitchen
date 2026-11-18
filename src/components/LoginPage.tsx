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
    <main className="auth-layout login-layout">
      <section className="login-card login-entry" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-brand-emblem" aria-hidden="true"><KitchenIcon name="home" size={25} /></span>
          <span className="login-brand-wordmark">Kitchen</span>
        </div>

        <header className="login-heading">
          <h1 id="login-title">Witaj ponownie</h1>
        </header>

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

      </section>
    </main>
  )
}
