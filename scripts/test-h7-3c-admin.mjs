import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
const read = p => readFile(p, 'utf8')
const [migration, all, pre, post, edge, admin, app, gate, hub, css, fallback, contract] = await Promise.all([
  read('../OUTSIDE_REPO/SQL/H7_MULTI_USER/H7_3C_INVITE_ADMIN_MIGRATION.sql'),
  read('../OUTSIDE_REPO/SQL/ALL_IN_ONE.sql'),
  read('../OUTSIDE_REPO/SQL/H7_MULTI_USER/H7_3C_PRECHECK_READONLY.sql'),
  read('../OUTSIDE_REPO/SQL/H7_MULTI_USER/H7_3C_POSTCHECK_READONLY.sql'),
  read('supabase/functions/kitchen-invites/index.ts'), read('src/components/AdminInvitePanel.tsx'),
  read('src/App.tsx'), read('src/components/MembershipGate.tsx'),
  read('src/components/HomeHubShell.tsx'), read('src/styles/global.css'),
  read('public/404.html'), read('tests/H7_3C_INVITE_ADMIN_CONTRACT.md'),
])
assert.ok(all.includes(migration.trim()), 'H7.3C migration must be included verbatim in ALL_IN_ONE')
assert.match(migration, /BEGIN;[\s\S]*COMMIT;/i)
assert.match(migration, /ADD COLUMN token_ciphertext text/)
assert.match(migration, /CREATE FUNCTION public\.h73c_issue_invite/)
assert.match(migration, /CREATE FUNCTION public\.h73c_list_active_invites/)
assert.match(migration, /state='issued' AND i\.expires_at > now\(\)/)
assert.match(migration, /DELETE FROM private\.kitchen_invites WHERE id=v_invite\.id/)
assert.match(migration, /DELETE FROM private\.kitchen_invites[\s\S]*state='issued'/)
assert.match(migration, /interval '30 minutes'/)
assert.match(migration, /'kitchen-h73-invite-retention'/)
assert.match(migration, /'\*\/5 \* \* \* \*'/)
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.h73c_issue_invite\(uuid,text,text,text,integer\) TO service_role/)
assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION public\.h73c_(?:issue|list)[^\n]+ TO (anon|authenticated)/i)
assert.match(edge, /KITCHEN_INVITE_ENCRYPTION_KEY/)
assert.match(edge, /'AES-GCM'/)
assert.match(edge, /h73c_issue_invite/)
assert.match(edge, /h73c_list_active_invites/)
assert.match(edge, /if \(action === 'list'\)/)
assert.match(edge, /getUser\(match\[1\]\)/)
assert.match(edge, /auth\.admin\.createUser/)
assert.doesNotMatch(edge, /inviteUserByEmail|\.signUp\(/)
assert.match(admin, /action: 'list'/)
assert.match(admin, /action: 'issue'/)
assert.match(admin, /action: 'revoke'/)
assert.match(admin, /expiresAt/)
assert.match(admin, /navigator\.clipboard\.writeText/)
assert.doesNotMatch(admin, /service_role|SUPABASE_SECRET_KEY|localStorage/)
assert.match(app, /const adminPath/)
assert.match(app, /window\.history\.pushState/)
assert.match(app, /window\.addEventListener\('popstate'/)
assert.match(hub, /adminRoute && isAdmin/)
assert.match(gate, /adminRoute && role !== 'admin'/)
assert.match(fallback, /\/kitchen\/\?kitchen_admin_route=1/)
assert.match(css, /\.admin-invites-list/)
assert.match(contract, /H7\.3C/)
assert.match(pre, /h73c_not_installed/)
assert.match(post, /H73C_CRON_ACTIVE/)
assert.match(post, /H73C_COMPLETION_DELETES_INVITE/)
for (const sql of [pre, post]) {
  const withoutCommentsAndLiterals = sql.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''")
  assert.doesNotMatch(withoutCommentsAndLiterals, /\b(?:insert|update|delete|alter|drop|create|truncate)\s+(?:from|into|table|private|public)\b/i)
}
const ts = createRequire(import.meta.url)('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')
for (const file of ['src/App.tsx','src/components/HomeHubShell.tsx','src/components/MembershipGate.tsx','src/components/AdminInvitePanel.tsx','src/components/KitchenIcon.tsx','supabase/functions/kitchen-invites/index.ts']) {
  const r=ts.transpileModule(await read(file),{fileName:file,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}})
  assert.equal((r.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,`TS syntax ${file}`)
}
// Cryptographic round-trip representative of the Edge-only AES-GCM storage design.
const token=Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64url')
const key=await webcrypto.subtle.importKey('raw',webcrypto.getRandomValues(new Uint8Array(32)),{name:'AES-GCM'},false,['encrypt','decrypt'])
const iv=webcrypto.getRandomValues(new Uint8Array(12))
const cipher=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(token))
const plain=await webcrypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher)
assert.equal(new TextDecoder().decode(plain),token)
console.log('H7.3C admin route / invite encryption / physical retention source contract: PASS')
