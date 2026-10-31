import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (file) => readFile(file, 'utf8')
const [shell, task, formSheet, css, roomApi, taskApi] = await Promise.all([
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/cleaning/CleaningTaskBoard.tsx'),
  read('src/components/AppFormSheet.tsx'),
  read('src/styles/global.css'),
  read('src/features/cleaning/cleaningRooms.ts'),
  read('src/features/cleaning/cleaningTasks.ts'),
])
// Both Cleaning editors reuse Food's existing sheet, form and button vocabulary.
for (const component of [shell, task]) {
  assert.match(component, /<AppFormSheet/)
  assert.match(component, /className="cleaning-room-editor inventory-form"/)
  assert.match(component, /className="form-field"/)
  assert.match(component, /className="sheet-actions"/)
  assert.match(component, /className="primary-button"/)
  assert.match(component, /className="secondary-button"/)
}
for (const marker of ['sheet-backdrop', 'inventory-sheet', 'sheet-handle', 'sheet-header', 'aria-modal="true"', 'icon-button']) {
  assert.ok(formSheet.includes(marker), `Shared Food-style editor sheet missing ${marker}`)
}
assert.match(formSheet, /event\.target === event\.currentTarget && !busy/)
assert.match(formSheet, /event\.key === 'Escape'/)
// Date stays an actual accessible native date input; iOS users see the calendar affordance.
assert.match(task, /htmlFor="cleaning-task-due"/)
assert.match(task, /id="cleaning-task-due" type="date" required value=\{dueDate\}/)
assert.match(task, /className="cleaning-date-field"/)
assert.match(task, /className="cleaning-date-icon"/)
assert.match(task, /KitchenIcon name="calendar"/)
assert.match(css, /\.cleaning-date-field input\[type="date"\]/)
assert.match(css, /\.cleaning-date-icon\s*\{/)
assert.match(css, /pointer-events: none/)
assert.match(css, /\.cleaning-editor-sheet/)
assert.match(css, /max-height: calc\(100dvh - 8px\)/)
// Pure UI corrective: data-layer signatures are still present and rechecked by original H2/H3 contracts.
assert.match(roomApi, /createCleaningRoom/)
assert.match(taskApi, /completeCleaningTask/)
console.log('Kitchen H3.1 UI parity + iOS native date affordance: PASS')
