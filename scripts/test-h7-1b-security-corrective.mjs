import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const api = await readFile('src/features/cleaning/cleaningTasks.ts', 'utf8')
const occurrences = await readFile('src/features/cleaning/cleaningOccurrences.ts', 'utf8')
const h3Regression = await readFile('scripts/test-cleaning-tasks-h3.mjs', 'utf8')
const contract = await readFile('tests/H7_1_MEMBERSHIP_CONTRACT.md', 'utf8')

// Neither retired RPC may be reachable directly from the current browser source.
assert.doesNotMatch(api, /h3_archive_cleaning_task|archiveCleaningTask|h4_complete_cleaning_task/)
assert.doesNotMatch(occurrences, /h4_complete_cleaning_task|h3_archive_cleaning_task/)
assert.match(occurrences, /\.rpc\('h64_complete_cleaning_occurrence'/)
assert.match(api, /h4_create_cleaning_task/)
assert.match(api, /h4_update_cleaning_task/)
assert.match(h3Regression, /doesNotMatch\(api, \/h3_archive_cleaning_task/)
assert.match(contract, /H7\.1B/)
console.log('H7.1B retired browser RPC + H6.4 current completion authority: PASS')
