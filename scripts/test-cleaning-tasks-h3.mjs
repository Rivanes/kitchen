import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = (file) => readFile(file, 'utf8')
const [shell, board, start, api, styles, flags] = await Promise.all([
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/cleaning/CleaningTaskBoard.tsx'),
  read('src/features/cleaning/CleaningStartTasks.tsx'),
  read('src/features/cleaning/cleaningTasks.ts'),
  read('src/styles/global.css'), read('src/config/featureFlags.ts'),
])
for (const marker of ['<CleaningTaskBoard', '<CleaningStartTasks', 'ownerId={ownerId}', "type CleaningView = 'start' | 'rooms' | 'schedule'"]) {
  assert.ok(shell.includes(marker), `H3 missing shell marker: ${marker}`)
}
// H6.4.3E: Rooms manage definitions, Start/Schedule execute occurrences.
for (const marker of ['createCleaningTask(', 'updateCleaningTask(', 'deleteCleaningTask(',
  'renderDeleteConfirm', 'onChanged()', 'openEdit(task)', 'cleaning-catalog-edit',
  'recurrenceLabel(task.recurrenceKind, task.recurrenceInterval)']) {
  assert.ok(board.includes(marker), `Definition catalog missing ${marker}`)
}
for (const forbidden of [/type="checkbox"/, /runCompletion/, /useCleaningTaskCompletion/,
  /useCleaningTaskUndo/, /cleaningDueStatus/, /Cofnij ostatnie wykonanie/]) {
  assert.doesNotMatch(board, forbidden, `Execution UI leaked into Rooms: ${forbidden}`)
}
assert.doesNotMatch(board, /Ukryj historię|>Historia</)
for (const marker of ['loadCleaningTasks(ownerId)', 'onOpenRoom(room)', 'runCompletion(entry.occurrence, entry.task)']) {
  assert.ok(start.includes(marker), `H3/H6.4 Start missing marker: ${marker}`)
}
for (const marker of [".from('cleaning_tasks')", ".from('cleaning_task_completions')", 'h4_create_cleaning_task', 'h4_update_cleaning_task', 'h3_archive_cleaning_task', 'p_expected_generation', 'p_operation_id', 'validateCleaningTask', 'Europe/Warsaw']) {
  assert.ok(api.includes(marker), `H3 missing data-layer marker: ${marker}`)
}
assert.doesNotMatch(api, /\.from\('cleaning_tasks'\)[\s\S]{0,120}\.(insert|update|delete)\(/)
assert.doesNotMatch(api, /\.from\('cleaning_task_completions'\)[\s\S]{0,120}\.(insert|update|delete)\(/)
for (const marker of ['.cleaning-tasks', '.cleaning-catalog-card', '.cleaning-catalog-edit', '.cleaning-room-editor textarea']) {
  assert.ok(styles.includes(marker), `H3 CSS missing: ${marker}`)
}
assert.match(flags, /export const KITCHEN_VOICE_ENABLED = false/)
console.log('Kitchen H3 task UI/data + H6.4 Start completion + Voice freeze: PASS')
