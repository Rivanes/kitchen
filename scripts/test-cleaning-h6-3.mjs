import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
import { recurrenceLabel, cleaningDueStatus } from '../src/features/cleaning/cleaningRecurrence.ts'
const read = x => readFile(x,'utf8')
const files = ['src/features/cleaning/CleaningTaskBoard.tsx','src/features/cleaning/CleaningShell.tsx',
 'src/features/cleaning/CleaningStartTasks.tsx','src/features/cleaning/CleaningSchedule.tsx',
 'src/features/cleaning/cleaningTasks.ts','src/features/cleaning/useCleaningTaskUndo.ts',
 'src/features/cleaning/useCleaningTaskCompletion.ts']
for (const file of files) {
  const source = await read(file)
  const parsed = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(parsed.parseDiagnostics.length,0,`TS/TSX parse error: ${file}: ${parsed.parseDiagnostics.map(x=>x.messageText).join('; ')}`)
}
const board = await read(files[0]), shell = await read(files[1]), start = await read(files[2]), schedule = await read(files[3])
const api = await read(files[4]), undo = await read(files[5]), complete = await read(files[6])
for (const marker of ['page-heading-row cleaning-tasks-heading','primary-icon-button', 'cleaning-task-leading',
 'renderDeleteConfirm', 'Cofnij ostatnie wykonanie', 'onChange={() => { if (showChecked)',
 'loadError ?', 'cleaning-empty-compact', 'CompactQuantityStepper','cleaning-recurrence-summary']) {
  assert.ok(board.includes(marker),`H6.3 missing ${marker}`)
}
assert.doesNotMatch(board,/Archiwizuj zadanie|Jeszcze nie ma zadań|Co określoną liczbę/)
assert.match(shell,/cleaning-room-detail-heading/)
assert.doesNotMatch(shell,/className="cleaning-room-archive-link"|<p className="eyebrow">POMIESZCZENIE/)
assert.match(api,/rpc\('h63_delete_cleaning_task'/)
assert.match(api,/h63_undo_last_cleaning_completion/)
assert.match(undo,/pending\.current\.set\(task\.id, operation\)/)
assert.match(complete,/saved\.cycleGeneration !== operation\.generation \+ 1/)
assert.match(start,/undoRecent/)
assert.match(schedule,/undoRecent/)
assert.equal(recurrenceLabel('every_days',3),'Co 3 dni')
assert.equal(recurrenceLabel('every_weeks',2),'Co 2 tygodnie')
assert.equal(recurrenceLabel('every_months',1),'Co miesiąc')
assert.equal(recurrenceLabel('every_months',5),'Co 5 miesięcy')
assert.equal(recurrenceLabel('every_months',22),'Co 22 miesiące')
assert.equal(cleaningDueStatus('2026-10-31','2026-10-31').text,'Na dziś')
console.log('H6.3 source, shared lifecycle, TSX parse and recurrence presentation: PASS')
