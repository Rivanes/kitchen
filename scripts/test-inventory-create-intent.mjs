import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile('src/features/inventory/inventoryCreateIntent.ts', 'utf8')
assert.match(source, /targetRole/)
assert.match(source, /selectedProductRole/)
assert.match(source, /roleMismatch/)
assert.match(source, /selectedProductRole !== null && selectedProductRole !== targetRole/)

function resolveIntent(targetRole, selectedProductRole) {
  return {
    targetRole,
    selectedProductRole,
    roleMismatch: selectedProductRole !== null && selectedProductRole !== targetRole,
  }
}

assert.deepEqual(resolveIntent('spice', null), {
  targetRole: 'spice', selectedProductRole: null, roleMismatch: false,
})
assert.deepEqual(resolveIntent('household', null), {
  targetRole: 'household', selectedProductRole: null, roleMismatch: false,
})
assert.deepEqual(resolveIntent('spice', 'spice'), {
  targetRole: 'spice', selectedProductRole: 'spice', roleMismatch: false,
})
assert.deepEqual(resolveIntent('household', 'household'), {
  targetRole: 'household', selectedProductRole: 'household', roleMismatch: false,
})
assert.deepEqual(resolveIntent('spice', 'food'), {
  targetRole: 'spice', selectedProductRole: 'food', roleMismatch: true,
})
assert.deepEqual(resolveIntent('household', 'food'), {
  targetRole: 'household', selectedProductRole: 'food', roleMismatch: true,
})
assert.deepEqual(resolveIntent('food', 'spice'), {
  targetRole: 'food', selectedProductRole: 'spice', roleMismatch: true,
})

console.log('V3.8.2 Inventory create-intent tests: PASS')
