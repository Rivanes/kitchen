import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const read = (p) => readFile(p, 'utf8')
const root = 'src'
async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(async (entry) => {
    const pathname = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(pathname)
    return /\.(tsx?|css)$/.test(entry.name) ? [pathname] : []
  }))).flat()
}
const allFiles = await sourceFiles(root)
for (const name of allFiles) {
  const body = await read(name)
  assert.doesNotMatch(body, /is_archived|isArchived|archiv|archiw/i,
    `H7.6E user-facing archive state reintroduced in ${name}`)
}

const [rooms, shell, tasks, board, css, schedule, contract] = await Promise.all([
  read('src/features/cleaning/cleaningRooms.ts'),
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/cleaning/cleaningTasks.ts'),
  read('src/features/cleaning/CleaningTaskBoard.tsx'),
  read('src/styles/global.css'),
  read('src/features/cleaning/cleaningSchedule.ts'),
  read('tests/H7_6E_NO_ARCHIVE_HARD_DELETE_CONTRACT.md'),
])
assert.match(rooms, /export async function deleteCleaningRoom\(roomId: string\)/)
assert.match(rooms, /rpc\('h76_delete_cleaning_room', \{ p_room_id: roomId \}\)/)
assert.doesNotMatch(rooms, /\.from\('cleaning_rooms'\)[\s\S]{0,80}\.delete\(/)
assert.match(shell, /await loadCleaningTasks\(ownerId, room.id\)/)
assert.match(shell, /await deleteCleaningRoom\(room.id\)/)
assert.match(shell, /confirmDelete\?\.roomId !== room.id/)
assert.match(shell, /Usuń pomieszczenie/)
assert.match(shell, /Usuń na stałe/)
assert.match(shell, /Tej operacji nie można cofnąć/)
assert.match(shell, /const latest = await loadCleaningRooms\(ownerId\)/)
assert.match(tasks, /rpc\('h63_delete_cleaning_task'/)
assert.match(board, /Zrobione \(/)
assert.match(board, /cleaning-completed-section/)
assert.match(css, /\.cleaning-completed-section/)
assert.match(css, /\.cleaning-room-delete-confirm/)
assert.doesNotMatch(css, /cleaning-archived|cleaning-archive-confirm/)
assert.match(schedule, /earliestScheduleDay/)
assert.match(contract, /completion history|7-day|7-day schedule|7-day/i)

for (const file of (await readdir('.')).filter((s) => s.endsWith('.sql'))) {
  assert.fail(`SQL must never be in GitHub root: ${file}`)
}
console.log(`H7.6E no archive + owner-scoped hard delete source regression: PASS (${allFiles.length} source files scanned)`)

