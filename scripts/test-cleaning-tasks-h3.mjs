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
for (const marker of ['type="checkbox"', 'checked={task.isCompleted}', 'disabled={!canChange || busy}', 'createCleaningTask(', 'updateCleaningTask(', 'archiveCleaningTask(', 'completeCleaningTask(', 'loadCleaningCompletions(', 'pendingCompletion', 'crypto.randomUUID()', 'onChanged()']) {
  assert.ok(board.includes(marker), `H3 missing board marker: ${marker}`)
}
for (const marker of ['loadCleaningTasks(ownerId)', 'onOpenRoom(room)', 'task.isCompleted']) {
  assert.ok(start.includes(marker), `H3 missing start marker: ${marker}`)
}
for (const marker of [".from('cleaning_tasks')", ".from('cleaning_task_completions')", 'h4_create_cleaning_task', 'h4_update_cleaning_task', 'h3_archive_cleaning_task', 'h4_complete_cleaning_task', 'p_expected_generation', 'p_operation_id', 'validateCleaningTask', 'Europe/Warsaw']) {
  assert.ok(api.includes(marker), `H3 missing data-layer marker: ${marker}`)
}
assert.doesNotMatch(api, /\.from\('cleaning_tasks'\)[\s\S]{0,120}\.(insert|update|delete)\(/)
assert.doesNotMatch(api, /\.from\('cleaning_task_completions'\)[\s\S]{0,120}\.(insert|update|delete)\(/)
for (const marker of ['.cleaning-tasks', '.cleaning-task-card', '.cleaning-task-history', '.cleaning-room-editor textarea']) {
  assert.ok(styles.includes(marker), `H3 CSS missing: ${marker}`)
}
assert.match(flags, /export const KITCHEN_VOICE_ENABLED = false/)
console.log('Kitchen H3 task UI/data and Voice freeze source contracts: PASS')
