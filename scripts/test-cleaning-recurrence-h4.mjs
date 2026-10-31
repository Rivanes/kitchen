import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  validateCleaningRecurrence, cleaningDueStatus, cleaningDaysUntil,
  previewNextCleaningDue, recurrenceLabel,
} from '../src/features/cleaning/cleaningRecurrence.ts'

for (const [kind,interval] of [['every_days',1],['every_days',365],['every_weeks',1],['every_weeks',52],['every_months',1],['every_months',24],['once',null]]) {
  assert.equal(validateCleaningRecurrence(kind,interval).kind,kind)
}
for (const [kind,interval] of [['once',1],['every_days',0],['every_days',366],['every_weeks',53],['every_months',25],['every_months',1.5],['every_days',null]]) {
  assert.throws(() => validateCleaningRecurrence(kind,interval))
}
assert.equal(previewNextCleaningDue('2026-01-31','every_months',1),'2026-02-28')
assert.equal(previewNextCleaningDue('2024-01-31','every_months',1),'2024-02-29')
assert.equal(previewNextCleaningDue('2026-02-28','every_months',1),'2026-03-28')
assert.equal(previewNextCleaningDue('2026-12-31','every_months',2),'2027-02-28')
assert.equal(previewNextCleaningDue('2026-03-29','every_days',7),'2026-04-05') // DST: calendar days
assert.equal(previewNextCleaningDue('2026-10-25','every_weeks',1),'2026-11-01') // DST: calendar weeks
assert.equal(previewNextCleaningDue('2026-11-10','once',null),null)
assert.equal(cleaningDaysUntil('2026-11-01','2026-10-31'),1)
assert.equal(cleaningDaysUntil('2026-10-30','2026-10-31'),-1)
assert.equal(cleaningDueStatus('2026-10-31','2026-10-31').text,'Na dziś')
assert.equal(cleaningDueStatus('2026-11-01','2026-10-31').text,'Jutro')
assert.equal(cleaningDueStatus('2026-10-30','2026-10-31').kind,'overdue')
assert.equal(recurrenceLabel('every_weeks',1),'Co tydzień')
assert.throws(()=>cleaningDaysUntil('2026-02-30','2026-03-01'))

const [ui, api, start, styles, migration] = await Promise.all([
  readFile('src/features/cleaning/CleaningTaskBoard.tsx','utf8'),
  readFile('src/features/cleaning/cleaningTasks.ts','utf8'),
  readFile('src/features/cleaning/CleaningStartTasks.tsx','utf8'),
  readFile('src/styles/global.css','utf8'),
  readFile('../OUTSIDE_REPO/SQL/H4_RECURRENCE/H4_2_MIGRATION.sql','utf8').catch(()=>'')
])
for (const marker of ['cleaning-task-recurrence','cleaning-task-interval','cleaningDueStatus','recurrenceLabel','AppFormSheet','cleaning-date-icon','type="checkbox"']) {
  assert.ok(ui.includes(marker), `H4 UI missing ${marker}`)
}
for (const marker of ['h4_create_cleaning_task','h4_update_cleaning_task','h4_complete_cleaning_task','recurrence_kind','recurrence_interval','due_date_after']) {
  assert.ok(api.includes(marker), `H4 data model missing ${marker}`)
}
assert.match(start,/cleaningDueStatus/)
assert.match(styles,/\.cleaning-recurrence-stepper/)
assert.match(styles,/\.cleaning-due-status/)
// The SQL reference is outside the repository; during GitHub QA do not require a local SQL mirror.
if (migration) {
  for (const marker of ["at time zone 'Europe/Warsaw'",'for update','p_expected_generation','operation_id','due_date_after','make_interval','security definer set search_path = \'\'','revoke all on function public.h3_complete_cleaning_task']) {
    assert.ok(migration.toLowerCase().includes(marker.toLowerCase()), `H4 SQL missing ${marker}`)
  }
}
assert.doesNotMatch(api,/\.from\('cleaning_tasks'\)[\s\S]{0,100}\.(insert|update|delete)\(/)
console.log('H4 recurrence calendar + UI/API + SQL-if-present: PASS')
