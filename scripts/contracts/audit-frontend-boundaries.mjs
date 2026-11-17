/**
 * H7.5.2 — early repository/JSX contract audit.
 *
 * GitHub web upload does not delete historical files. An unused OwnerGate.tsx
 * survived in main after H7.1 and failed TS2739 in H7.5 (#174).
 *
 * This scans the *actual* repository tree, not only release ZIP contents.
 * It uses @babel/parser, the project's existing pinned devDependency: TS 7
 * does NOT expose the old TypeScript JS compiler API.
 * The normal TypeScript + Vite gates remain mandatory.
 */
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')

export const OBSOLETE_FRONTEND_PATHS = Object.freeze([
  'src/components/OwnerGate.tsx',
  'src/features/products/SharedCatalogVisibilityChoice.tsx',
])

export function findObsoleteFrontendPaths(paths) {
  const current = new Set(paths.map((file) => file.replaceAll('\\', '/')))
  return OBSOLETE_FRONTEND_PATHS.filter((file) => current.has(file))
}

function parseTsx(source, filename) {
  return parse(source, {
    sourceType: 'module', sourceFilename: filename, plugins: ['typescript', 'jsx'],
    errorRecovery: false,
  })
}

function visitAst(root, callback) {
  function visit(node) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (typeof node.type !== 'string') return
    callback(node)
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'extra' || key === 'comments' || key === 'tokens') continue
      if (value && typeof value === 'object') visit(value)
    }
  }
  visit(root)
}

export function getRequiredComponentProps(source, filename, componentName) {
  const file = parseTsx(source, filename)
  let required = null
  visitAst(file, (node) => {
    if (node.type !== 'FunctionDeclaration' || node.id?.name !== componentName) return
    const annotation = node.params?.[0]?.typeAnnotation?.typeAnnotation
    if (annotation?.type === 'TSTypeLiteral') {
      required = annotation.members
        .filter((member) => member.type === 'TSPropertySignature' && !member.optional)
        .map((member) => member.key.name ?? member.key.value)
    }
  })
  if (!required?.length) {
    throw new Error(`Nie można odczytać wymaganych props ${componentName} z ${filename}. Sprawdź definicję komponentu.`)
  }
  return required
}

/** Finds all JSX usages, including dead/unimported TSX and multiline attributes. */
export function findComponentJsxPropGaps(source, filename, contracts) {
  const file = parseTsx(source, filename)
  const gaps = []
  visitAst(file, (node) => {
    if (node.type !== 'JSXOpeningElement' || node.name?.type !== 'JSXIdentifier') return
    const componentName = node.name.name
    const required = contracts[componentName]
    if (!required) return
    const provided = new Set(node.attributes
      .filter((attr) => attr.type === 'JSXAttribute' && attr.name?.type === 'JSXIdentifier')
      .map((attr) => attr.name.name))
    const hasSpread = node.attributes.some((attr) => attr.type === 'JSXSpreadAttribute')
    const missing = required.filter((prop) => !provided.has(prop))
    if (hasSpread || missing.length) {
      gaps.push({
        filename, line: node.loc?.start?.line ?? 0, component: componentName,
        missing, hasSpread,
      })
    }
  })
  return gaps
}

async function collectTsxFiles(directory, root, result) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) await collectTsxFiles(full, root, result)
    else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      result.push(path.relative(root, full).replaceAll('\\', '/'))
    }
  }
}

export async function auditFrontendBoundaries(root = process.cwd()) {
  const allTsx = []
  await collectTsxFiles(path.join(root, 'src'), root, allTsx)
  const obsolete = findObsoleteFrontendPaths(allTsx)
  if (obsolete.length) {
    throw new Error('H7.5.2: repozytorium zawiera nieaktualne komponenty: ' + obsolete.join(', ') +
      '. Usuń te pliki w GitHub. Samo wgranie UPDATED_FILES nie usuwa starych plików.')
  }

  const contracts = {}
  for (const component of ['MembershipGate', 'HomeHubShell']) {
    const filename = `src/components/${component}.tsx`
    contracts[component] = getRequiredComponentProps(
      await readFile(path.join(root, filename), 'utf8'), filename, component)
  }
  const gaps = []
  for (const filename of allTsx) {
    gaps.push(...findComponentJsxPropGaps(
      await readFile(path.join(root, filename), 'utf8'), filename, contracts))
  }
  if (gaps.length) {
    throw new Error('H7.5.2: niezgodność wywołań komponentów:\n' + gaps.map((entry) =>
      `${entry.filename}:${entry.line} <${entry.component}> ` +
      (entry.hasSpread ? 'JSX spread wymaga jawnej weryfikacji props; ' : '') +
      (entry.missing.length ? `brakuje: ${entry.missing.join(', ')}` : '')
    ).join('\n'))
  }
  return { filesChecked: allTsx.length, components: Object.keys(contracts) }
}
