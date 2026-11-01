import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
const read = p => readFile(p, 'utf8')
const [board, start, calendar, api, style, shell, verifier, sql] = await Promise.all([
  read('src/features/cleaning/CleaningTaskBoard.tsx'),
  read('src/features/cleaning/CleaningStartTasks.tsx'),
  read('src/features/cleaning/CleaningSchedule.tsx'),
  read('src/features/cleaning/cleaningTasks.ts'),
  read('src/styles/global.css'),
  read('src/features/cleaning/CleaningShell.tsx'),
  read('scripts/verify-project.mjs'),
  read('../OUTSIDE_REPO/SQL/ALL_IN_ONE.sql').catch(() => ''),
])
// Definition-only room catalog: no stale due badges, any UI checkbox, or completion hooks.
for (const marker of [
  'createCleaningTask(', 'updateCleaningTask(', 'deleteCleaningTask(', 'renderDeleteConfirm',
  'await loadCleaningTasks(ownerId, room.id)', 'onChanged()',
  'cleaning-catalog-edit', 'cleaning-catalog-content',
  'recurrenceLabel(task.recurrenceKind, task.recurrenceInterval)',
  'const canEdit = !room.isArchived && !task.isArchived && !task.isCompleted',
  "a.title.localeCompare(b.title, 'pl')", 'Zrobione (', 'Ukryte zadania (',
  'Następny termin', 'Pierwszy termin', 'Termin wykonania',
  'id="cleaning-task-due" type="date"',
]) assert.ok(board.includes(marker), `H6.4.3E missing ${marker}`)
for (const pattern of [/type="checkbox"/, /cleaningDueStatus/, /useCleaningTaskCompletion/,
  /useCleaningTaskUndo/, /runCompletion/, /runUndo/, /Cofnij ostatnie wykonanie/,
  /justCompletedId/, /cleaning-task-leading/, /cleaning-due-status/]) {
  assert.doesNotMatch(board, pattern, `Execution UI must not exist in Rooms: ${pattern}`)
}
for (const pattern of [/cleaning-task-leading/, /cleaning-task-checkbox-hit/, /cleaning-undo-link/]) {
  assert.doesNotMatch(style, pattern, `Orphan board CSS remains: ${pattern}`)
}
assert.match(style, /\.cleaning-catalog-card/)
assert.match(style, /\.cleaning-catalog-edit:focus-visible/)
assert.match(style, /\.cleaning-dashboard-check input\[type="checkbox"\]/)
for (const file of [start,calendar]) {
  assert.match(file, /type="checkbox"|checkbox/i, 'Start/Schedule must keep completion UI')
  assert.match(file, /useCleaningOccurrenceCompletion/, 'Start/Schedule must keep server occurrence completion')
}
assert.match(start, /useCleaningTaskUndo/)
assert.match(calendar, /useCleaningTaskUndo/)
assert.match(api, /rpc\('h63_delete_cleaning_task'/)
assert.match(api, /h4_update_cleaning_task/)
assert.doesNotMatch(api, /export async function completeCleaningTask/)
assert.doesNotMatch(board, /lastCompletedAt|cycleGeneration \+ 1/)
assert.match(shell, /<CleaningTaskBoard/)
assert.match(verifier, /scripts\/test-cleaning-h6-4-3e\.mjs/)
const files = await readdir('src/features/cleaning')
assert.ok(!files.includes('useCleaningTaskCompletion.ts'), 'Unused H4 completion hook must be removed')
assert.ok(!sql || sql.includes('h64_'), 'Canonical fresh-install SQL preserved')
console.log('H6.4.3E definition-only Rooms; independent Start/Schedule execution; CRUD + CSS: PASS')
