import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cleaningDashboardGroups } from '../src/features/cleaning/cleaningDashboard.ts'

const task = (id, date, options = {}) => ({ id, title: id, roomId: 'room',
  nextDueDate: date, scheduleRevision: 1, cycleGeneration: 4,
  isArchived: false, isCompleted: false, ...options })
const occ = (id, date, options = {}) => ({ taskId: id, roomId: 'room',
  scheduledDueDate: date, scheduleRevision: 1, cycleGeneration: 4,
  isDone: false, isActionable: false, ...options })
const date = '2026-11-01'
const tasks = [task('biweekly',date), task('late','2026-09-01'),
  task('once','2026-11-02'), task('hidden','2026-11-03', { isArchived: true }),
  task('done','2026-11-01',{ isCompleted:true }), task('other','2026-11-01',{roomId:'elsewhere'})]
const events = [occ('biweekly','2026-11-01',{isActionable:true}),
  occ('biweekly','2026-11-15'), occ('biweekly','2026-11-08'),
  occ('biweekly','2026-11-08'), occ('once','2026-11-02',{isActionable:true}),
  occ('late','2026-11-05'), occ('hidden','2026-11-03'), occ('done','2026-11-03'),
  occ('other','2026-11-03'), occ('once','2026-11-04',{scheduleRevision:0}), occ('once','2026-11-06',{cycleGeneration:3}),
  occ('biweekly','2026-11-04',{isDone:true})]
const result = cleaningDashboardGroups(tasks, events, new Set(['room']), date)
assert.deepEqual(result.due.map((r)=>r.task.id), ['late','biweekly'])
assert.deepEqual(result.upcoming.map((r)=>`${r.task.id}:${r.occurrence.scheduledDueDate}`), [
  'once:2026-11-02','late:2026-11-05','biweekly:2026-11-08',
])
assert.equal(result.upcoming[0].occurrence.isActionable,true)
assert.equal(result.upcoming[2].occurrence.isActionable,false)
assert.deepEqual(cleaningDashboardGroups(tasks, [], new Set(['room']), date).upcoming, [],
  'missing server projections must NOT invent dates')
assert.equal(cleaningDashboardGroups(tasks, [], new Set(['room']), date).due.length,2,
  'old overdue cursor is never deleted by the 7-day history window')

const read = (path) => readFile(path,'utf8')
const [start, shell, schedule, sharedHook, board, api, css, verifier] = await Promise.all([
  read('src/features/cleaning/CleaningStartTasks.tsx'), read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/cleaning/CleaningSchedule.tsx'), read('src/features/cleaning/useCleaningOccurrenceCompletion.ts'),
  read('src/features/cleaning/CleaningTaskBoard.tsx'), read('src/features/cleaning/cleaningOccurrences.ts'),
  read('src/styles/global.css'),read('scripts/verify-project.mjs'),
])
assert.match(start, /loadCleaningOccurrences\(date, addCalendarDays\(date, 7\)\)/)
assert.match(start, /Promise\.all\(/)
assert.match(start, /cleaningDashboardGroups\(tasks, occurrences, activeRoomIds, today\)/)
assert.match(start, /runCompletion\(entry\.occurrence, entry\.task\)/)
assert.match(start, /onChanged\(\)/)
assert.match(start, /await refresh\(\)/)
assert.match(start, /useCleaningTaskUndo/)
assert.doesNotMatch(start, /formatCleaningDate\(|run\(task\)/)
assert.doesNotMatch(shell, /key=\{taskRevision\} ownerId=\{ownerId\}/)
assert.match(shell, /const pageTitle = view === 'rooms' \? selectedRoom\?\.name \?\? 'Pomieszczenia' : view === 'schedule' \? 'Harmonogram' : 'Start'/)
assert.equal((shell.match(/<h1\b/g)||[]).length,1,'single Cleaning shell H1')
assert.match(shell, /id="cleaning-page-title"/)
assert.match(shell, /aria-labelledby="cleaning-page-title"/)
assert.doesNotMatch(shell, /Twój dom, Twój rytm|<h1 id="cleaning-rooms-title"/)
assert.match(shell, /onClick=\{\(\) => openEditor\('create'\)\}/)
assert.match(shell, /onClick=\{\(\) => openEditor\('rename'\)\}/)
assert.match(shell, /setShowTodayIntent\(\(n\) => n \+ 1\)/)
assert.match(schedule, /runCompletion\(occurrence, task\)/)
assert.match(start, /useCleaningOccurrenceCompletion/)
assert.match(schedule, /useCleaningOccurrenceCompletion/)
assert.match(board, /useCleaningTaskCompletion/)
assert.match(sharedHook, /previous\.generation !== occurrence\.cycleGeneration/)
assert.match(sharedHook, /previous\.revision !== occurrence\.scheduleRevision/)
assert.match(sharedHook, /previous\.date !== occurrence\.scheduledDueDate/)
assert.match(sharedHook, /pending\.current\.set\(task\.id, operation\)/)
assert.match(api, /h64_complete_cleaning_occurrence/)
assert.match(css, /\.cleaning-dashboard-task-meta/)
assert.match(css, /\.cleaning-header \.cleaning-shell-page-title/)
assert.match(verifier, /test-cleaning-h6-4-3\.mjs/)
console.log('H6.4.3 unified shell, Start server projection and shared occurrence completion: PASS')
