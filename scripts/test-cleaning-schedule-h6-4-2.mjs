import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  addCalendarDays, earliestScheduleDay, clampScheduleDay, scheduleRange,
  scheduleEntries, entriesOn, overdueBacklog, canUndoOccurrence, swipeDirection,
} from '../src/features/cleaning/cleaningSchedule.ts'

const today = '2026-10-31'
assert.equal(earliestScheduleDay(today), '2026-10-24')
assert.equal(clampScheduleDay('2026-10-23', today), '2026-10-24')
assert.equal(clampScheduleDay('2026-11-14', today), '2026-11-14')
assert.deepEqual(scheduleRange('2026-10-24', 'week', today), {
  from: '2026-10-24', to: '2026-10-25',
  days: ['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25'],
  activeFrom: '2026-10-24', activeTo: '2026-10-25',
})
assert.equal(scheduleRange('2026-11-14','day',today).from,'2026-11-09')
assert.equal(addCalendarDays('2026-10-31',14),'2026-11-14')
assert.equal(swipeDirection(-90, 8, 110, 390), 1)
assert.equal(swipeDirection(90, 8, 110, 390), -1)
assert.equal(swipeDirection(80, 120, 110, 390), 0) // Scroll, not swipe.
assert.equal(swipeDirection(-80, 0, 8, 390), 0) // iOS back gesture area.
assert.equal(swipeDirection(40, 0, 110, 390), 0)

const task = (id, roomId, nextDueDate, extra={}) => ({
  id, roomId, title: id, nextDueDate, isCompleted: false, isArchived: false, ...extra,
})
const tasks = [task('pet','animals','2026-10-31'),task('wc','bath','2026-10-27'),
  task('old','bath','2026-10-01'),task('archived','bath','2026-10-31',{isArchived:true})]
const event = (taskId, scheduledDueDate, extra={}) => ({
  taskId, roomId: taskId==='pet'?'animals':'bath', scheduledDueDate,
  completedLocalDate: null, isDone: false, isActionable: false,
  scheduleRevision: 0, cycleGeneration: 0, ...extra,
})
const projected = [event('pet','2026-10-31',{isActionable:true}),
  event('pet','2026-11-14'), event('pet','2026-11-28'),
  event('wc','2026-10-27',{isDone:true}),event('archived','2026-10-31')]
const rooms = new Set(['animals','bath'])
const entries = scheduleEntries(projected,tasks,rooms,'all')
assert.deepEqual(entries.filter(x => x.task.id==='pet').map(x => x.occurrence.scheduledDueDate),
  ['2026-10-31','2026-11-14','2026-11-28'])
assert.deepEqual(entriesOn(entries,'2026-11-14').map(x=>x.task.id),['pet'])
assert.equal(entriesOn(scheduleEntries(projected,tasks,rooms,'bath'),'2026-11-14').length,0)
assert.equal(entries.some(x=>x.task.id==='archived'), false)
const doneEvent = event('pet','2026-10-31',{ isDone:true })
const latestTask = { ...tasks[0],lastCompletedAt:'2026-10-31T15:00:00+00:00' }
assert.equal(canUndoOccurrence(doneEvent, latestTask,
  { dueDate:'2026-10-31',completedAt:latestTask.lastCompletedAt }),true)
assert.equal(canUndoOccurrence(doneEvent, latestTask,
  { dueDate:'2026-10-17',completedAt:latestTask.lastCompletedAt }),false)
assert.equal(canUndoOccurrence(doneEvent, latestTask,
  { dueDate:'2026-10-31',completedAt:'2026-10-30T15:00:00+00:00' }),false)
assert.equal(canUndoOccurrence(event('pet','2026-10-31'),latestTask,
  { dueDate:'2026-10-31',completedAt:latestTask.lastCompletedAt }),false)
assert.deepEqual(overdueBacklog(tasks, rooms, 'all',today,'2026-10-26').map(x=>x.id),['old'])
assert.deepEqual(overdueBacklog(tasks, rooms, 'bath',today,'2026-10-31').map(x=>x.id),['old','wc'])

const [ui, rpc, css, verifier, oldH6] = await Promise.all([
  readFile('src/features/cleaning/CleaningSchedule.tsx','utf8'),
  readFile('src/features/cleaning/cleaningOccurrences.ts','utf8'),
  readFile('src/styles/global.css','utf8'),
  readFile('scripts/verify-project.mjs','utf8'),
  readFile('scripts/test-cleaning-h6-ui.mjs','utf8'),
])
for (const marker of ['loadCleaningOccurrences(', 'completeCleaningOccurrence(',
  'scheduledDueDate', 'isActionable', 'swipeDirection(', 'onTouchEnd={touchEnd}',
  'earliestScheduleDay(', 'cleaningDueStatus(', 'undoRecent()', 'clampScheduleDay(',
  'setMode(\'day\')', 'aria-pressed', 'cleaning-schedule-room'])
  assert.ok(ui.includes(marker),`Schedule missing ${marker}`)
assert.doesNotMatch(ui, /recurrenceLabel|Co 2 tygodnie|Termin: |Otwórz pomieszczenie <KitchenIcon/)
assert.match(rpc, /h64_list_cleaning_occurrences/)
assert.match(rpc, /h64_complete_cleaning_occurrence/)
assert.match(rpc, /loadRecentCleaningCompletions/)
assert.match(rpc, /\.is\('undone_at', null\)/)
assert.match(rpc, /p_scheduled_due_date: occurrence.scheduledDueDate/)
assert.match(rpc, /p_schedule_revision: occurrence.scheduleRevision/)
assert.match(css, /touch-action: pan-y/)
assert.match(css, /prefers-reduced-motion/)
assert.match(verifier,/test-cleaning-schedule-h6-4-2\.mjs/)
assert.match(oldH6,/completeCleaningOccurrence/)
console.log('H6.4.2 anchored projection, retention, swipe, undo and UI contract: PASS')
