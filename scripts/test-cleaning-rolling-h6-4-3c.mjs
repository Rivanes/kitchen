import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { occurrenceCalendarDay, scheduleEntries, entriesOn } from '../src/features/cleaning/cleaningSchedule.ts'

const read = (path) => readFile(path,'utf8')
const [schedule, old, incremental, fresh, canonical] = await Promise.all([
 read('src/features/cleaning/cleaningSchedule.ts'),
 read('../OUTSIDE_REPO/SQL/H64_SCHEDULE_ENGINE/H64_2_MIGRATION.sql').catch(() => ''),
 read('../OUTSIDE_REPO/SQL/H64_SCHEDULE_ENGINE/H64_7_ROLLING_COMPLETION_MIGRATION.sql').catch(() => ''),
 read('../OUTSIDE_REPO/SQL/H64_SCHEDULE_ENGINE/H64_9_FRESH_INSTALL_ROLLING_ENGINE_REFERENCE.sql').catch(() => ''),
 read('../OUTSIDE_REPO/SQL/ALL_IN_ONE.sql').catch(() => ''),
])
const event = {taskId:'weekly',roomId:'room',scheduledDueDate:'2026-10-31',
  completedLocalDate:'2026-11-01',isDone:true,isActionable:false,scheduleRevision:0,cycleGeneration:1}
const task = {id:'weekly',roomId:'room',title:'Test',isArchived:false,isCompleted:false}
const entries=scheduleEntries([event],[task],new Set(['room']))
assert.equal(occurrenceCalendarDay(event),'2026-11-01')
assert.equal(entriesOn(entries,'2026-10-31').length,0)
assert.equal(entriesOn(entries,'2026-11-01').length,1)
assert.equal(entriesOn(entries,'2026-11-01')[0].occurrence.scheduledDueDate,'2026-10-31')
assert.match(schedule,/completedLocalDate\s*:\s*occurrence\.scheduledDueDate|occurrence\.completedLocalDate/)
// SQL is OUTSIDE_REPO (not a GitHub dependency), but when present verify complete authority.
if (old && incremental && fresh && canonical) {
  assert.match(old, /Schedule does NOT drift/)
  assert.match(incremental,/^begin;[\s\S]*commit;\s*$/m)
  assert.match(incremental,/schedule_anchor_date_before date/)
  assert.match(incremental,/private\.h64_occurrence_date\(v_local_day,/)
  assert.match(incremental,/v_row\.next_due_date,v_row\.schedule_anchor_date/)
  assert.match(incremental,/schedule_anchor_date=coalesce\(v_completion\.schedule_anchor_date_before,v_row\.schedule_anchor_date\)/)
  assert.match(incremental,/e\.completed_local_date between p_from and p_to/)
  assert.doesNotMatch(incremental,/cron\.schedule\(/)
  assert.match(incremental,/if exists \(select 1 from information_schema.columns/)
  assert.ok(canonical.endsWith(fresh))
  assert.equal((fresh.match(/create or replace function public\.h4_complete_cleaning_task\(/g)||[]).length,1)
  assert.match(fresh,/alter table public\.cleaning_task_completions add column schedule_anchor_date_before date/)
}
console.log('H6.4 rolling completion calendar and SQL source contract: PASS (DB runtime QA pending)')
