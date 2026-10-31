import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { countCleaningRoomTasks } from '../src/features/cleaning/cleaningRoomCounts.ts'

// All persisted, nonarchived task records are counted: completed one-offs included.
const tasks = [
  { id: 'todo', roomId: 'bath', isArchived: false, isCompleted: false, recurrenceKind: 'once' },
  { id: 'done-oneoff', roomId: 'bath', isArchived: false, isCompleted: true, recurrenceKind: 'once' },
  { id: 'recurring', roomId: 'bath', isArchived: false, isCompleted: false, recurrenceKind: 'days', cycleGeneration: 12 },
  { id: 'archived', roomId: 'bath', isArchived: true, isCompleted: false, recurrenceKind: 'once' },
  { id: 'other-room', roomId: 'kitchen', isArchived: false, isCompleted: false, recurrenceKind: 'once' },
]
const counted = countCleaningRoomTasks(tasks)
assert.equal(counted.get('bath'), 3, 'completed one-off counts, archived does not')
assert.equal(counted.get('kitchen'), 1, 'room scoping matters')
assert.equal(counted.get('empty') ?? 0, 0, 'true zero for an empty room')
assert.equal(countCleaningRoomTasks([{ roomId: 'bath', isArchived: false, isCompleted: false, cycleGeneration: 999 }]).get('bath'), 1, 'recurring task counts once per row, independent of completed cycles')
assert.deepEqual([...countCleaningRoomTasks([])], [])

const [shell, inventory, css, api, verifier] = await Promise.all([
  readFile('src/features/cleaning/CleaningShell.tsx','utf8'),
  readFile('src/features/inventory/InventoryPage.tsx','utf8'),
  readFile('src/styles/global.css','utf8'),
  readFile('src/features/cleaning/cleaningTasks.ts','utf8'),
  readFile('scripts/verify-project.mjs','utf8'),
])
assert.match(shell, /page-heading-row cleaning-rooms-heading/)
assert.match(shell, /className="primary-icon-button"[^>]*onClick=\{\(\) => openEditor\('create'\)\}/)
assert.match(shell, /aria-label="Dodaj pomieszczenie"/)
assert.match(shell, /className="location-count-badge"/)
assert.match(inventory, /className="location-count-badge"/)
assert.match(inventory, /className="primary-icon-button"/)
assert.match(shell, /roomCounts\.get\(room\.id\) \?\? 0/)
assert.match(shell, /countsLoad === 'ready'/)
assert.match(shell, /countsLoad === 'error'/)
assert.match(shell, /countsLoad === 'loading'/)
assert.match(shell, /onClick=\{\(\) => setCountsRefresh\(\(n\) => n \+ 1\)\}/)
assert.match(shell, /loadCleaningTasks\(ownerId\)/)
assert.match(shell, /countCleaningRoomTasks\(tasks\)/)
assert.match(shell, /taskRevision, countsRefresh/)
assert.match(shell, /visibilitychange/)
assert.match(shell, /className="cleaning-room-card"/)
assert.match(shell, /className="cleaning-room-card-icon"/)
assert.match(shell, /className="cleaning-room-card-copy"/)
assert.match(shell, /<KitchenIcon name="chevronRight" size=\{19\} \/>/)
assert.doesNotMatch(shell, /TWÓJ DOM|Wszystkie miejsca, o które chcesz zadbać|Zobacz zadania i historię wykonań/)
assert.doesNotMatch(shell, /<button className="cleaning-action cleaning-add-room"/)
assert.match(css, /\.cleaning-rooms-overview/)
assert.match(css, /\.cleaning-room-card-end/)
assert.match(css, /\.cleaning-room-card-end \.location-count-badge/)
assert.match(css, /\.cleaning-room-card \{ display: flex; align-items: center; gap: 13px; min-height: 85px;/)
assert.match(api, /\.from\('cleaning_tasks'\)\.select\(taskColumns\)\.eq\('owner_id', ownerId\)/)
assert.match(verifier, /scripts\/test-cleaning-rooms-h6-2\.mjs/)
console.log('H6.2 Rooms Food parity + task counts + refresh + no SQL: PASS')
