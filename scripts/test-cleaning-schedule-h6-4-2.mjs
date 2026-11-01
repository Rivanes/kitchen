import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  addCalendarDays, earliestScheduleDay, clampScheduleDay, rollingScheduleDays, rollingScheduleHeader, shortCalendarWeekday,
  scheduleQueryRange, calendarDayDistance, rollingScrollShift,
  scheduleEntries, entriesOn, overdueBacklog, canUndoOccurrence, occurrenceCalendarDay,
} from '../src/features/cleaning/cleaningSchedule.ts'

const today = '2026-10-31'
assert.equal(earliestScheduleDay(today), '2026-10-24')
assert.equal(clampScheduleDay('2026-10-23', today), '2026-10-24')
assert.equal(clampScheduleDay('2026-11-14', today), '2026-11-14')
assert.deepEqual(rollingScheduleDays('2026-11-03'), [
  '2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09',
])
assert.deepEqual(rollingScheduleDays('2026-11-04'), [
  '2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09','2026-11-10',
])
assert.equal(shortCalendarWeekday('2026-11-03'),'wt.')
assert.equal(shortCalendarWeekday('2026-11-09'),'pon.')
assert.equal(shortCalendarWeekday('2026-11-01'),'niedz.')
assert.match(rollingScheduleHeader('2026-11-27'), /listopad/i)
assert.match(rollingScheduleHeader('2026-11-27'), /grudzień 2026/i)
assert.match(rollingScheduleHeader('2026-12-30'), /styczeń 2027/i)
assert.equal(calendarDayDistance('2026-10-24','2026-11-03'),10)
assert.equal(rollingScrollShift(366,366,'2026-11-02','2026-11-01'),0)
assert.equal(rollingScrollShift(366 + 366/7,366,'2026-11-02','2026-11-01'),1)
assert.equal(rollingScrollShift(366 - 366/7,366,'2026-11-02','2026-11-01'),-1)
assert.equal(rollingScrollShift(366 - 366,366,'2026-10-25','2026-11-01'),0)
assert.equal(rollingScrollShift(366 + 366,366,'2026-11-02','2026-11-01'),7)
assert.equal(rollingScrollShift(366 + 10000,366,'2026-11-02','2026-11-01'),7)
assert.equal(addCalendarDays('2026-10-31',14),'2026-11-14')
for (const start of ['2026-10-24','2026-11-02','2026-11-15','2027-01-01']) {
  const range = scheduleQueryRange(start, today)
  assert.ok(range.from >= earliestScheduleDay(today))
  assert.ok(calendarDayDistance(range.from,range.to) <= 41)
  assert.ok(range.from <= start && range.to >= addCalendarDays(start,6))
}

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
const entries = scheduleEntries(projected,tasks,rooms)
assert.deepEqual(entries.filter(x => x.task.id==='pet').map(x => x.occurrence.scheduledDueDate),
  ['2026-10-31','2026-11-14','2026-11-28'])
assert.deepEqual(entriesOn(entries,'2026-11-14').map(x=>x.task.id),['pet'])
// Overdue 31 Oct checked on 1 Nov: displayed as DONE on 1 Nov,
// but the immutable scheduledDueDate 31 Oct is still used for undo identity.
const lateDone = event('pet','2026-10-31',{
  completedLocalDate: '2026-11-01', isDone: true,
})
assert.equal(occurrenceCalendarDay(lateDone), '2026-11-01')
assert.equal(occurrenceCalendarDay(event('pet','2026-11-08')), '2026-11-08')
const lateEntries = scheduleEntries([lateDone], tasks, rooms)
assert.deepEqual(entriesOn(lateEntries,'2026-11-01').map((x)=>x.task.id), ['pet'])
assert.deepEqual(entriesOn(lateEntries,'2026-10-31'), [])
assert.equal(canUndoOccurrence(lateDone, {
  ...tasks[0], lastCompletedAt: '2026-11-01T08:30:00+00:00',
}, {dueDate:'2026-10-31',completedAt:'2026-11-01T08:30:00+00:00'}),true)

assert.equal(entriesOn(scheduleEntries(projected,tasks,new Set(['bath'])),'2026-11-14').length,0)
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
assert.deepEqual(overdueBacklog(tasks, rooms, today).map(x=>x.id),['old','wc'])
assert.deepEqual(overdueBacklog(tasks, new Set(['bath']), today).map(x=>x.id),['old','wc'])

const [ui, rpc, css, verifier, oldH6] = await Promise.all([
  readFile('src/features/cleaning/CleaningSchedule.tsx','utf8'),
  readFile('src/features/cleaning/cleaningOccurrences.ts','utf8'),
  readFile('src/styles/global.css','utf8'),
  readFile('scripts/verify-project.mjs','utf8'),
  readFile('scripts/test-cleaning-h6-ui.mjs','utf8'),
])
for (const marker of ['loadCleaningOccurrences(', 'runCompletion(occurrence, task)',
  'scheduledDueDate', 'isActionable', 'onScroll=', 'onPointerDown=', 'onPointerCancel=',
  'scrollend', 'scrollLeft', 'rollingScrollShift(', 'earliestScheduleDay(', 'cleaningDueStatus(', 'undoRecent()',
  'clampScheduleDay(', 'aria-pressed', 'cleaning-schedule-week-clip',
  'rollingScheduleDays(windowStart)', 'shortCalendarWeekday(date)', 'setVisibleStart(', 'setSelectedDate(date)',
  'scheduleQueryRange(windowStart, today)', 'cacheIdentity', 'calendarCache'])
  assert.ok(ui.includes(marker), `Schedule missing ${marker}`)
assert.doesNotMatch(ui, /recurrenceLabel|Co 2 tygodnie|Termin: |Otwórz pomieszczenie <KitchenIcon/)
assert.doesNotMatch(ui, /setMode\(|datePickerOpen|selectedRoomId|onTouchMove=|cleaning-schedule-filter/)
assert.doesNotMatch(ui, /setPointerCapture|onPointerMove|swallowSwipeClick|suppressDragClick|dragOffset|Przywróć początkowy tydzień/)
assert.doesNotMatch(ui, /7 \* direction|shortWeekdays\[index\]/)
assert.match(ui, /onPointerCancel=/)
assert.match(ui, /onPointerUp=/)
assert.match(ui, /onScroll=/)
assert.match(ui, /rollingScrollShift\(element\.scrollLeft, element\.clientWidth, windowStart, today\)/)
assert.match(ui, /element\.scrollLeft = element\.clientWidth/)
assert.match(ui, /setVisibleStart\(\(start\) => clampScheduleDay\(addCalendarDays\(start, direction\), today\)\)/)
assert.match(ui, /onClick={\(\) => \{ if \(date >= floor && !busy\) setSelectedDate\(date\) \}\}/)
assert.match(ui, /Przejdź do dzisiaj/)
assert.match(ui, /Najpierw wcześniejszy termin/)
assert.match(css, /\.cleaning-schedule-week-clip \{[^}]*overflow-x: auto;[^}]*scroll-snap-type: x mandatory/ )
assert.match(css, /\.cleaning-schedule-weekdays button \{[^}]*scroll-snap-align: start/ )
assert.match(css, /reduced-motion: reduce/)
const shell = await readFile('src/features/cleaning/CleaningShell.tsx','utf8')
assert.match(shell, /const pageTitle = view === 'rooms'[\s\S]*'Harmonogram'/)
assert.match(shell, /view === 'schedule' && <CleaningSchedule/)

assert.match(rpc, /h64_list_cleaning_occurrences/)
assert.match(rpc, /h64_complete_cleaning_occurrence/)
assert.match(rpc, /loadRecentCleaningCompletions/)
assert.match(rpc, /\.is\('undone_at', null\)/)
assert.match(rpc, /p_scheduled_due_date: occurrence.scheduledDueDate/)
assert.match(rpc, /p_schedule_revision: occurrence.scheduleRevision/)
assert.match(css, /touch-action: auto/)
assert.match(css, /prefers-reduced-motion/)
assert.match(verifier,/test-cleaning-schedule-h6-4-2\.mjs/)
assert.match(oldH6,/useCleaningOccurrenceCompletion/)
console.log('H6.4.4B native-scroll rolling calendar, query windows, status and undo: PASS (iPhone QA pending)')
