import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cleaningDashboardGroups } from '../src/features/cleaning/cleaningDashboard.ts'
import { scheduleEntries, entriesOn, overdueBacklog } from '../src/features/cleaning/cleaningSchedule.ts'

const today = '2026-11-01'
const task = (id, date) => ({ id, title: id, roomId:'room', nextDueDate:date,
  recurrenceKind:'every_days',recurrenceInterval:1,scheduleRevision:0,cycleGeneration:0,
  isArchived:false,isCompleted:false })
const event = (id, date, actionable=false) => ({taskId:id,roomId:'room',
  scheduledDueDate:date,isActionable:actionable,isDone:false,
  scheduleRevision:0,cycleGeneration:0,completedLocalDate:null})
const rooms = new Set(['room'])
const vacuum = task('Puścić odkurzacz','2026-10-31')
const current = task('Bieżące zadanie','2026-11-01')
const tomorrow = task('Jutrzejsze zadanie','2026-11-02')
const events = [
  event(vacuum.id,'2026-11-01'), event(vacuum.id,'2026-11-02'), // old buggy RPC response
  event(current.id,'2026-11-01',true),event(current.id,'2026-11-02'),
  event(tomorrow.id,'2026-11-02',true),event(tomorrow.id,'2026-11-03'),
]
const groups = cleaningDashboardGroups([vacuum,current,tomorrow],events,rooms,today)
assert.deepEqual(groups.due.map((e)=>e.task.id),[vacuum.id,current.id])
assert.deepEqual(groups.upcoming.map((e)=>e.task.id),[tomorrow.id],
  'Start must never show a blocked future date as Jutro while the previous due is open')
assert.deepEqual(overdueBacklog([vacuum,current,tomorrow],rooms,today).map((t)=>t.id),[vacuum.id])

const sql = await readFile('../OUTSIDE_REPO/SQL/H64_SCHEDULE_ENGINE/H64_11_NO_PHANTOM_OVERDUE_PROJECTIONS.sql','utf8')
const fresh = await readFile('../OUTSIDE_REPO/SQL/H64_SCHEDULE_ENGINE/H64_9_FRESH_INSTALL_ROLLING_ENGINE_REFERENCE.sql','utf8')
const canonical = await readFile('../OUTSIDE_REPO/SQL/ALL_IN_ONE.sql','utf8')
for (const body of [sql,fresh,canonical]) {
  assert.match(body,/future_ordinal as \([\s\S]*?where not t\.is_completed and t\.recurrence_kind<>'once'[\s\S]*?and t\.next_due_date>=v_today/)
  assert.match(body,/e\.completed_local_date between p_from and p_to/)
}
assert.match(sql,/schedule_anchor_date_before/)
assert.match(sql,/^begin;[\s\S]*commit;\s*$/m)
assert.ok(canonical.endsWith(fresh),'canonical fresh SQL must match latest rolling function')
assert.doesNotMatch(sql,/delete from|alter table|cron\.schedule\(/i)
assert.match((await readFile('src/features/cleaning/cleaningDashboard.ts','utf8')),/!occurrence\.isActionable/)
console.log('H6.4.3D phantom overdue projection reconciliation: PASS (live SQL & phone QA pending)')
