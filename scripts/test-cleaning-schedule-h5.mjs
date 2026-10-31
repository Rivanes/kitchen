import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  addCalendarDays, mondayOfWeek, daysOfWeek, scheduleDateLabel,
  dueOn, overdueBefore, visibleScheduleTasks,
} from '../src/features/cleaning/cleaningSchedule.ts'

// Civil dates: Sunday/Monday boundaries, year change, leap day, DST.
assert.equal(mondayOfWeek('2026-11-01'), '2026-10-26') // Sunday
assert.equal(mondayOfWeek('2026-11-02'), '2026-11-02') // Monday
assert.deepEqual(daysOfWeek('2026-12-31'), [
  '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
  '2027-01-01', '2027-01-02', '2027-01-03',
])
assert.equal(addCalendarDays('2024-02-28', 1), '2024-02-29')
assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01')
assert.equal(addCalendarDays('2026-03-28', 2), '2026-03-30') // spring DST
assert.equal(addCalendarDays('2026-10-24', 2), '2026-10-26') // fall DST
assert.throws(() => addCalendarDays('2026-02-30', 1))
assert.throws(() => addCalendarDays('bogus', 1))
assert.throws(() => addCalendarDays('2026-01-01', 0.25))
assert.match(scheduleDateLabel('2026-11-01', { weekday: 'long' }), /niedziela/i)

const fixtures = [
  { id: 'today', roomId: 'a', nextDueDate: '2026-10-31', isArchived: false, isCompleted: false },
  { id: 'overdue', roomId: 'a', nextDueDate: '2026-10-29', isArchived: false, isCompleted: false },
  { id: 'done-oneoff', roomId: 'a', nextDueDate: '2026-10-31', isArchived: false, isCompleted: true },
  { id: 'future-cycle', roomId: 'b', nextDueDate: '2026-11-02', isArchived: false, isCompleted: false },
  { id: 'archived-task', roomId: 'a', nextDueDate: '2026-10-31', isArchived: true, isCompleted: false },
  { id: 'archived-room', roomId: 'z', nextDueDate: '2026-10-31', isArchived: false, isCompleted: false },
]
const all = visibleScheduleTasks(fixtures, new Set(['a', 'b']), 'all')
assert.deepEqual(all.map((t) => t.id), ['today', 'overdue', 'done-oneoff', 'future-cycle'])
assert.deepEqual(dueOn(all, '2026-10-31').map((t) => t.id), ['today', 'done-oneoff'])
assert.deepEqual(overdueBefore(all, '2026-10-31').map((t) => t.id), ['overdue'])
assert.deepEqual(visibleScheduleTasks(fixtures, new Set(['a', 'b']), 'b').map((t) => t.id), ['future-cycle'])
assert.deepEqual(visibleScheduleTasks(fixtures, new Set(['a', 'b']), 'not-a-room'), [])
assert.equal(dueOn(all, '2026-11-09').length, 0) // Do NOT fabricate subsequent recurrences.

const [schedule, shell, api, css, verifier] = await Promise.all([
  readFile('src/features/cleaning/CleaningSchedule.tsx', 'utf8'),
  readFile('src/features/cleaning/CleaningShell.tsx', 'utf8'),
  readFile('src/features/cleaning/cleaningTasks.ts', 'utf8'),
  readFile('src/styles/global.css', 'utf8'),
  readFile('scripts/verify-project.mjs', 'utf8'),
])
for (const marker of [
  "loadCleaningTasks(ownerId)", 'completeCleaningTask(', 'pendingOperations', 'requestNumber',
  'onChanged()', 'onOpenRoom(room)', 'visibleScheduleTasks(', 'daysOfWeek(',
  'overdueBefore(', 'aria-pressed', 'cleaning-schedule-date', 'cleaning-schedule-room',
  "document.addEventListener('visibilitychange'", "window.addEventListener('focus'",
]) assert.ok(schedule.includes(marker), `H5 schedule missing ${marker}`)
assert.ok(shell.includes('<CleaningSchedule ownerId={ownerId} rooms={rooms}'))
assert.doesNotMatch(shell, /Harmonogram jest pusty|Cykle dodamy w H4/)
assert.ok(api.includes(".eq('owner_id', ownerId)"))
assert.ok(api.includes("return taskRpc('h4_complete_cleaning_task'"))
assert.doesNotMatch(schedule, /\.rpc\(|\.from\(/)
assert.match(css, /\.cleaning-schedule-weekdays/)
assert.match(css, /\.cleaning-schedule-calendar/)
assert.ok(verifier.includes('scripts/test-cleaning-schedule-h5.mjs'))
console.log('H5 date / projection / RLS-bound authority / UI contract: PASS')
