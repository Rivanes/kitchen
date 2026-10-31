import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
// TypeScript 7.0.2 CLI remains the source of type-checking truth, but its
// `typescript` package does not expose the legacy ts.ScriptTarget/ts.ScriptKind
// compiler API. Use an explicit, pinned syntax parser for these TS/TSX contracts.
const { parse } = require('@babel/parser')
import { recurrenceLabel, cleaningDueStatus } from '../src/features/cleaning/cleaningRecurrence.ts'
const read = x => readFile(x,'utf8')
const files = ['src/features/cleaning/CleaningTaskBoard.tsx','src/features/cleaning/CleaningShell.tsx',
 'src/features/cleaning/CleaningStartTasks.tsx','src/features/cleaning/CleaningSchedule.tsx',
 'src/features/cleaning/cleaningTasks.ts','src/features/cleaning/useCleaningTaskUndo.ts',
 'src/features/cleaning/useCleaningTaskCompletion.ts']
const parseSource = (file, source) => {
  try {
    parse(source, {
      sourceType: 'module',
      sourceFilename: file,
      plugins: file.endsWith('.tsx') ? ['typescript', 'jsx'] : ['typescript'],
      errorRecovery: false,
    })
  } catch (error) {
    assert.fail(`TS/TSX syntax error: ${file}: ${error.message}`)
  }
}
// Prove that this syntax gate really rejects malformed TSX (no mock parser).
assert.throws(() => parse('<div>', { sourceType: 'module', plugins: ['typescript', 'jsx'] }))
for (const file of files) {
  parseSource(file, await read(file))
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
// Regression guard: the H6.3 syntax parser is a direct, pinned dev dependency.
// Both CI entrypoints must install dependencies before running the verifier.
const packageJson = JSON.parse(await read('package.json'))
assert.equal(packageJson.devDependencies?.['@babel/parser'], '7.29.11', 'H6.3 Babel parser must be pinned')
for (const workflow of ['qa.yml', 'deploy.yml']) {
  const yaml = await read(`.github/workflows/${workflow}`)
  const install = yaml.indexOf('run: npm ci --no-audit --no-fund')
  const lockCheck = yaml.indexOf('run: node scripts/n0-verify-lock.mjs')
  const verify = yaml.indexOf('run: node scripts/verify-project.mjs')
  const typecheck = yaml.indexOf('run: npm run typecheck')
  assert.ok(install >= 0 && install < lockCheck && lockCheck < verify && verify < typecheck,
    `H6.3 CI order invalid in ${workflow}: npm ci -> lock check -> verifier -> typecheck`)
}

console.log('H6.3 source, shared lifecycle, Babel TSX syntax and recurrence presentation: PASS')
