// H6.4.4C FINAL source release gate — REPO only. No dependence on OUTSIDE_REPO.
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import {
  addCalendarDays, earliestScheduleDay, rollingScheduleDays, rollingScrollShift,
  occurrenceCalendarDay, overdueBacklog,
} from '../src/features/cleaning/cleaningSchedule.ts'
import { cleaningDashboardGroups } from '../src/features/cleaning/cleaningDashboard.ts'

const read = (f) => readFile(f, 'utf8')
const [schedule, start, board, shell, api, hook, css, sqlModel] = await Promise.all([
  'src/features/cleaning/CleaningSchedule.tsx',
  'src/features/cleaning/CleaningStartTasks.tsx',
  'src/features/cleaning/CleaningTaskBoard.tsx',
  'src/features/cleaning/CleaningShell.tsx',
  'src/features/cleaning/cleaningOccurrences.ts',
  'src/features/cleaning/useCleaningOccurrenceCompletion.ts',
  'src/styles/global.css',
  'src/features/cleaning/cleaningDashboard.ts',
].map(read))
// One server projection authority. Start must not calculate future intervals itself.
assert.match(schedule, /loadCleaningOccurrences\(/)
assert.match(start, /loadCleaningOccurrences\(/)
assert.match(api, /rpc\('h64_list_cleaning_occurrences'/)
assert.match(api, /rpc\('h64_complete_cleaning_occurrence'/)
assert.match(hook, /completeCleaningOccurrence\(/)
assert.match(start, /useCleaningOccurrenceCompletion/)
assert.match(schedule, /useCleaningOccurrenceCompletion/)
assert.match(sqlModel, /isActionable/)
assert.doesNotMatch(sqlModel, /occurrenceDate\(|addMonths\(|recurrenceInterval\s*\*/)
// Rooms only define/edit; Start and Calendar have actual execution affordances.
assert.doesNotMatch(board, /type="checkbox"|useCleaningOccurrenceCompletion|useCleaningTaskCompletion|useCleaningTaskUndo|cleaningDueStatus/)
assert.match(start, /type="checkbox"/)
assert.match(schedule, /type="checkbox"/)
await assert.rejects(access('src/features/cleaning/useCleaningTaskCompletion.ts'), { code: 'ENOENT' })
// One heading shell, native touch, no old pointer capture or duplicate today reset.
assert.match(shell, /cleaning-room-detail-heading/)
assert.match(schedule, /onScroll=/)
assert.match(schedule, /scrollend/)
assert.match(schedule, /rollingScheduleDays\(/)
assert.match(schedule, /className="cleaning-schedule-today"/)
assert.equal((schedule.match(/className="cleaning-schedule-today"/g) ?? []).length, 1)
assert.doesNotMatch(schedule, /setPointerCapture|onPointerMove=|touchStart\(|Dzień\s*\/\s*Tydzień|Przywróć początkowy tydzień/)
assert.match(css, /scroll-snap-type:/)
assert.match(css, /overflow-x:\s*auto/)
// Rolling days, Warsaw history and actual completion day vs original due date.
assert.deepEqual(rollingScheduleDays('2026-11-02'), ['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08'])
assert.deepEqual(rollingScheduleDays('2026-11-03'), ['2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09'])
assert.equal(rollingScrollShift(800,700,'2026-11-02','2026-11-02'),1)
assert.equal(rollingScrollShift(600,700,'2026-10-26','2026-11-02'),0) // at history floor
assert.equal(earliestScheduleDay('2026-11-01'), '2026-10-25')
assert.equal(addCalendarDays('2026-12-31',1), '2027-01-01')
assert.equal(occurrenceCalendarDay({scheduledDueDate:'2026-10-31',completedLocalDate:'2026-11-01',isDone:true}), '2026-11-01')
const overdue = {id:'a',title:'Puścić odkurzacz',roomId:'r',isArchived:false,isCompleted:false,nextDueDate:'2026-10-31'}
assert.deepEqual(overdueBacklog([overdue],new Set(['r']),'2026-11-01'), [overdue])
const preview = {taskId:'a',roomId:'r',scheduledDueDate:'2026-11-02',isDone:false,isActionable:false}
const due = {taskId:'a',roomId:'r',scheduledDueDate:'2026-10-31',isDone:false,isActionable:true}
const grouped = cleaningDashboardGroups([overdue], [preview,due], new Set(['r']), '2026-11-01')
assert.equal(grouped.upcoming.length, 0, 'Do not promote blocked forecast to actionable Start upcoming')
assert.ok(grouped.due.some(e=>e.task.id==='a'), 'Past-due open obligation must remain visible')
console.log('Kitchen H6.4.4C cross-surface release source gate: PASS (not live SQL or Safari QA)')
