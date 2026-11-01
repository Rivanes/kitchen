import assert from 'node:assert/strict'
import { cleaningDashboardGroups } from '../src/features/cleaning/cleaningDashboard.ts'
import { scheduleEntries, entriesOn, overdueBacklog } from '../src/features/cleaning/cleaningSchedule.ts'

// Deployable REPO contract: never depend on OUTSIDE_REPO SQL files.
// SQL source/migration assertions run separately in OUTSIDE_REPO/QA/H64_SQL_CONTRACT_CHECK.mjs.
const today = '2026-11-01'
const task = (id, date) => ({ id, title: id, roomId: 'room', nextDueDate: date,
  recurrenceKind: 'every_days', recurrenceInterval: 1, scheduleRevision: 0,
  cycleGeneration: 0, isArchived: false, isCompleted: false })
const event = (id, date, actionable = false) => ({ taskId: id, roomId: 'room',
  scheduledDueDate: date, isActionable: actionable, isDone: false,
  scheduleRevision: 0, cycleGeneration: 0, completedLocalDate: null })
const rooms = new Set(['room'])
const vacuum = task('Puścić odkurzacz', '2026-10-31')
const current = task('Bieżące zadanie', '2026-11-01')
const tomorrow = task('Jutrzejsze zadanie', '2026-11-02')
const events = [
  event(vacuum.id, '2026-11-01'), event(vacuum.id, '2026-11-02'), // legacy buggy RPC response
  event(current.id, '2026-11-01', true), event(current.id, '2026-11-02'),
  event(tomorrow.id, '2026-11-02', true), event(tomorrow.id, '2026-11-03'),
]
const groups = cleaningDashboardGroups([vacuum, current, tomorrow], events, rooms, today)
assert.deepEqual(groups.due.map((e) => e.task.id), [vacuum.id, current.id])
assert.deepEqual(groups.upcoming.map((e) => e.task.id), [tomorrow.id],
  'Start must never show a blocked future date as Jutro while the previous due is open')
assert.deepEqual(overdueBacklog([vacuum, current, tomorrow], rooms, today).map((t) => t.id), [vacuum.id])

// H6.4.3F: Start must filter blocked projections, but the CALENDAR must show them.
// Overdue daily tasks remain daily; uncompleted longer cycles are tentative previews.
// The backend marks all future previews non-actionable.
const actual = event(vacuum.id, '2026-10-31', true)
const calendar = scheduleEntries([actual, ...events], [vacuum, current, tomorrow], rooms)
assert.deepEqual(entriesOn(calendar, '2026-10-31').map((e) => e.task.id), [vacuum.id])
assert.ok(entriesOn(calendar, '2026-11-01').some((e) =>
  e.task.id === vacuum.id && !e.occurrence.isActionable),
'Calendar must contain daily recurrence on 1 Nov, though the old overdue cursor is still open')
assert.ok(entriesOn(calendar, '2026-11-02').some((e) =>
  e.task.id === vacuum.id && !e.occurrence.isActionable),
'Calendar must retain daily forecasts, independently of whether overdue was completed')
// A weekly forecast can shift if the overdue due date was actually completed later.
const weekly = { ...task('weekly', '2026-10-31'), recurrenceKind: 'every_weeks', recurrenceInterval: 1 }
const preview = scheduleEntries([event('weekly', '2026-11-07')], [weekly], rooms)
assert.deepEqual(entriesOn(preview, '2026-11-07').map((e) => e.task.id), ['weekly'])
const moved = scheduleEntries([event('weekly', '2026-11-08')],
  [{ ...weekly, nextDueDate: '2026-11-08', scheduleRevision: 1, cycleGeneration: 1 }], rooms)
assert.deepEqual(entriesOn(moved, '2026-11-08').map((e) => e.task.id), ['weekly'])
assert.deepEqual(entriesOn(moved, '2026-11-07'), [])

console.log('H6.4.3F calendar forecasts + H6.4.3D Start regression: PASS (SQL checked separately)')
