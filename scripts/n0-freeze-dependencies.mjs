/**
 * N0 one-time lock bootstrap: freeze the versions actually installed by npm.
 * Run only in the manual GitHub Actions bootstrap workflow, never in normal app runtime.
 * No external API access, no mutations outside package.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const packagePath = 'package.json'
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
const validExact = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const originalHf = pkg.dependencies?.['@huggingface/transformers']
if (originalHf !== '4.3.0') {
  throw new Error(`N0 requires frozen Transformers.js 4.3.0; found ${originalHf}`)
}
if (pkg.name !== 'kitchen' || pkg.private !== true) {
  throw new Error('N0 requires the exact Kitchen project baseline')
}
const originalGroups = [pkg.dependencies, pkg.devDependencies]
if (originalGroups.some(group => !group || typeof group !== 'object')) {
  throw new Error('dependencies and devDependencies are required')
}

for (const group of originalGroups) {
  for (const [name, requested] of Object.entries(group)) {
    const installed = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'))
    if (installed.name !== name || !validExact.test(installed.version)) {
      throw new Error(`Unable to establish exact installed version for ${name}`)
    }
    if (name === '@huggingface/transformers' && installed.version !== originalHf) {
      throw new Error('Pinned Transformers.js version changed unexpectedly')
    }
    group[name] = installed.version
    process.stdout.write(`${name}: ${requested} -> ${installed.version}\n`)
  }
}

const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
if (!validExact.test(npmVersion)) throw new Error(`Invalid npm version ${npmVersion}`)
pkg.packageManager = `npm@${npmVersion}`
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
process.stdout.write(`Package versions frozen; packageManager=${pkg.packageManager}\n`)
