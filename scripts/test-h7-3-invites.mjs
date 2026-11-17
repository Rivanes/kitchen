import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { assertTsSyntax } from './assert-ts-syntax.mjs'
const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8')
// GitHub CI must be self-contained: migration/ALL_IN_ONE parity is checked separately
// in OUTSIDE_REPO/QA/H7_3_SQL_CONTRACT_CHECK.mjs (never committed to GitHub).
const [edge, app, form, gate, hub, adminUI, config, contract] = await Promise.all([
  read('supabase/functions/kitchen-invites/index.ts'),
  read('src/App.tsx'), read('src/components/InvitationPage.tsx'),
  read('src/components/MembershipGate.tsx'), read('src/components/HomeHubShell.tsx'),
  read('src/components/AdminInvitePanel.tsx'), read('supabase/config.toml'),
  read('tests/H7_3_INVITATION_CONTRACT.md'),
])
assert.match(edge, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/)
assert.match(edge, /crypto\.subtle\.digest\('SHA-256'/)
assert.match(edge, /auth\.admin\.createUser\(\{\s*email, password, email_confirm: true/)
assert.doesNotMatch(edge, /inviteUserByEmail\(/)
assert.doesNotMatch(edge, /\.signUp\(/)
assert.match(edge, /password\.length < 12/)
assert.match(edge, /h73_claim_invite/)
assert.match(edge, /h73_mark_sent/)
assert.match(edge, /h73_activate_member/)
assert.match(edge, /getUser\(match\[1\]\)/)
assert.match(edge, /KITCHEN_APP_URL/)
assert.match(edge, /if \(action === 'issue'\)/)
assert.match(edge, /if \(action === 'claim'\)/)
assert.match(edge, /if \(action === 'revoke'\)/)
assert.match(edge, /registered: true/)
assert.match(config, /verify_jwt = false/)
assert.match(app, /initialInviteToken/)
assert.match(app, /InvitationPage token=\{initialInviteToken\}/)
assert.doesNotMatch(app, /InviteSetupPage|initialOnboarding/)
assert.match(app, /window\.history\.replaceState/)
assert.match(form, /action: 'claim', email: normalizedEmail, password, token/)
assert.match(form, /auth\.signInWithPassword\(/)
assert.doesNotMatch(form, /\.signUp\(/)
assert.match(form, /type="password"/)
assert.match(form, /autocomplete="new-password"/i) // DOM autocomplete casing accepted
assert.match(gate, /\.rpc\('kitchen_my_access'\)/)
assert.match(gate, /role === 'admin'/)
assert.match(hub, /adminRoute && isAdmin/); assert.match(hub, /<AdminInvitePanel/)
assert.match(adminUI, /action: 'issue'/)
assert.match(adminUI, /action: 'revoke'/)
assert.doesNotMatch(adminUI, /service_role|SUPABASE_SECRET_KEY|\.signUp\(/)
assert.match(contract, /H7\.3B/)
// Regression: the parser must reject invalid TSX instead of silently accepting it.
assert.throws(() => assertTsSyntax('invalid.tsx', 'const Broken = <div>'), /TS\/TSX syntax error/)
const targets = [
  'src/App.tsx', 'src/components/InvitationPage.tsx',
  'src/components/AdminInvitePanel.tsx', 'src/components/HomeHubShell.tsx',
  'src/components/MembershipGate.tsx', 'supabase/functions/kitchen-invites/index.ts',
]
for (const path of targets) {
  const source = await read(path)
  assertTsSyntax(path, source)
}
console.log('H7.3B token-gated email/password REPO-only source + TS/TSX: PASS')
