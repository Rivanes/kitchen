import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const read = (p) => readFile(p, 'utf8')
const [edge, sql, all, app, form, gate, hub, adminUI, config, contract] = await Promise.all([
  read('supabase/functions/kitchen-invites/index.ts'),
  read('../OUTSIDE_REPO/SQL/H7_MULTI_USER/H7_3_INVITE_ONLY_MIGRATION.sql'),
  read('../OUTSIDE_REPO/SQL/ALL_IN_ONE.sql'),
  read('src/App.tsx'), read('src/components/InvitationPage.tsx'),
  read('src/components/MembershipGate.tsx'), read('src/components/HomeHubShell.tsx'),
  read('src/components/AdminInvitePanel.tsx'), read('supabase/config.toml'),
  read('tests/H7_3_INVITATION_CONTRACT.md'),
])
assert.match(sql, /begin;/i)
assert.match(sql, /commit;/i)
assert.match(sql, /create table private\.kitchen_invites/)
assert.match(sql, /token_hash text not null unique/)
assert.match(sql, /update private\.kitchen_invites\s+set state='claimed'/)
assert.match(sql, /state='issued' and expires_at>now\(\)/)
assert.match(sql, /for update/)
assert.match(sql, /u\.email_confirmed_at is not null/)
assert.match(sql, /nullif\(u\.encrypted_password,''\) is not null/)
assert.match(sql, /insert into private\.kitchen_members\(user_id,role,status\)/)
assert.match(sql, /grant execute on function public\.h73_activate_member\(uuid,text\) to service_role/)
assert.doesNotMatch(sql, /grant execute on function public\.h73_[^\n]+ to (authenticated|anon)/)
assert.match(sql, /revoke all on function public\.h73_claim_invite\(text,text\) from public,anon,authenticated/)
assert.ok(all.includes(sql.trim()), 'ALL_IN_ONE must contain exact deployed H7.3 migration')
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
let ts
try { ts = createRequire(import.meta.url)('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js') }
catch { throw Error('Global TypeScript parser not available') }
const targets = [
  'src/App.tsx', 'src/components/InvitationPage.tsx',
  'src/components/AdminInvitePanel.tsx', 'src/components/HomeHubShell.tsx',
  'src/components/MembershipGate.tsx', 'supabase/functions/kitchen-invites/index.ts',
]
for (const path of targets) {
  const source = await read(path)
  const result = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  })
  const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
  assert.equal(errors.length, 0,
    `${path}: ${errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`)
}
console.log('H7.3B token-gated email/password source/SQL parity + TS/TSX: PASS')
