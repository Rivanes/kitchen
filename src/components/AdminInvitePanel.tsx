import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { KitchenIcon } from './KitchenIcon'

type ActiveInvite = {
  id: string
  issuedAt: string
  expiresAt: string
  inviteUrl: string | null
}

/** H7.3C: server-filtered, admin-only active invitations; no local token storage. */
export function AdminInvitePanel() {
  const [invites, setInvites] = useState<ActiveInvite[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(async (showSpinner = false) => {
    if (!supabase) return
    if (showSpinner) setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('kitchen-invites', {
        body: { action: 'list' },
      })
      if (error || !Array.isArray(data?.invites)) throw Error('list')
      const active = data.invites.filter((row: unknown): row is ActiveInvite => {
        if (!row || typeof row !== 'object') return false
        const item = row as Record<string, unknown>
        return typeof item.id === 'string' && typeof item.issuedAt === 'string'
          && typeof item.expiresAt === 'string'
          && (typeof item.inviteUrl === 'string' || item.inviteUrl === null)
      })
      setInvites(active)
      setErrorMessage('')
    } catch { setErrorMessage('Nie udało się pobrać aktywnych zaproszeń. Sprawdź połączenie i uprawnienia administratora.') }
    finally { if (showSpinner) setLoading(false) }
  }, [])

  useEffect(() => {
    void refresh(true)
    // Server/cron is the source of truth. Client interval only refreshes view.
    const interval = window.setInterval(() => {
      setNow(Date.now())
      void refresh()
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  async function generate() {
    if (!supabase || busy) return
    setBusy(true); setMessage(''); setErrorMessage('')
    try {
      const { data, error } = await supabase.functions.invoke('kitchen-invites', {
        body: { action: 'issue' },
      })
      if (error || typeof data?.inviteUrl !== 'string' || typeof data?.id !== 'string') throw Error('issue')
      setMessage('Nowy link jest gotowy do skopiowania.')
      await refresh()
    } catch { setErrorMessage('Nie udało się wygenerować linku. Sprawdź wdrożenie H7.3C i uprawnienia.') }
    finally { setBusy(false) }
  }

  async function revoke(id: string) {
    if (!supabase || busy || !window.confirm('Usunąć ten link? Nie będzie można go ponownie użyć.')) return
    setBusy(true); setMessage(''); setErrorMessage('')
    try {
      const { data, error } = await supabase.functions.invoke('kitchen-invites', {
        body: { action: 'revoke', id },
      })
      if (error || data?.revoked !== true) throw Error('revoke')
      setInvites(current => current.filter(invite => invite.id !== id))
      setMessage('Link usunięty.')
      await refresh()
    } catch { setErrorMessage('Nie udało się usunąć zaproszenia. Odśwież listę.') }
    finally { setBusy(false) }
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setMessage('Link skopiowany.')
      setErrorMessage('')
    } catch { setErrorMessage('Kopiowanie nie powiodło się. Spróbuj ponownie w przeglądarce z HTTPS.') }
  }

  const active = invites.filter(item => new Date(item.expiresAt).getTime() > now)
  const dateFmt = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' })

  return <section className="admin-invites" aria-labelledby="invite-admin-title">
    <div className="admin-invites-heading">
      <h1 id="invite-admin-title">Zaproszenia</h1>
      <button className="primary-button" type="button" onClick={generate} disabled={busy}>
        <KitchenIcon name="plus" size={18} /> {busy ? 'Przetwarzanie…' : 'Generuj link'}
      </button>
    </div>
    <div className="admin-invites-list-heading">
      <h2>Aktywne <span aria-label={`${active.length} aktywnych linków`}>({active.length})</span></h2>
      <button type="button" className="secondary-button" onClick={() => { void refresh(true) }} disabled={busy || loading}>
        <KitchenIcon name="refresh" size={17} /> Odśwież
      </button>
    </div>
    {loading ? <p className="admin-invites-empty" role="status">Wczytywanie zaproszeń…</p> :
      active.length === 0 ? <div className="admin-invites-empty">
        <KitchenIcon name="link" size={25} />
        <strong>Brak aktywnych zaproszeń</strong>
      </div> : <ul className="admin-invites-list">
        {active.map(item => <li className="admin-invites-row" key={item.id}>
          <div className="admin-invites-row-details">
            <strong>Link {item.id.slice(0, 8).toUpperCase()}</strong>
            <span>Wygasa: {dateFmt.format(new Date(item.expiresAt))}</span>
          </div>
          <div className="admin-invites-actions">
            <button type="button" className="secondary-button" disabled={!item.inviteUrl || busy}
              title={!item.inviteUrl ? 'Starszy link bez zapisanego adresu. Usuń go i wygeneruj nowy.' : undefined}
              onClick={() => { if (item.inviteUrl) void copy(item.inviteUrl) }}>{item.inviteUrl ? 'Kopiuj' : 'Brak adresu'}</button>
            <button type="button" className="secondary-button admin-invites-revoke" disabled={busy}
              onClick={() => { void revoke(item.id) }}>Usuń</button>
          </div>
        </li>)}
      </ul>}
    {errorMessage ? <p className="admin-invites-error" role="alert">{errorMessage}</p> : null}
    {message ? <p className="admin-invites-message" role="status">{message}</p> : null}
  </section>
}
