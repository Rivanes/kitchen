import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const page = await readFile('src/features/inventory/InventoryPage.tsx', 'utf8')
const mutations = await readFile('src/features/inventory/inventoryMutations.ts', 'utf8')
const editor = await readFile('src/features/inventory/InventoryEditor.tsx', 'utf8')
const component = await readFile('src/features/quantity/CompactQuantityStepper.tsx', 'utf8')
const css = await readFile('src/styles/global.css', 'utf8')

assert.match(page, /<CompactQuantityStepper[\s\S]*?onAdjustHousehold\(resource, -1\)/)
assert.match(page, /<CompactQuantityStepper[\s\S]*?onAdjustInventoryLot\(lot, -1\)/)
assert.match(page, /incrementDisabled=\{!canQuickIncrementInventoryLot\(lot\)\}/)
assert.match(mutations, /rpc\('adjust_inventory_lot_quantity'/)
assert.match(editor, /Użyj także jako domyślnej zawartości produktu/)
assert.match(editor, /canSeedProductDefaultFromLot && seedProductDefaultFromLot/)
assert.match(component, /compact-quantity-stepper/)
assert.match(css, /\.compact-quantity-stepper/)
assert.doesNotMatch(css, /\.household-stock-stepper/)

const executable = String.raw`
import assert from 'node:assert/strict'
import {
  isQuickAdjustableUnitFamily,
  isQuickAdjustableInventoryLot,
  canQuickIncrementInventoryLot,
} from './src/features/inventory/quickQuantity.ts'

for (const family of ['count','package','jar','bottle','can','sachet']) {
  assert.equal(isQuickAdjustableUnitFamily(family), true)
}
for (const family of ['mass','volume','unknown']) {
  assert.equal(isQuickAdjustableUnitFamily(family), false)
}

const base = {
  id: 'lot', productId: 'product', productName: 'Test', storageLocationId: 'location',
  quantity: 2, unitCode: 'package', unitSymbol: 'opak.', unitFamily: 'package',
  packageContentValue: 400, packageContentUnitCode: 'g', packageContentUnitSymbol: 'g',
  recipeEligible: true, inventoryTrackingMode: 'quantity', expiryDate: null,
  afterOpenDays: null, openedAt: null, openedUseByDate: null,
}
assert.equal(isQuickAdjustableInventoryLot(base), true)
assert.equal(canQuickIncrementInventoryLot(base), true)
assert.equal(canQuickIncrementInventoryLot({ ...base, openedAt: '2026-10-06T10:00:00Z' }), false)
assert.equal(isQuickAdjustableInventoryLot({ ...base, unitFamily: 'mass' }), false)
assert.equal(isQuickAdjustableInventoryLot({ ...base, quantity: 1.5 }), false)
assert.equal(isQuickAdjustableInventoryLot({ ...base, recipeEligible: false }), false)
`

execFileSync(
  process.execPath,
  ['--no-warnings', '--experimental-strip-types', '--input-type=module', '--eval', executable],
  { cwd: process.cwd(), stdio: 'pipe' },
)

console.log('V5.3.1 Inventory quick quantity + shared compact stepper: PASS')
