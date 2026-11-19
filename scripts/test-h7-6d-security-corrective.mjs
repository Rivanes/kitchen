import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const gate = await readFile('src/components/MembershipGate.tsx', 'utf8')
const app = await readFile('src/App.tsx', 'utf8')

function verifyGate(source) {
  assert.match(source, /\.rpc\('kitchen_my_access'\)/)
  assert.match(source, /document\.addEventListener\('visibilitychange', checkVisibility\)/)
  assert.match(source, /window\.addEventListener\('focus', checkForeground\)/)
  assert.match(source, /window\.addEventListener\('pageshow', checkForeground\)/)
  assert.match(source, /window\.addEventListener\('online', checkForeground\)/)
  assert.match(source, /window\.setInterval\(checkForeground, FOREGROUND_RECHECK_MS\)/)
  assert.match(source, /window\.clearInterval\(periodicCheck\)/)
  assert.match(source, /document\.removeEventListener\('visibilitychange', checkVisibility\)/)
  assert.match(source, /let inFlight = false/)
  assert.match(source, /if \(inFlight\) \{[\s\S]*foregroundQueued = true/)
  assert.match(source, /foregroundQueued = false;?\s*void verifyMembership\(true\)/)
  assert.match(source, /if \(!current\) return/)
  assert.match(source, /setStatus\('suspended'\)/)
  assert.match(source, /setStatus\('error'\)/)
  assert.match(source, /hidden=\{rechecking\} aria-hidden=\{rechecking\}/)
  assert.match(source, /<HomeHubShell user=\{user\}/)
  assert.match(source, /rechecking \? <StartupPending/)
  assert.doesNotMatch(source, /localStorage|sessionStorage|service_role/)
}

verifyGate(gate)
for (const broken of [
  gate.replace("document.addEventListener('visibilitychange', checkVisibility)", ''),
  gate.replace('hidden={rechecking}', ''),
  gate.replace('foregroundQueued = true', 'foregroundQueued = false'),
  gate.replace("setStatus('suspended')", "setStatus('active')"),
]) assert.throws(() => verifyGate(broken))

assert.match(app, /key=\{session\.user\.id\}/)

// Permanent packaging invariant. GitHub checks out REPO alone. The executable
// SQL scripts belong ONLY to UPDATED_SQL and OUTSIDE_REPO, never to REPO.
async function sourcePaths(dir = '.') {
  const results = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
      results.push(...await sourcePaths(join(dir, entry.name)))
    } else if (entry.isFile()) {
      results.push(join(dir, entry.name))
    }
  }
  return results
}
function assertNoSqlInRepo(paths) {
  const unexpected = paths.filter(path => /\.sql$/i.test(path))
  assert.deepEqual(unexpected, [], 'SQL files must not be committed to GitHub/REPO')
}
assertNoSqlInRepo(await sourcePaths())
assert.throws(() => assertNoSqlInRepo(['src/example.sql']))
console.log('H7.6D membership revalidation + GitHub SQL isolation contract: PASS')
