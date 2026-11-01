import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  rollingScheduleDays, shortCalendarWeekday, rollingScheduleHeader, rollingScrollShift,
  scheduleQueryRange, earliestScheduleDay, addCalendarDays, calendarDayDistance,
} from '../src/features/cleaning/cleaningSchedule.ts'

const today = '2026-11-01'
assert.deepEqual(rollingScheduleDays('2026-11-02'), ['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08'])
assert.deepEqual(rollingScheduleDays(addCalendarDays('2026-11-02',1)),
  ['2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09'])
assert.deepEqual(rollingScheduleDays(addCalendarDays('2026-11-02',2)),
  ['2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09','2026-11-10'])
assert.equal(shortCalendarWeekday('2026-11-03'), 'wt.')
assert.equal(shortCalendarWeekday('2026-11-09'), 'pon.')
assert.equal(shortCalendarWeekday('2026-12-01'), 'wt.')
assert.match(rollingScheduleHeader('2026-11-30'), /listopad.*grudzień 2026/i)
assert.match(rollingScheduleHeader('2026-12-30'), /grudzień 2026.*styczeń 2027/i)
assert.equal(addCalendarDays('2024-02-28',1),'2024-02-29')
assert.equal(addCalendarDays('2026-10-24',2),'2026-10-26')
// Native scrolling is centered at the width of one seven-day page, and snaps by each cell.
for (const width of [280, 320, 366, 390, 430]) {
  const cell = width / 7
  assert.equal(rollingScrollShift(width,width,'2026-11-02',today),0)
  assert.equal(rollingScrollShift(width+cell,width,'2026-11-02',today),1)
  assert.equal(rollingScrollShift(width+2*cell,width,'2026-11-02',today),2)
  assert.equal(rollingScrollShift(width-cell,width,'2026-11-02',today),-1)
  assert.equal(rollingScrollShift(width+7*cell,width,'2026-11-02',today),7)
}
assert.equal(rollingScrollShift(0,366,'2026-10-25',today),0)
assert.equal(rollingScrollShift(0,366,'2026-10-26',today),-1)
assert.equal(earliestScheduleDay('2026-11-01'),'2026-10-25')
for (const start of ['2026-10-25','2026-11-02','2026-12-31','2027-02-02']) {
  const {from,to} = scheduleQueryRange(start,today)
  assert.ok(from>=earliestScheduleDay(today))
  assert.ok(from<=start && to>=addCalendarDays(start,6))
  assert.ok(calendarDayDistance(from,to)<=41)
}
const [component, css, shell] = await Promise.all([
  readFile('src/features/cleaning/CleaningSchedule.tsx','utf8'),
  readFile('src/styles/global.css','utf8'),
  readFile('src/features/cleaning/CleaningShell.tsx','utf8'),
])
for (const needle of ['rollingScheduleDays(windowStart)', 'rollingScheduleDays(addCalendarDays(windowStart, -7), 21)',
  'shortCalendarWeekday(date)', 'rollingScrollShift(', 'onScroll=', "element.addEventListener('scrollend'",
  'scrollLeft', 'useLayoutEffect', 'setSelectedDate(date)', 'setVisibleStart(', 'calendarCache',
  'Przejdź do dzisiaj', 'onPointerCancel=', 'loadCleaningOccurrences(query.from, query.to)',
  'runCompletion(occurrence, task)', 'undoRecent()']) assert.ok(component.includes(needle),`Missing ${needle}`)
assert.match(css, /\.cleaning-schedule-week-clip \{[^}]*overflow-x: auto;[^}]*scroll-snap-type: x mandatory/)
assert.match(css, /\.cleaning-schedule-weekdays \{[^}]*repeat\(21/)
assert.match(css, /\.cleaning-schedule-weekdays button \{[^}]*scroll-snap-align: start; scroll-snap-stop: always/)
assert.doesNotMatch(component,/setPointerCapture|onPointerMove|7 \* direction|swallowSwipeClick|Przywróć początkowy tydzień|datePickerOpen|setMode\(/)
assert.match(shell, /jumpToToday/)
console.log('H6.4.4B rolling native-scroll calendar source+date contract: PASS; iPhone QA still required')
