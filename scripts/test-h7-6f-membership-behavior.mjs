import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const source = await readFile('src/components/MembershipGate.tsx', 'utf8')
const effectStart = '  useEffect(() => {'
const effectEnd = '  }, [user.id])'
const from = source.indexOf(effectStart)
const to = source.indexOf(effectEnd, from)
assert.ok(from >= 0 && to > from, 'Expected the single MembershipGate lifecycle effect')
// Execute the actual effect body, not a reimplementation of its logic.
const lifecycle = source.slice(from + effectStart.length, to).replace('data as MemberAccess[]', 'data')
assert.doesNotMatch(lifecycle, /\bas\s+[A-Z]/, 'Unsupported TS cast in the runtime fixture')
assert.match(source, /const FOREGROUND_RECHECK_MS = 30 \* 1000/)
assert.match(source, /window\.addEventListener\('blur', pausePrivateView\)/)
assert.match(source, /backgroundRevision \+= 1/)
assert.match(source, /verifiedRevision !== backgroundRevision/)
assert.match(source, /hidden=\{rechecking\}/)

const state = []
const handlers = new Map()
const pending = []
const timers = new Map()
let timerNext = 1
let cleanup = () => {}
const doc = { visibilityState: 'visible', addEventListener: on, removeEventListener: off }
const win = {
  addEventListener: on, removeEventListener: off,
  setInterval(fn, ms) { const id = timerNext++; timers.set(id, { fn, ms }); return id },
  clearInterval(id) { timers.delete(id) },
}

function on(event, fn) { handlers.set(`${this === doc ? 'doc' : 'win'}:${event}`, fn) }
function off(event, fn) { const key = `${this === doc ? 'doc' : 'win'}:${event}`; if (handlers.get(key) === fn) handlers.delete(key) }
function fire(name) { assert.ok(handlers.has(name), `Missing ${name} handler`); handlers.get(name)() }
function tick() { for (const { fn } of timers.values()) fn() }
const access = { kitchen_role: 'member', kitchen_status: 'active' }
const supabase = { rpc(name) {
  assert.equal(name, 'kitchen_my_access')
  return new Promise(resolve => pending.push(resolve))
} }
const sandbox = {
  document: doc, window: win, supabase, FOREGROUND_RECHECK_MS: 30000,
  setStatus(value) { state[0] = value },
  setRole(value) { state[1] = value },
  setRechecking(value) { state[2] = value },
}
const invokeLifecycle = runInNewContext(`(function runEffect() { ${lifecycle} })`, sandbox, { timeout: 3000 })
state.push('checking', null, false)
cleanup = invokeLifecycle()
assert.equal(pending.length, 1)

async function reply(data, error = null) {
  assert.ok(pending.length, 'A membership RPC must be pending')
  pending.shift()({ data, error })
  await new Promise(resolve => setImmediate(resolve))
}
function visible() { assert.equal(state[2], false, 'Private screen must be unlocked only after an active server reply') }
function locked() { assert.equal(state[2], true, 'Private screen must remain hidden pending server verification') }

await reply([access])
assert.equal(state[0], 'active')
visible()

// Background -> immediately hides cached data; foreground -> fresh RPC.
fire('win:blur')
locked()
fire('win:focus')
locked()
await reply([access])
visible()

// A stale in-flight ACTIVE reply cannot unlock data after a new background event.
fire('win:focus')
fire('win:blur')
doc.visibilityState = 'hidden'
await reply([access])
locked()
assert.equal(pending.length, 0)
doc.visibilityState = 'visible'
fire('doc:visibilitychange')
locked()
await reply([access])
visible()

// Simulate a browser that drops blur/focus/visibility events entirely.
assert.equal([...timers.values()][0].ms, 30000)
tick()
locked()
await reply([{ kitchen_role: 'member', kitchen_status: 'suspended' }])
assert.equal(state[0], 'suspended', 'Suspended QA member must be denied without a page reload')
assert.equal(state[1], null)

// Error is fail-closed, and returning to active requires another real RPC.
fire('win:focus')
await reply(null, { code: 'PGRST301' })
assert.equal(state[0], 'error')
tick()
await reply([access])
assert.equal(state[0], 'active')
visible()

cleanup()
assert.equal(handlers.size, 0, 'All browser listeners must be removed on sign-out/account switch')
assert.equal(timers.size, 0, 'The periodic timer must be removed on account switch')
console.log('H7.6F membership behavior (real async / background / missed event / suspension / fail-closed): PASS')
