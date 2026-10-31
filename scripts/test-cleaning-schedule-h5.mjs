import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { addCalendarDays, mondayOfWeek, daysOfWeek, scheduleDateLabel } from '../src/features/cleaning/cleaningSchedule.ts'

// Historical H5 civil-day arithmetic is retained. The old "one date only" contract
// was deliberately superseded by the server-side H6.4 occurrence projection.
assert.equal(mondayOfWeek('2026-11-01'), '2026-10-26')
assert.equal(mondayOfWeek('2026-11-02'), '2026-11-02')
assert.deepEqual(daysOfWeek('2026-12-31'), [
  '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
  '2027-01-01', '2027-01-02', '2027-01-03',
])
assert.equal(addCalendarDays('2024-02-28', 1), '2024-02-29')
assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01')
assert.equal(addCalendarDays('2026-03-28', 2), '2026-03-30')
assert.equal(addCalendarDays('2026-10-24', 2), '2026-10-26')
assert.throws(() => addCalendarDays('2026-02-30', 1))
assert.throws(() => addCalendarDays('bogus', 1))
assert.throws(() => addCalendarDays('2026-01-01', 0.25))
assert.match(scheduleDateLabel('2026-11-01', { weekday: 'long' }), /niedziela/i)

const [shell, api, schedule, verifier] = await Promise.all([
  readFile('src/features/cleaning/CleaningShell.tsx', 'utf8'),
  readFile('src/features/cleaning/cleaningTasks.ts', 'utf8'),
  readFile('src/features/cleaning/CleaningSchedule.tsx', 'utf8'),
  readFile('scripts/verify-project.mjs', 'utf8'),
])
assert.ok(shell.includes('<CleaningSchedule ownerId={ownerId} rooms={rooms}'))
assert.ok(api.includes(".eq('owner_id', ownerId)"))
assert.ok(schedule.includes('loadCleaningOccurrences('))
assert.ok(verifier.includes('scripts/test-cleaning-schedule-h5.mjs'))
console.log('H5 calendar arithmetic + H6.4 superseding schedule integration: PASS')
