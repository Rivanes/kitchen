import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workflow = await readFile('.github/workflows/h7-6f-live-jwt-qa.yml', 'utf8')
const runner = await readFile('scripts/h7-6f-live-jwt-ab.mjs', 'utf8')
const membership = await readFile('src/components/MembershipGate.tsx', 'utf8')

assert.match(workflow, /workflow_dispatch:/)
assert.doesNotMatch(workflow, /\bpush:|\bpull_request:|schedule:/)
assert.match(workflow, /H76F_QA_A_PASSWORD: \$\{\{ secrets\.H76F_QA_A_PASSWORD \}\}/)
assert.match(workflow, /H76F_QA_B_PASSWORD: \$\{\{ secrets\.H76F_QA_B_PASSWORD \}\}/)
assert.match(workflow, /node scripts\/h7-6f-live-jwt-ab\.mjs/)
assert.match(runner, /persistSession: false, autoRefreshToken: false/)
assert.match(runner, /assert\.notEqual\(jwtA, jwtB/)
assert.match(runner, /Wrong QA login UUID — refused to write fixtures/)
for (const token of ['cleaning_rooms', 'h76_delete_cleaning_room', 'h4_create_cleaning_task',
  'recipe-images', 'createSignedUrl', '.download(', '.upload(', '.remove(', 'finally {',
  "await a.auth.signOut", "await b.auth.signOut"]) assert.ok(runner.includes(token), token)
assert.doesNotMatch(runner, /service[_-]?role|admin[_-]?secret|setAuth\(/i)
assert.doesNotMatch(workflow, /service[_-]?role|admin[_-]?secret/i)
assert.match(membership, /FOREGROUND_RECHECK_MS = 30 \* 1000/)
console.log('H7.6F JWT workflow is manual and credential-isolated: PASS')
