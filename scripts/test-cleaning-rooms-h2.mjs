import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// REPO regression only: source and UI contracts. SQL authority is kept and checked
// separately under OUTSIDE_REPO/SQL, never duplicated into deployable source.
const read = (path) => readFile(path, 'utf8')
const [hub, shell, data, styles, flags, h1, contract] = await Promise.all([
  read('src/components/HomeHubShell.tsx'),
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/cleaning/cleaningRooms.ts'),
  read('src/styles/global.css'),
  read('src/config/featureFlags.ts'),
  read('scripts/test-home-hub-shell.mjs'),
  read('tests/CLEANING_ROOMS_H2_CONTRACT.md'),
])
assert.match(hub, /<CleaningShell ownerId=\{user\.id\} onExit=\{returnHome\}/)
assert.match(shell, /loadCleaningRooms\(ownerId\)/)
for (const method of ['createCleaningRoom','renameCleaningRoom','setCleaningRoomArchived','validateCleaningRoomName']) {
  assert.ok(shell.includes(method), `Missing Cleaning UI operation: ${method}`)
  assert.ok(data.includes(`function ${method}(`), `Missing Cleaning DB operation: ${method}`)
}
for (const marker of ['onSubmit=', 'Archiwizuj', 'Przywróć pomieszczenie', 'Pomieszczenie o tej nazwie już istnieje', 'is_archived', "eq('owner_id', ownerId)"]) {
  assert.ok(`${shell}\n${data}`.includes(marker), `Missing H2 contract marker: ${marker}`)
}
assert.match(shell, /setSaving\(true\)/)
assert.match(shell, /setSaving\(false\)/)
assert.match(shell, /renderLoadStatus\(\)/)
assert.match(data, /\.from\('cleaning_rooms'\)/)
assert.doesNotMatch(data, /\.delete\(/)
assert.match(data, /\.eq\('owner_id', ownerId\)/)
assert.match(data, /\.eq\('is_archived', false\)/)
assert.match(data, /\.eq\('is_archived', !archived\)/)
assert.match(styles, /\.cleaning-room-editor/)
assert.match(styles, /\.cleaning-room-card/)
assert.match(flags, /export const KITCHEN_VOICE_ENABLED = false/)
assert.match(h1, /ownerId=\\\{user/)
assert.match(contract, /OUTSIDE_REPO\/SQL\/H2_ROOMS/)
console.log('Kitchen H2 Cleaning Rooms source + UI regression: PASS')
