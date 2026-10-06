import assert from 'node:assert/strict'
import { buildRecipePurchasePlan } from '../src/features/recipes/recipePurchasePlanning.ts'

const units = [
  { code: 'pcs', labelPl: 'sztuka', symbol: 'szt.', family: 'count', sortOrder: 10, toBaseFactor: 1 },
  { code: 'g', labelPl: 'gram', symbol: 'g', family: 'mass', sortOrder: 20, toBaseFactor: 1 },
  { code: 'kg', labelPl: 'kilogram', symbol: 'kg', family: 'mass', sortOrder: 30, toBaseFactor: 1000 },
  { code: 'ml', labelPl: 'mililitr', symbol: 'ml', family: 'volume', sortOrder: 40, toBaseFactor: 1 },
  { code: 'l', labelPl: 'litr', symbol: 'l', family: 'volume', sortOrder: 50, toBaseFactor: 1000 },
  { code: 'package', labelPl: 'opakowanie', symbol: 'opak.', family: 'package', sortOrder: 60, toBaseFactor: 1 },
  { code: 'bottle', labelPl: 'butelka', symbol: 'but.', family: 'bottle', sortOrder: 70, toBaseFactor: 1 },
]

const product = (overrides = {}) => ({
  id: 'product',
  name: 'Produkt',
  defaultUnitCode: 'g',
  packageContentValue: null,
  packageContentUnitCode: null,
  recipeEligible: true,
  inventoryTrackingMode: 'quantity',
  minimumStockQuantity: null,
  ...overrides,
})

const group = (overrides = {}) => ({
  key: 'quantity:product:mass',
  productId: 'product',
  family: 'mass',
  ingredientIds: ['ingredient'],
  state: 'partial',
  requiredBaseQuantity: 500,
  availableBaseQuantity: 300,
  hasUnresolvedPhysicalStock: false,
  ...overrides,
})

const match = (groupOverrides = {}) => ({
  recipeId: 'recipe',
  state: 'partial',
  cookable: false,
  ingredientStates: { ingredient: groupOverrides.state ?? 'partial' },
  groups: [group(groupOverrides)],
})

function plan({ productOverrides = {}, groupOverrides = {} } = {}) {
  return buildRecipePurchasePlan({
    match: match(groupOverrides),
    products: [product(productOverrides)],
    units,
  })
}

let result = plan()
assert.deepEqual(result.entries.map(({ unitCode, quantity, purchaseMode }) => ({ unitCode, quantity, purchaseMode })), [
  { unitCode: 'g', quantity: 200, purchaseMode: 'direct' },
])

result = plan({ productOverrides: { defaultUnitCode: 'kg' } })
assert.equal(result.entries[0].quantity, 0.2)
assert.equal(result.entries[0].unitCode, 'kg')

result = plan({
  productOverrides: { defaultUnitCode: 'kg' },
  groupOverrides: { requiredBaseQuantity: 300.4, availableBaseQuantity: 300 },
})
assert.equal(result.entries[0].quantity, 0.001, 'Direct planning must round upward to Shopping 3-decimal precision')

for (const [shortage, expected] of [[200, 1], [400, 1], [401, 2], [800, 2]]) {
  result = plan({
    productOverrides: { defaultUnitCode: 'package', packageContentValue: 400, packageContentUnitCode: 'g' },
    groupOverrides: { requiredBaseQuantity: shortage, availableBaseQuantity: 0, state: 'missing' },
  })
  assert.equal(result.entries[0].quantity, expected)
  assert.equal(result.entries[0].purchaseMode, 'container')
  assert.equal(Number.isInteger(result.entries[0].quantity), true)
}

result = plan({
  productOverrides: { defaultUnitCode: 'bottle', packageContentValue: 1, packageContentUnitCode: 'l' },
  groupOverrides: { family: 'volume', requiredBaseQuantity: 500, availableBaseQuantity: 0, state: 'missing', key: 'quantity:product:volume' },
})
assert.equal(result.entries[0].quantity, 1)
assert.equal(result.entries[0].unitCode, 'bottle')

result = plan({
  productOverrides: { defaultUnitCode: 'package' },
  groupOverrides: { requiredBaseQuantity: 200, availableBaseQuantity: 0, state: 'missing' },
})
assert.equal(result.entries.length, 0)
assert.equal(result.groups[0].reason, 'missing-package-content')

result = plan({ productOverrides: { defaultUnitCode: 'l' } })
assert.equal(result.entries.length, 0)
assert.equal(result.groups[0].reason, 'purchase-family-mismatch')

result = plan({
  productOverrides: { defaultUnitCode: 'package', packageContentValue: 1, packageContentUnitCode: 'l' },
})
assert.equal(result.entries.length, 0)
assert.equal(result.groups[0].reason, 'purchase-family-mismatch')

result = plan({
  productOverrides: { defaultUnitCode: 'pcs', packageContentValue: 700, packageContentUnitCode: 'g' },
  groupOverrides: { requiredBaseQuantity: 200, availableBaseQuantity: 0, state: 'missing' },
})
assert.equal(result.entries[0].quantity, 1, 'Passata-like pcs + 700 g must plan one whole sellable unit')
assert.equal(result.entries[0].purchaseMode, 'count-pack')

result = plan({
  productOverrides: { defaultUnitCode: 'pcs', packageContentValue: 700, packageContentUnitCode: 'g' },
  groupOverrides: { requiredBaseQuantity: 701, availableBaseQuantity: 0, state: 'missing' },
})
assert.equal(result.entries[0].quantity, 2)


result = plan({
  productOverrides: { defaultUnitCode: 'pcs', packageContentValue: 10, packageContentUnitCode: 'pcs' },
  groupOverrides: { family: 'count', requiredBaseQuantity: 4, availableBaseQuantity: 0, state: 'missing', key: 'quantity:product:count' },
})
assert.equal(result.entries[0].quantity, 1, 'Explicit pcs + count content means one whole sellable count-pack')
assert.equal(result.entries[0].purchaseMode, 'count-pack')

result = plan({
  productOverrides: { defaultUnitCode: 'g', packageContentValue: 400, packageContentUnitCode: 'g' },
})
assert.equal(result.entries.length, 0)
assert.equal(result.groups[0].reason, 'ambiguous-direct-package-content')

result = plan({ groupOverrides: { state: 'sufficient', requiredBaseQuantity: 500, availableBaseQuantity: 500 } })
assert.equal(result.entries.length, 0)
assert.equal(result.groups[0].state, 'not-needed')

result = plan({ groupOverrides: { state: 'unresolved', requiredBaseQuantity: 500, availableBaseQuantity: 0, hasUnresolvedPhysicalStock: true } })
assert.equal(result.entries.length, 0)
assert.equal(result.groups[0].reason, 'matcher-unresolved')

result = buildRecipePurchasePlan({
  match: {
    recipeId: 'recipe',
    state: 'missing',
    cookable: false,
    ingredientStates: { spice: 'missing' },
    groups: [{
      key: 'spice:spice', productId: 'spice', family: null, ingredientIds: ['spice'], state: 'missing',
      requiredBaseQuantity: null, availableBaseQuantity: null, hasUnresolvedPhysicalStock: false,
    }],
  },
  products: [product({ id: 'spice', name: 'Sól', defaultUnitCode: 'pcs', inventoryTrackingMode: 'presence' })],
  units,
})
assert.equal(result.entries.length, 0)
assert.equal(result.groups[0].state, 'excluded')
assert.equal(result.groups[0].reason, 'presence-tracked-product')

result = plan({
  productOverrides: { defaultUnitCode: 'package', packageContentValue: 0.4, packageContentUnitCode: 'kg' },
  groupOverrides: { requiredBaseQuantity: 401, availableBaseQuantity: 0, state: 'missing' },
})
assert.equal(result.entries[0].quantity, 2, 'Planner uses current Product purchase default, independent of Recipe/Inventory snapshot history')

console.log('V5.1 Recipe purchase planning tests: PASS')
