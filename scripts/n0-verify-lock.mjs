/**
 * N0 lock verification: checks root versions, npm lock and actual node_modules.
 * Use after npm ci and in future project QA (post-lock integration).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const packageBytes = readFileSync('package.json')
const lockBytes = readFileSync('package-lock.json')
const pkg = JSON.parse(packageBytes)
const lock = JSON.parse(lockBytes)
const exact = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const root = lock.packages?.['']
if (lock.lockfileVersion !== 3 || !root || lock.name !== pkg.name || lock.version !== pkg.version) {
  throw new Error('N0 requires npm lockfileVersion 3 with matching root package')
}
if (pkg.dependencies?.['@huggingface/transformers'] !== '4.3.0') {
  throw new Error('Transformers.js 4.3.0 pin was modified')
}
const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
if (pkg.packageManager !== `npm@${npmVersion}`) {
  throw new Error(`npm mismatch: packageManager=${pkg.packageManager}, actual=${npmVersion}`)
}
for (const groupName of ['dependencies', 'devDependencies']) {
  const group = pkg[groupName]
  if (!group || !root[groupName]) throw new Error(`Missing ${groupName}`)
  for (const [name, version] of Object.entries(group)) {
    if (!exact.test(version)) throw new Error(`Unpinned dependency: ${name} = ${version}`)
    if (root[groupName][name] !== version) {
      throw new Error(`package.json / lockfile mismatch: ${name}`)
    }
    const locked = lock.packages?.[`node_modules/${name}`]
    if (locked?.version !== version || !locked.resolved || !locked.integrity) {
      throw new Error(`Missing or inconsistent resolved package in lockfile: ${name}`)
    }
    const installed = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'))
    if (installed.name !== name || installed.version !== version) {
      throw new Error(`npm ci installed wrong ${name}`)
    }
  }
}
const metadata = {
  sourceCommit: process.env.GITHUB_SHA || 'local-test',
  nodeVersion: process.version,
  npmVersion,
  packageManager: pkg.packageManager,
  packageSha256: createHash('sha256').update(packageBytes).digest('hex'),
  lockSha256: createHash('sha256').update(lockBytes).digest('hex'),
  directDependencies: { ...pkg.dependencies, ...pkg.devDependencies },
}
if (process.argv.includes('--write-metadata')) {
  writeFileSync('n0-snapshot-metadata.json', JSON.stringify(metadata, null, 2) + '\n')
}
console.log(`N0 lock verifier PASS (${Object.keys(metadata.directDependencies).length} exact root dependencies)`)
