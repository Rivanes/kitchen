import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')
const [hub, shell, data, styles, sql, allInOne, pre, post, flags, h1] = await Promise.all([
  read('src/components/HomeHubShell.tsx'),
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/cleaning/cleaningRooms.ts'),
  read('src/styles/global.css'),
  read('tests/H2_ROOM_MIGRATION_REFERENCE.sql'),
  read('tests/H2_ROOM_MIGRATION_REFERENCE.sql'),
  read('tests/CLEANING_ROOMS_H2_CONTRACT.md'),
  read('tests/CLEANING_ROOMS_H2_CONTRACT.md'),
  read('src/config/featureFlags.ts'),
  read('scripts/test-home-hub-shell.mjs'),
])

assert.match(hub, /<CleaningShell ownerId=\{user\.id\} onExit=\{returnHome\}/)
assert.match(shell, /loadCleaningRooms\(ownerId\)/)
for (const method of ['createCleaningRoom','renameCleaningRoom','setCleaningRoomArchived','validateCleaningRoomName']) {
  assert.ok(shell.includes(method), `Missing Cleaning UI operation: ${method}`)
  assert.ok(data.includes(`function ${method}(`), `Missing Cleaning DB operation: ${method}`)
}
for (const marker of ['onSubmit=', 'Archiwizuj', 'Przywróć pomieszczenie', 'Pomieszczenie o tej nazwie już istnieje', 'is_archived', 'eq(\'owner_id\', ownerId)']) {
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
assert.match(sql, /create table public\.cleaning_rooms/)
assert.match(sql, /owner_id uuid not null default auth\.uid\(\)/)
assert.match(sql, /on public\.cleaning_rooms \(owner_id, lower\(name\)\)/)
assert.match(sql, /where is_archived = false/)
assert.match(sql, /enable row level security/)
assert.match(sql, /owner_id = auth\.uid\(\) and public\.is_kitchen_owner\(\)/)
assert.match(sql, /revoke all on table public\.cleaning_rooms from anon/)
assert.match(sql, /grant select, insert, update on table public\.cleaning_rooms to authenticated/)
assert.doesNotMatch(sql, /grant[^;]*delete[^;]*on table public\.cleaning_rooms/i)
assert.match(sql, /security invoker/)
assert.match(sql, /set search_path = ''/)
assert.match(allInOne, /create table public\.cleaning_rooms/)
assert.match(pre, /to_regclass\('public\.cleaning_rooms'\)/)
assert.match(post, /H2 STRUCTURAL POSTCHECK PASS/)
assert.match(styles, /\.cleaning-room-editor/)
assert.match(styles, /\.cleaning-room-card/)
assert.match(flags, /export const KITCHEN_VOICE_ENABLED = false/)
assert.match(h1, /ownerId=\\\{user/)
console.log('Kitchen H2 Cleaning Rooms + SQL authority contract: PASS')
