import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readRepo = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8')
const [gate, app, inventory, contract, login] = await Promise.all([
  readRepo('src/components/MembershipGate.tsx'),
  readRepo('src/App.tsx'),
  readRepo('src/features/inventory/inventoryReadModel.ts'),
  readRepo('tests/H7_2_ACCOUNT_INITIALIZATION_CONTRACT.md'),
  readRepo('src/components/LoginPage.tsx'),
])

assert.match(app, /<MembershipGate key=\{session\.user\.id\} user=\{session\.user\} adminRoute=\{adminRoute\} onNavigateAdmin=\{navigateAdmin\} \/>/)
assert.match(gate, /\.rpc\('kitchen_my_access'\)/)
assert.match(gate, /if \(!current\) return/)
assert.match(gate, /if \(status === 'active'\) \{[\s\S]*return <HomeHubShell user=\{user\}/)
assert.match(gate, /status === 'suspended'/)
assert.match(inventory, /\.from\('storage_locations'\)/)
assert.match(inventory, /\.eq\('owner_id', ownerId\)/)
assert.match(inventory, /if \(locations\.length === 0\)/)
assert.doesNotMatch(gate + app + login, /\.signUp\(|service_role|\.from\('kitchen_members'\)/)
for (const marker of [
  'H7.2', 'private.h7_seed_member_locations()', 'ON CONFLICT(owner_id,slug) DO NOTHING',
  'fridge', 'freezer', 'pantry', 'spices', 'household',
  'measurement_units', 'owner_id=auth.uid()', 'H7.3',
]) assert.ok(contract.includes(marker), `Missing H7.2 invariant: ${marker}`)
console.log('Kitchen H7.2 account initialization source contract: PASS (offline only)')
