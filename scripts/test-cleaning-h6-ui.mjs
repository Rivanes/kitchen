import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cleaningDashboardGroups } from '../src/features/cleaning/cleaningDashboard.ts'

const task = (id, date, extra = {}) => ({ id, title: id, roomId: 'r', nextDueDate: date,
  isArchived: false, isCompleted: false, cycleGeneration: 0, scheduleRevision: 0, ...extra })
const occurrence = (id, date, actionable = false) => ({ taskId: id, roomId: 'r',
  scheduledDueDate: date, scheduleRevision: 0, cycleGeneration: 0, isDone: false, isActionable: actionable })
const tasks = [task('a', '2026-10-29'), task('b', '2026-10-31'), task('c', '2026-11-01'),
  task('d', '2026-11-07'), task('e', '2026-11-08'), task('f', '2026-10-30', { isArchived: true }),
  task('g', '2026-10-30', { isCompleted: true }), task('h', '2026-10-30', { roomId: 'x' })]
const events = [occurrence('c','2026-11-01',true), occurrence('d','2026-11-07'),
  occurrence('e','2026-11-08'), occurrence('f','2026-11-01'), occurrence('a','2026-11-03')]
const grouped = cleaningDashboardGroups(tasks, events, new Set(['r']), '2026-10-31')
assert.deepEqual(grouped.due.map(({ task }) => task.id), ['a','b'])
assert.deepEqual(grouped.upcoming.map(({ task }) => task.id), ['c','a','d'])
assert.deepEqual(cleaningDashboardGroups(tasks, events, new Set(['r']), '2026-12-31').upcoming, [])

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
for (const needle of ['onShowToday', 'onChanged', 'due.slice(0, 3)', 'upcoming.slice(0, 3)', 'runCompletion(entry.occurrence, entry.task)', 'Pokaż wszystkie'])
  assert.ok(start.includes(needle), `Start missing ${needle}`)
assert.match(shell, /setShowTodayIntent\(\(n\) => n \+ 1\)/)
assert.match(schedule, /jumpToToday/)
assert.match(schedule, /scheduleRange\(currentDate, today\)/)
assert.match(schedule, /scheduleEntries\(occurrences, tasks/)
for (const needle of ['Zrobione (', 'showDone', 'doneTasks', 'deleteCleaningTask', 'confirmDeleteId', 'CompactQuantityStepper', 'openEdit(task)', 'cleaning-task-detail-button'])
  assert.ok(board.includes(needle), `Board missing ${needle}`)
assert.match(start, /useCleaningOccurrenceCompletion/)
assert.match(board, /useCleaningTaskCompletion/)
assert.match(schedule, /useCleaningOccurrenceCompletion/)
assert.match(schedule, /loadCleaningOccurrences/)
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
