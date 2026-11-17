import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

// TypeScript 7 no longer exposes the legacy JavaScript compiler API.
// @babel/parser is a pinned, direct devDependency already used by H6.3 tests.
// npm run typecheck remains the authoritative semantic TypeScript check.
const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')

export function assertTsSyntax(fileName, source) {
  try {
    parse(source, {
      sourceType: 'module',
      sourceFilename: fileName,
      plugins: fileName.endsWith('.tsx') ? ['typescript', 'jsx'] : ['typescript'],
      errorRecovery: false,
    })
  } catch (error) {
    assert.fail(`TS/TSX syntax error in ${fileName}: ${error.message}`)
  }
}
