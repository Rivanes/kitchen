import { assertKeyedMembershipGate } from './contracts/assert-keyed-membership-gate.mjs'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'

const app = await readFile('src/App.tsx','utf8')
const gate = await readFile('src/components/MembershipGate.tsx','utf8')
const login = await readFile('src/components/LoginPage.tsx','utf8')
const sql = await readFile('tests/H7_1_MEMBERSHIP_CONTRACT.md','utf8')
assertKeyedMembershipGate(app)
assert.match(gate, /\.rpc\('kitchen_my_access'\)/)
assert.match(gate, /setStatus\('checking'\)/)
assert.match(gate, /if \(!current\) return/)
assert.match(gate, /if \(status === 'active'\) \{[\s\S]*return <HomeHubShell user=\{user\}/)
assert.match(gate, /status === 'suspended'/)
assert.doesNotMatch(gate, /is_kitchen_owner|service_role|\.signUp\(/)
assert.doesNotMatch(login, /\.signUp\(/)
// Invite-only access is enforced by Auth and MembershipGate, not login footer copy.
assert.match(login, /supabase\.auth\.signInWithPassword\(/)
assert.doesNotMatch(login, /Zarejestruj|Utwórz konto|Zapisz konto/)
for (const marker of ['private.kitchen_members','is_kitchen_member','kitchen_my_access','ACTIVE', 'ADMIN','owner_id', 'RLS', 'SQL']) {
  assert.match(sql.toUpperCase(), new RegExp(marker.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
// Regression: removing the user-key, signed-out guard or gate must fail the contract.
for (const mutated of [
  app.replace('key={session.user.id}', 'key={undefined}'),
  app.replace('if (!session?.user)', 'if (false)'),
  app.replace('return <MembershipGate', 'return <HomeHubShell'),
]) {
  assert.throws(() => assertKeyedMembershipGate(mutated))
}
await access('src/components/MembershipGate.tsx')
console.log('Kitchen H7.1 membership gate source contract: PASS')
