import { useState } from 'react'
import { supabase } from '../lib/supabase/client'

/** H7.3 minimal admin control; management/history comes in H7.4. */
export function AdminInvitePanel() {
  const [invite, setInvite] = useState<{ url: string; id: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!supabase || busy) return
    setBusy(true); setMessage(''); setInvite(null); setCopied(false)
    try {
      const { data, error } = await supabase.functions.invoke('kitchen-invites', { body: { action: 'issue' } })
      if (error || typeof data?.inviteUrl !== 'string' || typeof data?.id !== 'string') throw Error('issue')
      setInvite({ url: data.inviteUrl, id: data.id })
    } catch { setMessage('Nie udało się wygenerować linku. Sprawdź wdrożenie H7.3 i uprawnienia administratora.') }
    finally { setBusy(false) }
  }

  async function revoke() {
    if (!supabase || !invite || busy) return
    setBusy(true); setMessage('')
    try {
      const { data, error } = await supabase.functions.invoke('kitchen-invites', {
        body: { action: 'revoke', id: invite.id },
      })
      if (error || data?.revoked !== true) throw Error('revoke')
      setInvite(null)
      setMessage('Zaproszenie zostało unieważnione.')
    } catch { setMessage('Nie udało się unieważnić zaproszenia. Spróbuj ponownie.') }
    finally { setBusy(false) }
  }

  return <section className="admin-invites" aria-labelledby="invite-admin-title">
    <div className="admin-invites-heading">
      <div><p className="eyebrow">ADMINISTRATOR</p><h2 id="invite-admin-title">Zaproś użytkownika</h2>
        <p>Jednorazowy link, ważny 24 godziny. Konto zostanie utworzone po potwierdzeniu adresu e-mail.</p>
      </div>
      <button className="secondary-button" type="button" onClick={generate} disabled={busy}>
        {busy ? 'Przetwarzanie…' : 'Generuj link'}
      </button>
    </div>
    {invite ? <div className="admin-invites-result">
      <label htmlFor="kitchen-invite-url">Link zapraszający</label>
      <input id="kitchen-invite-url" type="text" readOnly value={invite.url} onFocus={e => e.target.select()}/>
      <div className="admin-invites-actions">
        <button type="button" className="secondary-button" onClick={async () => {
          try { await navigator.clipboard.writeText(invite.url); setCopied(true) }
          catch { setMessage('Zaznacz link i skopiuj go ręcznie.') }
        }}>{copied ? 'Skopiowano' : 'Kopiuj link'}</button>
        <button type="button" className="secondary-button" onClick={revoke} disabled={busy}>Unieważnij</button>
      </div>
    </div> : null}
    {message ? <p className="admin-invites-message" role="status">{message}</p> : null}
  </section>
}
