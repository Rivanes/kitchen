import assert from 'node:assert/strict'
import {
  auditFrontendBoundaries, findObsoleteFrontendPaths,
  getRequiredComponentProps, findComponentJsxPropGaps,
} from './contracts/audit-frontend-boundaries.mjs'

// Release upload drift must be detected before the TypeScript gate.
assert.deepEqual(findObsoleteFrontendPaths(['src/components/OwnerGate.tsx']),
  ['src/components/OwnerGate.tsx'])
assert.deepEqual(findObsoleteFrontendPaths(['src/components/MembershipGate.tsx']), [])

const homeDefinition = `export function HomeHubShell({ user, install, needPwaRefresh, updatePwa }: {
  user: User
  install: PwaInstallState
  needPwaRefresh: boolean
  updatePwa: (reload?: boolean) => Promise<void>
  adminRoute?: boolean
}) { return null }`
const required = getRequiredComponentProps(homeDefinition, 'fixture.tsx', 'HomeHubShell')
assert.deepEqual(required, ['user', 'install', 'needPwaRefresh', 'updatePwa'])

const oldGate = `function OwnerGate({user}: {user: User}) {
  return <HomeHubShell user={user} />
}`
const missing = findComponentJsxPropGaps(oldGate, 'src/components/OwnerGate.tsx', { HomeHubShell: required })
assert.equal(missing.length, 1)
assert.deepEqual(missing[0].missing, ['install', 'needPwaRefresh', 'updatePwa'])

const currentGate = `const gate = <HomeHubShell user={user}
  install={install} needPwaRefresh={needRefresh} updatePwa={updateServiceWorker} />`
assert.deepEqual(findComponentJsxPropGaps(currentGate, 'fixture.tsx', { HomeHubShell: required }), [])

const actual = await auditFrontendBoundaries()
assert.ok(actual.filesChecked > 0)
assert.deepEqual(actual.components, ['MembershipGate', 'HomeHubShell'])
console.log(`H7.5.2 UI boundaries PASS (${actual.filesChecked} TSX files; stale gate & JSX regression checked).`)
