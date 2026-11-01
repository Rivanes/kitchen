// H6.4.4D — completion visibility regression: overdue done must show on ACTUAL day,
// be ordered after unfinished tasks, and refetch rather than reuse the stale day cache.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  scheduleViewAfterCompletion, occurrenceCalendarDay, scheduleEntries, entriesOn,
} from '../src/features/cleaning/cleaningSchedule.ts'

assert.deepEqual(scheduleViewAfterCompletion('2026-10-26', '2026-11-01'), {
  selectedDate: '2026-11-01', visibleStart: '2026-10-26',
}, 'Completing the 31 Oct backlog on 1 Nov must select Sunday without needless strip jump')
assert.deepEqual(scheduleViewAfterCompletion('2026-10-25', '2026-11-01'), {
  selectedDate: '2026-11-01', visibleStart: '2026-10-26',
}, 'Actual completion date outside the current strip must be made visible')
assert.deepEqual(scheduleViewAfterCompletion('2026-11-02', '2026-11-04'), {
  selectedDate: '2026-11-04', visibleStart: '2026-11-02',
})

const makeTask = (id,title) => ({id, roomId:'room', title, isArchived:false})
const overdueDone = {
  taskId:'rtv',roomId:'room',scheduledDueDate:'2026-10-31',
  completedLocalDate:'2026-11-01',isDone:true,isActionable:false,
  scheduleRevision:1,cycleGeneration:1,
}
const active = {
  taskId:'vacuum',roomId:'room',scheduledDueDate:'2026-11-01',
  completedLocalDate:null,isDone:false,isActionable:true,
  scheduleRevision:1,cycleGeneration:0,
}
const entries = scheduleEntries([overdueDone,active], [makeTask('rtv','Umyć RTV'),makeTask('vacuum','Puścić odkurzacz')], new Set(['room']))
assert.equal(occurrenceCalendarDay(overdueDone), '2026-11-01')
assert.deepEqual(entriesOn(entries,'2026-10-31'), [], 'A late completion must not appear on the old due date')
assert.deepEqual(entriesOn(entries,'2026-11-01').map(e=>[e.task.title,e.occurrence.isDone]), [
  ['Puścić odkurzacz',false],['Umyć RTV',true],
], 'Completed rows must appear below unfinished ones')

const source = await readFile('src/features/cleaning/CleaningSchedule.tsx','utf8')
const css = await readFile('src/styles/global.css','utf8')
const complete = source.slice(source.indexOf('async function complete('),source.indexOf('async function undoRecent('))
const undo = source.slice(source.indexOf('async function undoRecent('),source.indexOf('function renderCard('))
for (const expected of [
  'scheduleViewAfterCompletion(windowStart, completedToday)',
  'setSelectedDate(target.selectedDate)', 'setVisibleStart(target.visibleStart)',
  'invalidateCalendar()', 'onChanged()',
]) assert.ok(complete.includes(expected),`Completion handler missing: ${expected}`)
assert.match(source,/function invalidateCalendar\(\)\s*\{\s*requestNumber\.current \+= 1[^\n]*\n\s*calendarCache\.current\.clear\(\)\s*setMutationVersion\(/)
assert.match(source,/useEffect\(\(\) => \{\s*void refresh\(false, true\)\s*\}, \[refresh, mutationVersion\]\)/)
assert.ok(undo.includes('invalidateCalendar()'), 'Undo must also re-fetch, not serve stale completion snapshots')
assert.ok(source.includes('if (canUndoHere) void undoRecent(task)'), 'Checked item must remain directly undoable')
assert.match(source,/role="status" aria-live="polite">\{announcement\}/, 'Success must be announced accessibly')
assert.doesNotMatch(source,/cleaning-schedule-feedback|setFeedback\(|lastCompleted/, 'Do not show redundant green toast or depend on a toast-only undo')
assert.doesNotMatch(css,/\.cleaning-schedule-feedback/, 'Remove obsolete feedback CSS')
console.log('H6.4.4D actual-date completion, cache refresh, bottom-list ordering and checkbox undo: PASS')
