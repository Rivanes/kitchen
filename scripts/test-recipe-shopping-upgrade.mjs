import assert from 'node:assert/strict'
import { buildRecipeShoppingPlan, getRecipeShoppingActionProductIds, getRecipeShoppingListedProductIds } from '../src/features/recipes/recipeShoppingPlan.ts'

function purchasePlan(entries = [], groups = []) {
  return {
    recipeId: 'recipe',
    groups,
    entries,
    hasUnresolved: groups.some((group) => group.state === 'unresolved'),
  }
}

function entry(overrides = {}) {
  return {
    groupKey: 'quantity:product:mass',
    productId: 'product',
    productName: 'Produkt',
    purchaseMode: 'container',
    unitCode: 'package',
    quantity: 2,
    shortageBaseQuantity: 500,
    ...overrides,
  }
}

function active(overrides = {}) {
  return {
    productId: 'product',
    quantity: 1,
    unitCode: 'package',
    ...overrides,
  }
}

let result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry()]),
  activeShoppingItems: [],
})
assert.equal(result.entries[0].state, 'needs-top-up')
assert.equal(result.entries[0].targetQuantity, 2)
assert.equal(result.entries[0].activeQuantity, 0)
assert.equal(result.entries[0].topUpQuantity, 2)
assert.deepEqual(getRecipeShoppingActionProductIds(result), ['product'])

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry()]),
  activeShoppingItems: [active()],
})
assert.equal(result.entries[0].state, 'needs-top-up')
assert.equal(result.entries[0].activeQuantity, 1)
assert.equal(result.entries[0].topUpQuantity, 1)
assert.deepEqual(getRecipeShoppingListedProductIds(result), ['product'])

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry()]),
  activeShoppingItems: [active({ quantity: 2 })],
})
assert.equal(result.entries[0].state, 'covered')
assert.equal(result.entries[0].topUpQuantity, 0)
assert.deepEqual(getRecipeShoppingActionProductIds(result), [])

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry()]),
  activeShoppingItems: [active({ quantity: 3 })],
})
assert.equal(result.entries[0].state, 'covered', 'Overplanned Shopping must not be topped up again')

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry()]),
  activeShoppingItems: [active({ unitCode: 'g', quantity: 500 })],
})
assert.equal(result.entries[0].activeQuantity, 0, 'Different Shopping unit must not be treated as coverage')
assert.equal(result.entries[0].topUpQuantity, 2)

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry()]),
  activeShoppingItems: [active({ quantity: 0.5 }), active({ quantity: 0.5 })],
})
assert.equal(result.entries[0].activeQuantity, 1, 'Equivalent active rows are summed once before top-up')
assert.equal(result.entries[0].topUpQuantity, 1)

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry()]),
  activeShoppingItems: [active({ quantity: 0.5 })],
})
assert.equal(result.entries[0].state, 'blocked', 'Fractional active whole-container quantity must fail closed')
assert.equal(result.entries[0].topUpQuantity, null)

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([entry({ purchaseMode: 'direct', unitCode: 'kg', quantity: 0.75 })]),
  activeShoppingItems: [active({ unitCode: 'kg', quantity: 0.25 })],
})
assert.equal(result.entries[0].state, 'needs-top-up')
assert.equal(result.entries[0].topUpQuantity, 0.5)

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([
    entry({ groupKey: 'a', quantity: 1 }),
    entry({ groupKey: 'b', quantity: 2 }),
  ]),
  activeShoppingItems: [active({ quantity: 1 })],
})
assert.equal(result.entries.length, 1, 'Same Product + purchase unit targets must be grouped')
assert.equal(result.entries[0].targetQuantity, 3)
assert.equal(result.entries[0].topUpQuantity, 2, 'Active Shopping is subtracted only once after target aggregation')

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan(
    [entry(), entry({ productId: 'other', productName: 'Inny', groupKey: 'other', quantity: 1 })],
    [{ productId: 'unresolved', state: 'unresolved' }],
  ),
  activeShoppingItems: [],
  productIds: ['product'],
})
assert.equal(result.entries.length, 1)
assert.equal(result.entries[0].productId, 'product')
assert.deepEqual(result.unresolvedProductIds, [])

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan([], [{ productId: 'milk', state: 'unresolved' }]),
  activeShoppingItems: [],
})
assert.deepEqual(result.unresolvedProductIds, ['milk'])
assert.equal(result.entries.length, 0)

result = buildRecipeShoppingPlan({
  purchasePlan: purchasePlan(
    [entry({ productId: 'mixed', productName: 'Mieszany' })],
    [{ productId: 'mixed', state: 'unresolved' }],
  ),
  activeShoppingItems: [],
})
assert.deepEqual(result.unresolvedProductIds, ['mixed'])
assert.equal(result.entries.length, 0, 'Any unresolved requirement for a Product blocks partial automatic procurement for that Product')

console.log('V5.2 Recipe -> Shopping upgrade tests: PASS')
