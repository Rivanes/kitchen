/** Kitchen H7.3: trusted invitation API. Deploy as an Edge Function.
 * This function is PUBLIC only at the gateway; all privileged actions independently
 * validate the current Supabase Auth user and DB administrator/member state.
 * No secret value, invitation token, or password is logged.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')
const appUrl = Deno.env.get('KITCHEN_APP_URL')
if (!supabaseUrl || !secretKey || !appUrl) throw new Error('Missing H7.3 server configuration')
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
      if (!email || !/^[a-zA-Z0-9_-]{43}$/.test(token)) {
        return reply(400, { error: 'Link invalid or expired' })
      }
      const { data: inviteId, error } = await privilegedRpc('h73_claim_invite', {
        p_token_hash: await tokenDigest(token), p_email: email,
      })
      if (error || !inviteId) return reply(410, { error: 'Zaproszenie wygasło lub zostało wykorzystane.' })

      const redirectTo = new URL(canonicalAppUrl.href)
      redirectTo.searchParams.set('onboarding', '1')
      const { data: invited, error: mailError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo.toString(),
      })
      if (mailError || !invited?.user?.id) {
        await privilegedRpc('h73_mark_failed', { p_invite_id: inviteId })
        return reply(422, { error: 'Nie udało się wysłać zaproszenia. Poproś administratora o nowy link.' })
      }
      const { data: bound, error: bindingError } = await privilegedRpc('h73_mark_sent', {
        p_invite_id: inviteId, p_auth_id: invited.user.id, p_email: email,
      })
      if (bindingError || !bound) {
        // Fail closed: an Auth account may exist but has no Kitchen membership.
        return reply(500, { error: 'Aktywacja zaproszenia wymaga pomocy administratora.' })
      }
      return reply(200, { ok: true })
    }

    const user = await signedInUser(req)
    if (!user?.email) return reply(401, { error: 'Wymagane zalogowane konto.' })

    if (action === 'issue') {
      const token = tokenBytes()
      const { data: id, error } = await privilegedRpc('h73_issue_invite', {
        p_admin_id: user.id, p_token_hash: await tokenDigest(token), p_valid_minutes: 1440,
      })
      if (error || !id) return reply(403, { error: 'Brak uprawnień do tworzenia zaproszeń.' })
      const url = new URL(canonicalAppUrl.href)
      url.searchParams.set('invite', token)
      return reply(200, { id, inviteUrl: url.toString(), validHours: 24 })
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

    if (action === 'status') {
      const { data, error } = await privilegedRpc('h73_pending_for_user', {
        p_user_id: user.id, p_email: user.email,
      })
      return error ? reply(500, { error: 'Nie udało się potwierdzić zaproszenia.' })
        : reply(200, { pending: data === true })
    }

    if (action === 'activate') {
      if (!user.email_confirmed_at) return reply(403, { error: 'Potwierdź adres e-mail.' })
      const { data, error } = await privilegedRpc('h73_activate_member', {
        p_user_id: user.id, p_email: user.email,
      })
      return error || data !== true ? reply(403, { error: 'Nie można aktywować tego zaproszenia.' })
        : reply(200, { activated: true })
    }
    return reply(400, { error: 'Nieznana operacja.' })
  } catch {
    return reply(500, { error: 'Nie udało się obsłużyć zaproszenia.' })
  }
})
