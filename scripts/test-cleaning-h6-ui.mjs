import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cleaningDashboardGroups } from '../src/features/cleaning/cleaningDashboard.ts'

const tasks = [
  { id: 'a', title: 'A', roomId: 'r', nextDueDate: '2026-10-29', isArchived: false, isCompleted: false },
  { id: 'b', title: 'B', roomId: 'r', nextDueDate: '2026-10-31', isArchived: false, isCompleted: false },
  { id: 'c', title: 'C', roomId: 'r', nextDueDate: '2026-11-01', isArchived: false, isCompleted: false },
  { id: 'd', title: 'D', roomId: 'r', nextDueDate: '2026-11-07', isArchived: false, isCompleted: false },
  { id: 'e', title: 'E', roomId: 'r', nextDueDate: '2026-11-08', isArchived: false, isCompleted: false },
  { id: 'f', title: 'F', roomId: 'r', nextDueDate: '2026-10-30', isArchived: true, isCompleted: false },
  { id: 'g', title: 'G', roomId: 'r', nextDueDate: '2026-10-30', isArchived: false, isCompleted: true },
  { id: 'h', title: 'H', roomId: 'x', nextDueDate: '2026-10-30', isArchived: false, isCompleted: false },
]
assert.deepEqual(cleaningDashboardGroups(tasks, new Set(['r']), '2026-10-31').due.map((t) => t.id), ['a','b'])
assert.deepEqual(cleaningDashboardGroups(tasks, new Set(['r']), '2026-10-31').upcoming.map((t) => t.id), ['c','d'])
assert.deepEqual(cleaningDashboardGroups(tasks, new Set(['r']), '2026-12-31').upcoming, [])

const read = (x) => readFile(x,'utf8')
const [start, shell, board, schedule, hook, api, css, verifier] = await Promise.all([
  read('src/features/cleaning/CleaningStartTasks.tsx'),
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/cleaning/CleaningTaskBoard.tsx'),
  read('src/features/cleaning/CleaningSchedule.tsx'),
  read('src/features/cleaning/useCleaningTaskCompletion.ts'),
  read('src/features/cleaning/cleaningTasks.ts'),
  read('src/styles/global.css'), read('scripts/verify-project.mjs'),
])
assert.doesNotMatch(shell, /Spokojnie, po kolei\.|Twoje pomieszczenia są gotowe/)
for (const needle of ['onShowToday', 'onChanged', 'due.slice(0, 3)', 'upcoming.slice(0, 3)', 'run(task)', 'Pokaż wszystkie'])
  assert.ok(start.includes(needle), `Start missing ${needle}`)
assert.match(shell, /setShowTodayIntent\(\(n\) => n \+ 1\)/)
assert.match(schedule, /jumpToToday/)
assert.match(schedule, /setMode\('day'\)/)
assert.match(schedule, /\.filter\(\(task\) => !task.isCompleted\)/)
for (const needle of ['Zrobione (', 'showDone', 'doneTasks', 'deleteCompletedOneoffTask', 'confirmDeleteId', 'CompactQuantityStepper', 'openEdit(task)', 'cleaning-task-detail-button'])
  assert.ok(board.includes(needle), `Board missing ${needle}`)
for (const component of [start, schedule, board]) assert.match(component, /useCleaningTaskCompletion/)
assert.match(hook, /previous.generation !== task.cycleGeneration/)
assert.match(hook, /pending.current.set\(task.id, operation\)/)
assert.match(hook, /completeCleaningTask\(task.id, operation.generation, operation.id\)/)
assert.doesNotMatch(board, /Ukryj historię|>Historia</)
assert.doesNotMatch(board, /Kolejny termin liczymy od dnia|Zapis wykonania pozostaje w historii/)
assert.match(api, /rpc\('h6_delete_completed_oneoff_task'/)
assert.doesNotMatch(api, /\.from\('cleaning_tasks'\)[\s\S]{0,150}\.delete\(/)
assert.match(css, /\.cleaning-recurrence-controls/)
assert.match(verifier, /scripts\/test-cleaning-h6-ui.mjs/)
console.log('H6.1 dashboard, UI parity, idempotent owner authority, delete contract: PASS')
