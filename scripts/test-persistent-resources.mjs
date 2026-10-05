import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const policy = await readFile('src/features/inventory/resourcePolicy.ts', 'utf8')
const readModel = await readFile('src/features/inventory/inventoryReadModel.ts', 'utf8')
const inventoryPage = await readFile('src/features/inventory/InventoryPage.tsx', 'utf8')
const mutations = await readFile('src/features/inventory/resourceMutations.ts', 'utf8')
const home = await readFile('src/features/home/HomePage.tsx', 'utf8')
const shoppingMutations = await readFile('src/features/shopping/shoppingMutations.ts', 'utf8')

assert.match(policy, /minimumStockQuantity !== null && quantity <= minimumStockQuantity/)
assert.match(readModel, /spiceResources/)
assert.match(readModel, /householdResources/)
assert.match(readModel, /productLots\.length > 0 \? 1 : 0/)
assert.match(readModel, /resourceProducts/)
assert.match(inventoryPage, /resource\.present \? 'Mam' : 'Brak'/)
assert.match(inventoryPage, /onAdjustHousehold\(resource, -1\)/)
assert.match(inventoryPage, /onAdjustHousehold\(resource, 1\)/)
assert.match(inventoryPage, /HouseholdMinimumSheet/)
assert.match(mutations, /rpc\('set_spice_presence'/)
assert.match(mutations, /rpc\('adjust_household_stock'/)
assert.match(shoppingMutations, /rpc\('ensure_active_shopping_product'/)
assert.match(home, /Do uzupełnienia/)
assert.match(home, /Na liście/)
assert.match(home, /isHouseholdLowStock/)

function isLow(quantity, minimum) {
  return minimum !== null && quantity <= minimum
}
assert.equal(isLow(2, null), false)
assert.equal(isLow(2, 1), false)
assert.equal(isLow(1, 1), true)
assert.equal(isLow(0, 1), true)

console.log('V3.8.4 persistent resource policy smoke: PASS')
