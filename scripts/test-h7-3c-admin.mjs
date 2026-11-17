import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import { assertTsSyntax } from './assert-ts-syntax.mjs'
const read = p => readFile(new URL(`../${p}`, import.meta.url), 'utf8')
// REPO-only contract for GitHub CI. SQL migration/postcheck/parity live exclusively
// in OUTSIDE_REPO/QA/H7_3C_SQL_CONTRACT_CHECK.mjs.
const [edge, admin, app, gate, hub, css, fallback, contract] = await Promise.all([
  read('supabase/functions/kitchen-invites/index.ts'), read('src/components/AdminInvitePanel.tsx'),
  read('src/App.tsx'), read('src/components/MembershipGate.tsx'),
  read('src/components/HomeHubShell.tsx'), read('src/styles/global.css'),
  read('public/404.html'), read('tests/H7_3C_INVITE_ADMIN_CONTRACT.md'),
])
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
// H7.3D: /admin must not be advertised on the ordinary Home Hub.
assert.doesNotMatch(hub, /home-hub-admin-link|Administracja — zaproszenia/)
assert.match(admin, /<h1 id="invite-admin-title">Zaproszenia<\/h1>/)
assert.match(admin, /Wygasa:/)
assert.match(admin, />Usuń<\/button>/)
assert.doesNotMatch(admin, /DOSTĘP DO KITCHEN|Jednorazowe linki ważne przez 24 godziny|Wykorzystane zaproszenia są usuwane/)
assert.match(css, /\.admin-route-layout \.home-hub-main \{[^}]*justify-content: flex-start;/)
assert.doesNotMatch(css, /\.home-hub-admin-link/)
assert.match(gate, /adminRoute && role !== 'admin'/)
assert.match(fallback, /\/kitchen\/\?kitchen_admin_route=1/)
assert.match(css, /\.admin-invites-list/)
assert.match(contract, /H7\.3C/)
for (const file of ['src/App.tsx','src/components/HomeHubShell.tsx','src/components/MembershipGate.tsx','src/components/AdminInvitePanel.tsx','src/components/KitchenIcon.tsx','supabase/functions/kitchen-invites/index.ts']) {
  assertTsSyntax(file, await read(file))
}
// Cryptographic round-trip representative of the Edge-only AES-GCM storage design.
const token=Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64url')
const key=await webcrypto.subtle.importKey('raw',webcrypto.getRandomValues(new Uint8Array(32)),{name:'AES-GCM'},false,['encrypt','decrypt'])
const iv=webcrypto.getRandomValues(new Uint8Array(12))
const cipher=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(token))
const plain=await webcrypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher)
assert.equal(new TextDecoder().decode(plain),token)
console.log('H7.3C admin route / invite encryption / physical retention REPO-only source contract: PASS')
