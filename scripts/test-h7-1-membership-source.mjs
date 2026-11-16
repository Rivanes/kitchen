import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'

const app = await readFile('src/App.tsx','utf8')
const gate = await readFile('src/components/MembershipGate.tsx','utf8')
const login = await readFile('src/components/LoginPage.tsx','utf8')
const sql = await readFile('tests/H7_1_MEMBERSHIP_CONTRACT.md','utf8')
assert.match(app, /<MembershipGate key=\{session\.user\.id\} user=\{session\.user\} \/>/)
assert.match(gate, /\.rpc\('kitchen_my_access'\)/)
assert.match(gate, /setStatus\('checking'\)/)
assert.match(gate, /if \(!current\) return/)
assert.match(gate, /status === 'active'\) return <HomeHubShell user=\{user\}/)
assert.match(gate, /status === 'suspended'/)
assert.doesNotMatch(gate, /is_kitchen_owner|service_role|\.signUp\(/)
assert.doesNotMatch(login, /\.signUp\(/)
assert.match(login, /Dostęp tylko dla zaproszonych użytkowników Kitchen/)
for (const marker of ['private.kitchen_members','is_kitchen_member','kitchen_my_access','ACTIVE', 'ADMIN','owner_id', 'RLS', 'SQL']) {
  assert.match(sql.toUpperCase(), new RegExp(marker.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
await access('src/components/MembershipGate.tsx')
console.log('Kitchen H7.1 membership gate source contract: PASS')
