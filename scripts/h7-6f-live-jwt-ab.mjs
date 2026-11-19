// H7.6F — REAL PostgREST/RPC/Storage calls from two INDEPENDENT QA JWTs.
// Run manually via .github/workflows/h7-6f-live-jwt-qa.yml; never during push.
// Secrets must come from the workflow environment, never the source or logs.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const required = [
  'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY',
  'H76F_QA_A_EMAIL', 'H76F_QA_A_PASSWORD', 'H76F_QA_B_EMAIL', 'H76F_QA_B_PASSWORD',
]
for (const name of required) assert.ok(process.env[name]?.trim(), `Missing GitHub Actions QA configuration: ${name}`)

// Stop on a wrong project/account, before creating ANY fixture.
const approved = {
  a: '9f50579d-718e-4a06-a0b9-3e5b6288f82c',
  b: '218ced85-f8f2-476d-a721-e1536763cd93',
}
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const client = () => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const a = client()
const b = client()
const anonymous = client()
const fixtureId = randomUUID()
const prefix = `H76F-QA-${fixtureId.slice(0, 12)}`
const foreignName = `${prefix}-FOREIGN-BLOCKED`
const cleanups = []
const results = []
let aRoom = null
let bRoom = null
let objectPath = null
let intruderPath = null

function pass(label) { results.push(label); console.log(`PASS ${label}`) }
function noError(response, what) { assert.ifError(response.error, `${what}: ${response.error?.code ?? ''}`) }
function noData(response, what) {
  assert.equal(response.error, null, `${what}: API failure (code ${response.error?.code ?? 'unknown'})`)
  assert.deepEqual(response.data ?? [], [], `${what}: a foreign row was returned`)
}
function rejected(response, what) {
  assert.ok(response.error, `${what}: forbidden call was not rejected`)
  // A 404/unknown RPC isn't security proof: the endpoint must exist.
  assert.ok(!['PGRST202', '42883', '42P01'].includes(response.error.code), `${what}: RPC/table does not exist`)
}
async function roomIsIntact() {
  const response = await a.from('cleaning_rooms').select('id,name').eq('id', aRoom.id).single()
  noError(response, 'A private room verification')
  assert.equal(response.data?.name, aRoom.name, 'Foreign B changed or deleted room A')
}
async function authAndAssert(sdk, email, password, expected) {
  const result = await sdk.auth.signInWithPassword({ email, password })
  noError(result, 'QA login')
  assert.equal(result.data.user?.id, expected, 'Wrong QA login UUID — refused to write fixtures')
  assert.ok(result.data.session?.access_token, 'A real JWT is required')
  const access = await sdk.rpc('kitchen_my_access')
  noError(access, 'QA membership')
  assert.equal(access.data?.[0]?.kitchen_status, 'active', 'QA account must be active')
  return result.data.session.access_token
}
async function addRoom(sdk, uid, name) {
  const result = await sdk.from('cleaning_rooms')
    .insert({ owner_id: uid, name }).select('id,owner_id,name').single()
  noError(result, `QA fixture room ${uid}`)
  assert.equal(result.data?.owner_id, uid)
  cleanups.push(async () => {
    const removed = await sdk.rpc('h76_delete_cleaning_room', { p_room_id: result.data.id })
    assert.equal(removed.error, null, 'QA fixture deletion RPC failed')
    assert.equal(removed.data, true, 'QA room was not physically deleted')
  })
  return result.data
}

let failure = null
try {
  const jwtA = await authAndAssert(a, process.env.H76F_QA_A_EMAIL, process.env.H76F_QA_A_PASSWORD, approved.a)
  const jwtB = await authAndAssert(b, process.env.H76F_QA_B_EMAIL, process.env.H76F_QA_B_PASSWORD, approved.b)
  assert.notEqual(jwtA, jwtB, 'A/B MUST use different JWTs')
  pass('JWT-01 independent real A/B sessions, exact QA UUIDs, active membership')

  // No ordinary tester is touched: only QA A/B create these unique fixtures.
  aRoom = await addRoom(a, approved.a, `${prefix}-A`)
  bRoom = await addRoom(b, approved.b, `${prefix}-B`)
  pass('DATA-01 A/B positive owner room create')

  noData(await b.from('cleaning_rooms').select('id').eq('id', aRoom.id), 'B→A REST SELECT')
  noData(await a.from('cleaning_rooms').select('id').eq('id', bRoom.id), 'A→B REST SELECT')
  noData(await anonymous.from('cleaning_rooms').select('id').in('id', [aRoom.id, bRoom.id]), 'anon REST SELECT')
  pass('REST-01 bidirectional cross-owner and anon SELECT denied')

  const write = await b.from('cleaning_rooms').update({ name: foreignName }).eq('id', aRoom.id).select('id')
  noData(write, 'B→A REST UPDATE')
  await roomIsIntact()
  pass('REST-02 foreign UPDATE denied and original unchanged')

  const del = await b.from('cleaning_rooms').delete().eq('id', aRoom.id).select('id')
  noData(del, 'B→A REST DELETE')
  await roomIsIntact()
  pass('REST-03 foreign DELETE denied and original unchanged')

  const insert = await b.from('cleaning_rooms').insert({ owner_id: approved.a, name: foreignName }).select('id')
  rejected(insert, 'B→A REST INSERT')
  const leak = await a.from('cleaning_rooms').select('id').eq('owner_id', approved.a).eq('name', foreignName)
  noData(leak, 'B→A REST INSERT downstream check')
  pass('REST-04 foreign INSERT denied and no hidden inserted row')

  const foreignDelete = await b.rpc('h76_delete_cleaning_room', { p_room_id: aRoom.id })
  assert.ok(foreignDelete.error || foreignDelete.data === false, 'Foreign RPC removed or claimed room A')
  await roomIsIntact()
  pass('RPC-01 foreign owner-scoped hard-delete denied')

  const today = new Date(Date.now() + 86400_000).toISOString().slice(0, 10)
  const taskParams = { p_room_id: aRoom.id, p_title: `${prefix}-TASK`, p_notes: '',
    p_due_date: today, p_recurrence_kind: 'once', p_recurrence_interval: null }
  const ownTask = await a.rpc('h4_create_cleaning_task', taskParams)
  noError(ownTask, 'A positive task RPC fixture')
  assert.equal(ownTask.data?.owner_id, approved.a)
  pass('RPC-02 owner A may create task inside own room')
  rejected(await b.rpc('h4_create_cleaning_task', { ...taskParams, p_title: `${prefix}-FOREIGN-TASK` }),
    'B→A H4 create task')
  pass('RPC-03 foreign H4 task creation denied')

  // Storage has a private bucket with strict UUID/prefix policy. The object
  // actually EXISTS under A; 404 for a fabricated path would not prove RLS.
  const pixel = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64')
  objectPath = `${approved.a}/${randomUUID()}/cover-${randomUUID()}.webp`
  const ownedUpload = await a.storage.from('recipe-images').upload(objectPath, pixel,
    { contentType: 'image/webp', upsert: false })
  noError(ownedUpload, 'A positive Storage fixture')
  cleanups.push(async () => {
    const removed = await a.storage.from('recipe-images').remove([objectPath])
    assert.equal(removed.error, null, 'QA fixture Storage cleanup failed')
    const gone = await a.storage.from('recipe-images').download(objectPath)
    assert.ok(gone.error, 'QA Storage object still exists after cleanup')
  })
  noError(await a.storage.from('recipe-images').download(objectPath), 'A own Storage download')
  pass('STORE-01 real A private object exists and A may read it')

  const foreignList = await b.storage.from('recipe-images').list(approved.a)
  noData(foreignList, 'B→A Storage list')
  pass('STORE-02 foreign private Storage list invisible')
  rejected(await b.storage.from('recipe-images').download(objectPath), 'B→A Storage download')
  rejected(await anonymous.storage.from('recipe-images').download(objectPath), 'anon Storage download')
  pass('STORE-03 foreign and anon Storage download denied')
  rejected(await b.storage.from('recipe-images').createSignedUrl(objectPath, 60), 'B→A signed URL')
  pass('STORE-04 foreign signed URL denied')

  intruderPath = `${approved.a}/${randomUUID()}/cover-${randomUUID()}.webp`
  rejected(await b.storage.from('recipe-images').upload(intruderPath, pixel,
    { contentType: 'image/webp', upsert: false }), 'B→A Storage upload')
  pass('STORE-05 foreign Storage upload denied')

  const foreignRemove = await b.storage.from('recipe-images').remove([objectPath])
  // Storage API may silently report [] for rows hidden by RLS; the decisive
  // check is that A can still GET the exact EXISTING private object.
  if (foreignRemove.error) assert.notEqual(foreignRemove.error.statusCode, '404', 'Unexpected Storage endpoint')
  noError(await a.storage.from('recipe-images').download(objectPath), 'A object after foreign delete')
  pass('STORE-06 foreign Storage remove could not delete A object')

  noData(await anonymous.storage.from('recipe-images').list(approved.a), 'anon Storage list')
  pass('STORE-07 anon cannot list private Storage')
} catch (error) {
  failure = error
} finally {
  // Reverse order: Storage asset, then B room, then A room and its task.
  for (const cleanup of cleanups.reverse()) {
    try { await cleanup() } catch { failure ??= new Error('QA cleanup failed; inspect only H76F QA fixtures') }
  }
  // Even if a critical policy is broken, do not leave a rogue A-owned object
  // or row created by B. Cleanup itself is owner-A authenticated.
  if (intruderPath) {
    try { await a.storage.from('recipe-images').remove([intruderPath]) } catch { /* preserve original error */ }
  }
  if (aRoom) {
    try {
      const rogue = await a.from('cleaning_rooms').select('id').eq('owner_id', approved.a).eq('name', foreignName)
      if (!rogue.error) for (const row of rogue.data ?? []) {
        const removed = await a.rpc('h76_delete_cleaning_room', { p_room_id: row.id })
        if (removed.error || removed.data !== true) failure ??= new Error('Rogue QA row cleanup failed')
      }
    } catch { failure ??= new Error('QA foreign fixture cleanup failed') }
  }
  if (aRoom && bRoom) {
    try {
      const leftA = await a.from('cleaning_rooms').select('id').eq('id', aRoom.id)
      const leftB = await b.from('cleaning_rooms').select('id').eq('id', bRoom.id)
      noData(leftA, 'A cleanup postcheck')
      noData(leftB, 'B cleanup postcheck')
      pass('CLEANUP-01 QA rooms and task history physically removed')
    } catch { failure ??= new Error('QA cleanup verification failed') }
  }
  try { await a.auth.signOut({ scope: 'local' }); await b.auth.signOut({ scope: 'local' }) } catch { /* no persisted sessions */ }
}

if (failure) {
  // The runner intentionally never emits passwords, tokens or raw HTTP bodies.
  console.error(`H7.6F LIVE QA FAIL after ${results.length} completed checks: ${failure.message?.slice(0, 260) ?? 'Unknown QA error'}`)
  process.exitCode = 1
} else {
  console.log(`H7.6F LIVE JWT A/B REST + RPC + Storage: PASS (${results.length} checks, QA fixtures removed)`)
}
