/** Kitchen H7.3: trusted invitation API. Deploy as an Edge Function.
 * This function is PUBLIC only at the gateway; all privileged actions independently
 * validate the current Supabase Auth user and DB administrator/member state.
 * No secret value, invitation token, or password is logged.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')
const appUrl = Deno.env.get('KITCHEN_APP_URL')
const inviteKeyBase64 = Deno.env.get('KITCHEN_INVITE_ENCRYPTION_KEY')
if (!supabaseUrl || !secretKey || !appUrl || !inviteKeyBase64) throw new Error('Missing H7.3C server configuration')
const canonicalAppUrl = new URL(appUrl)
if (canonicalAppUrl.protocol !== 'https:' || canonicalAppUrl.search || canonicalAppUrl.hash) {
  throw new Error('KITCHEN_APP_URL must be a clean HTTPS URL of the Kitchen app')
}
const allowedOrigin = canonicalAppUrl.origin
const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Vary': 'Origin',
  'Cache-Control': 'no-store',
}
function reply(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
function asText(value: unknown): string { return typeof value === 'string' ? value : '' }
function normalizedEmail(value: unknown): string {
  const email = asText(value).trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : ''
}
function tokenBytes(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
async function tokenDigest(token: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
// AES-256-GCM protects live link re-display in /admin without storing plaintext
// tokens in Postgres. Set a NEW 32-byte base64 key in Edge Secrets and retain it.
function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}
function encodeBase64(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value))
}
const encryptionKey = (async () => {
  const raw = decodeBase64(inviteKeyBase64!)
  if (raw.byteLength !== 32) throw Error('H7.3C invite encryption key must be 32 bytes')
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
})()
async function encryptToken(token: string): Promise<{ tokenCiphertext: string; tokenIv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey,
    new TextEncoder().encode(token))
  return { tokenCiphertext: encodeBase64(new Uint8Array(buffer)), tokenIv: encodeBase64(iv) }
}
async function decryptToken(ciphertext: string, iv: string): Promise<string> {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(iv) },
    await encryptionKey, decodeBase64(ciphertext))
  const token = new TextDecoder().decode(plaintext)
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw Error('Invalid stored token')
  return token
}
function inviteUrl(token: string): string {
  const url = new URL(canonicalAppUrl.href)
  url.searchParams.set('invite', token)
  return url.toString()
}
async function signedInUser(req: Request) {
  const header = req.headers.get('Authorization') ?? ''
  const match = /^Bearer\s+([a-zA-Z0-9._-]+)$/i.exec(header)
  if (!match) return null
  const { data, error } = await admin.auth.getUser(match[1])
  return !error && data.user && !data.user.is_anonymous ? data.user : null
}
async function privilegedRpc(fn: string, args: Record<string, unknown>) {
  return await admin.rpc(fn, args)
}
Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (origin && origin !== allowedOrigin) return reply(403, { error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' })
  if (Number(req.headers.get('Content-Length') ?? 0) > 8192) return reply(413, { error: 'Request too large' })
  let payload: Record<string, unknown>
  try {
    const body = await req.text()
    if (body.length > 8192) return reply(413, { error: 'Request too large' })
    payload = JSON.parse(body) as Record<string, unknown>
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('Invalid JSON')
  } catch { return reply(400, { error: 'Invalid JSON' }) }

  const action = asText(payload.action)
  try {
    if (action === 'claim') {
      const email = normalizedEmail(payload.email)
      const token = asText(payload.token)
      const password = asText(payload.password)
      // Server-side validation is mandatory; browser controls are advisory.
      if (!email || !/^[a-zA-Z0-9_-]{43}$/.test(token)
        || password.length < 12 || password.length > 128 || new TextEncoder().encode(password).length > 128) {
        return reply(400, { error: 'Link invalid or expired' })
      }
      const { data: inviteId, error } = await privilegedRpc('h73_claim_invite', {
        p_token_hash: await tokenDigest(token), p_email: email,
      })
      if (error || !inviteId) return reply(410, { error: 'Zaproszenie wygasło lub zostało wykorzystane.' })

      // The one-time invitation is the only authorization to create an account.
      // No public signUp and no SMTP are used for this test-only flow.
      // email_confirm=true means email ownership is NOT verified. Do not ship
      // this flow to untrusted users without adding email verification.
      const { data: created, error: authError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (authError || !created?.user?.id) {
        await privilegedRpc('h73_mark_failed', { p_invite_id: inviteId })
        return reply(422, { error: 'Nie udało się utworzyć konta. Poproś administratora o nowy link.' })
      }
      // The historical SQL RPC name/state `mark_sent`/`sent` remains a private
      // compatibility marker: Auth identity bound, not proof that email was sent.
      const { data: bound, error: bindingError } = await privilegedRpc('h73_mark_sent', {
        p_invite_id: inviteId, p_auth_id: created.user.id, p_email: email,
      })
      if (bindingError || !bound) {
        // Fail closed: identity may exist, but has no Kitchen membership.
        return reply(500, { error: 'Nie można dokończyć rejestracji. Skontaktuj się z administratorem.' })
      }
      const { data: activated, error: activationError } = await privilegedRpc('h73_activate_member', {
        p_user_id: created.user.id, p_email: email,
      })
      if (activationError || activated !== true) {
        // Fail closed: never grant access merely because Auth creation succeeded.
        return reply(500, { error: 'Nie można aktywować konta. Skontaktuj się z administratorem.' })
      }
      return reply(200, { registered: true })
    }

    const user = await signedInUser(req)
    if (!user?.email) return reply(401, { error: 'Wymagane zalogowane konto.' })

    if (action === 'issue') {
      const token = tokenBytes()
      const encrypted = await encryptToken(token)
      const { data: id, error } = await privilegedRpc('h73c_issue_invite', {
        p_admin_id: user.id, p_token_hash: await tokenDigest(token),
        p_token_ciphertext: encrypted.tokenCiphertext, p_token_iv: encrypted.tokenIv,
        p_valid_minutes: 1440,
      })
      if (error || !id) return reply(403, { error: 'Nie udało się utworzyć zaproszenia. Sprawdź uprawnienia i limit.' })
      return reply(200, { id, inviteUrl: inviteUrl(token), validHours: 24 })
    }

    if (action === 'list') {
      const { data: invitations, error } = await privilegedRpc('h73c_list_active_invites', {
        p_admin_id: user.id,
      })
      if (error || !Array.isArray(invitations)) return reply(403, { error: 'Brak dostępu do listy zaproszeń.' })
      const invites = await Promise.all(invitations.map(async (row: Record<string, unknown>) => {
        const cipher = asText(row.token_ciphertext)
        const iv = asText(row.token_iv)
        return {
          id: asText(row.id), issuedAt: asText(row.issued_at), expiresAt: asText(row.expires_at),
          // Older SHA-only rows cannot be decrypted. Admin can revoke them.
          inviteUrl: cipher && iv ? inviteUrl(await decryptToken(cipher, iv)) : null,
        }
      }))
      return reply(200, { invites })
    }

    if (action === 'revoke') {
      const id = asText(payload.id)
      if (!/^[0-9a-f-]{36}$/i.test(id)) return reply(400, { error: 'Nieprawidłowe zaproszenie.' })
      const { data, error } = await privilegedRpc('h73_revoke_invite', {
        p_admin_id: user.id, p_invite_id: id,
      })
      if (error) return reply(403, { error: 'Brak uprawnień.' })
      return reply(200, { revoked: data === true })
    }

    return reply(400, { error: 'Nieznana operacja.' })
  } catch {
    return reply(500, { error: 'Nie udało się obsłużyć zaproszenia.' })
  }
})
