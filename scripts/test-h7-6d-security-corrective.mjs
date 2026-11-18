import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const gate = await readFile('src/components/MembershipGate.tsx', 'utf8')
const app = await readFile('src/App.tsx', 'utf8')
const sql = await readFile('supabase/sql/h7_6d/H7_6D1_RLS_AUTO_ENABLE_EXECUTE_CORRECTIVE.sql', 'utf8')
const pre = await readFile('supabase/sql/h7_6d/H7_6D1_PREFLIGHT_READONLY.sql', 'utf8')
const post = await readFile('supabase/sql/h7_6d/H7_6D1_POSTCHECK_READONLY.sql', 'utf8')

function verifyGate(source) {
  assert.match(source, /\.rpc\('kitchen_my_access'\)/)
  assert.match(source, /document\.addEventListener\('visibilitychange', checkForeground\)/)
  assert.match(source, /window\.addEventListener\('focus', checkForeground\)/)
  assert.match(source, /window\.addEventListener\('pageshow', checkForeground\)/)
  assert.match(source, /window\.addEventListener\('online', checkForeground\)/)
  assert.match(source, /window\.setInterval\(checkForeground, 5 \* 60 \* 1000\)/)
  assert.match(source, /window\.clearInterval\(periodicCheck\)/)
  assert.match(source, /document\.removeEventListener\('visibilitychange', checkForeground\)/)
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
  gate.replace("document.addEventListener('visibilitychange', checkForeground)", ''),
  gate.replace('hidden={rechecking}', ''),
  gate.replace('foregroundQueued = true', 'foregroundQueued = false'),
  gate.replace("setStatus('suspended')", "setStatus('active')"),
]) assert.throws(() => verifyGate(broken))

assert.match(app, /key=\{session\.user\.id\}/)
assert.match(sql, /BEGIN;/)
assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.rls_auto_enable\(\) FROM PUBLIC, anon, authenticated, service_role;/)
assert.match(sql, /COMMIT;/)
assert.doesNotMatch(sql, /DROP (?:FUNCTION|EVENT TRIGGER)|CREATE OR REPLACE FUNCTION|DELETE FROM|UPDATE\s+private\./i)
for (const snippet of ['rls_auto_enable', 'event_trigger', 'anon_execute', 'authenticated_execute']) assert.ok(pre.includes(snippet))
for (const snippet of ['function_preserved', 'enabled_event_trigger_preserved', 'anon_denied', 'authenticated_denied', 'service_denied']) assert.ok(post.includes(snippet))
console.log('H7.6D membership revalidation + narrow SQL ACL source contract: PASS')
