import assert from 'node:assert/strict'
import { matchRecipe } from '../src/features/recipes/recipeMatching.ts'
import { buildRecipePurchasePlan } from '../src/features/recipes/recipePurchasePlanning.ts'
import {
  buildRecipeShoppingPlan,
  getRecipeShoppingActionProductIds,
} from '../src/features/recipes/recipeShoppingPlan.ts'

const units = [
  { code: 'pcs', labelPl: 'sztuka', symbol: 'szt.', family: 'count', sortOrder: 10, toBaseFactor: 1 },
  { code: 'g', labelPl: 'gram', symbol: 'g', family: 'mass', sortOrder: 20, toBaseFactor: 1 },
  { code: 'kg', labelPl: 'kilogram', symbol: 'kg', family: 'mass', sortOrder: 30, toBaseFactor: 1000 },
  { code: 'ml', labelPl: 'mililitr', symbol: 'ml', family: 'volume', sortOrder: 40, toBaseFactor: 1 },
  { code: 'l', labelPl: 'litr', symbol: 'l', family: 'volume', sortOrder: 50, toBaseFactor: 1000 },
  { code: 'package', labelPl: 'opakowanie', symbol: 'opak.', family: 'package', sortOrder: 60, toBaseFactor: 1 },
]

function product(overrides = {}) {
  return {
    id: 'product',
    name: 'Produkt',
    defaultUnitCode: 'g',
    packageContentValue: null,
    packageContentUnitCode: null,
    recipeEligible: true,
    inventoryTrackingMode: 'quantity',
    minimumStockQuantity: null,
    ...overrides,
  }
}

function recipe({ productId = 'product', quantity = 500, unitCode = 'g', targetServings = 1 } = {}) {
  return {
    id: 'recipe',
    baseServings: 1,
    targetServings,
    ingredients: [{
      id: 'ingredient',
      productId,
      quantity,
      unitCode,
      packageContentValue: null,
      packageContentUnitCode: null,
    }],
  }
}

function lot({ productId = 'product', quantity = 300, unitCode = 'g' } = {}) {
  return {
    productId,
    quantity,
    unitCode,
    packageContentValue: null,
    packageContentUnitCode: null,
  }
}

function fullPlan({ recipeInput, products, inventoryLots, activeShoppingItems = [] }) {
  const match = matchRecipe({ recipe: recipeInput, products, units, inventoryLots })
  const purchase = buildRecipePurchasePlan({ match, products, units })
  const shopping = buildRecipeShoppingPlan({ purchasePlan: purchase, activeShoppingItems })
  return { match, purchase, shopping }
}

// Direct purchase: physical partial -> exact direct shortage -> Shopping top-up.
let result = fullPlan({
  recipeInput: recipe(),
  products: [product()],
  inventoryLots: [lot()],
})
assert.equal(result.match.state, 'partial')
assert.equal(result.purchase.entries[0].unitCode, 'g')
assert.equal(result.purchase.entries[0].quantity, 200)
assert.equal(result.shopping.entries[0].topUpQuantity, 200)
assert.deepEqual(getRecipeShoppingActionProductIds(result.shopping), ['product'])

result = fullPlan({
  recipeInput: recipe(),
  products: [product()],
  inventoryLots: [lot()],
  activeShoppingItems: [{ productId: 'product', quantity: 200, unitCode: 'g' }],
})
assert.equal(result.match.state, 'partial', 'Shopping must never upgrade physical cookability')
assert.equal(result.shopping.entries[0].state, 'covered')
assert.deepEqual(getRecipeShoppingActionProductIds(result.shopping), [])

// Whole package: 200 g shortage with 400 g/package -> exactly one package.
result = fullPlan({
  recipeInput: recipe({ quantity: 600 }),
  products: [product({ defaultUnitCode: 'package', packageContentValue: 400, packageContentUnitCode: 'g' })],
  inventoryLots: [lot({ quantity: 400 })],
})
assert.equal(result.match.state, 'partial')
assert.equal(result.purchase.entries[0].purchaseMode, 'container')
assert.equal(result.purchase.entries[0].quantity, 1)
assert.equal(result.shopping.entries[0].topUpQuantity, 1)

// Count-pack: Passata-like 1 pcs = 700 g; 701 g shortage -> 2 pcs, existing 1 pcs -> top up 1.
result = fullPlan({
  recipeInput: recipe({ quantity: 701 }),
  products: [product({ defaultUnitCode: 'pcs', packageContentValue: 700, packageContentUnitCode: 'g' })],
  inventoryLots: [],
  activeShoppingItems: [{ productId: 'product', quantity: 1, unitCode: 'pcs' }],
})
assert.equal(result.match.state, 'missing')
assert.equal(result.purchase.entries[0].purchaseMode, 'count-pack')
assert.equal(result.purchase.entries[0].quantity, 2)
assert.equal(result.shopping.entries[0].topUpQuantity, 1)

// Active Shopping may fully cover procurement while physical state remains missing.
result = fullPlan({
  recipeInput: recipe(),
  products: [product()],
  inventoryLots: [],
  activeShoppingItems: [{ productId: 'product', quantity: 500, unitCode: 'g' }],
})
assert.equal(result.match.state, 'missing')
assert.equal(result.shopping.entries[0].state, 'covered')

// Incomplete Product purchase semantics fail closed through the whole chain.
const milk = product({
  id: 'milk',
  name: 'Mleko',
  defaultUnitCode: 'package',
  packageContentValue: null,
  packageContentUnitCode: null,
})
result = fullPlan({
  recipeInput: recipe({ productId: 'milk', quantity: 500, unitCode: 'ml' }),
  products: [milk],
  inventoryLots: [],
})
assert.equal(result.match.state, 'missing')
assert.equal(result.purchase.entries.length, 0)
assert.equal(result.purchase.groups[0].reason, 'missing-package-content')
assert.deepEqual(result.shopping.unresolvedProductIds, ['milk'])
assert.equal(result.shopping.entries.length, 0)

// Serving preview changes the purchase target without mutating the Recipe base quantity.
const packaged = product({ defaultUnitCode: 'package', packageContentValue: 400, packageContentUnitCode: 'g' })
const baseRecipe = recipe({ quantity: 400, targetServings: 2 })
result = fullPlan({
  recipeInput: baseRecipe,
  products: [packaged],
  inventoryLots: [lot({ quantity: 500 })],
})
assert.equal(result.match.groups[0].requiredBaseQuantity, 800)
assert.equal(result.purchase.entries[0].quantity, 1)
assert.equal(baseRecipe.ingredients[0].quantity, 400, 'Serving preview must not mutate base Recipe quantity')

result = fullPlan({
  recipeInput: recipe({ quantity: 400, targetServings: 3 }),
  products: [packaged],
  inventoryLots: [lot({ quantity: 500 })],
})
assert.equal(result.match.groups[0].requiredBaseQuantity, 1200)
assert.equal(result.purchase.entries[0].quantity, 2)

console.log('V5 final integrated closeout tests: PASS')
