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

// The calendar may show only the current, actionable overdue cursor; fabricated future dates
// are prohibited by the H64_11 SQL RPC (verified separately in the outside-repo SQL gate).
const actual = event(vacuum.id, '2026-10-31', true)
const calendar = scheduleEntries([actual], [vacuum], rooms)
assert.deepEqual(entriesOn(calendar, '2026-10-31').map((e) => e.task.id), [vacuum.id])
assert.deepEqual(entriesOn(calendar, '2026-11-01'), [])

console.log('H6.4.3D frontend/dashboard overdue regression: PASS (SQL checked in OUTSIDE_REPO QA)')
