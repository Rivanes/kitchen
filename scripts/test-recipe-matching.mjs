import assert from 'node:assert/strict'
import { matchRecipe } from '../src/features/recipes/recipeMatching.ts'
import { filterRecipesByCategory, filterRecipesByCookability } from '../src/features/recipes/recipeDiscovery.ts'

const units = [
  { code: 'pcs', labelPl: 'sztuka', symbol: 'szt.', family: 'count', sortOrder: 10, toBaseFactor: 1 },
  { code: 'g', labelPl: 'gram', symbol: 'g', family: 'mass', sortOrder: 20, toBaseFactor: 1 },
  { code: 'kg', labelPl: 'kilogram', symbol: 'kg', family: 'mass', sortOrder: 30, toBaseFactor: 1000 },
  { code: 'ml', labelPl: 'mililitr', symbol: 'ml', family: 'volume', sortOrder: 40, toBaseFactor: 1 },
  { code: 'l', labelPl: 'litr', symbol: 'l', family: 'volume', sortOrder: 50, toBaseFactor: 1000 },
  { code: 'package', labelPl: 'opakowanie', symbol: 'opak.', family: 'package', sortOrder: 60, toBaseFactor: 1 },
]
const food = (id) => ({ id, name: id, defaultUnitCode: 'g', packageContentValue: null, packageContentUnitCode: null, recipeEligible: true, inventoryTrackingMode: 'quantity', minimumStockQuantity: null })
const spice = (id) => ({ id, name: id, defaultUnitCode: 'pcs', packageContentValue: null, packageContentUnitCode: null, recipeEligible: true, inventoryTrackingMode: 'presence', minimumStockQuantity: null })
const household = (id) => ({ id, name: id, defaultUnitCode: 'pcs', packageContentValue: null, packageContentUnitCode: null, recipeEligible: false, inventoryTrackingMode: 'quantity', minimumStockQuantity: null })
const ingredient = (id, productId, quantity, unitCode, packageContentValue = null, packageContentUnitCode = null) => ({ id, productId, quantity, unitCode, packageContentValue, packageContentUnitCode })
const lot = (productId, quantity, unitCode, packageContentValue = null, packageContentUnitCode = null) => ({ productId, quantity, unitCode, packageContentValue, packageContentUnitCode })
function run({ ingredients, lots = [], products, baseServings = 1, targetServings = baseServings }) {
  return matchRecipe({ recipe: { id: 'recipe', baseServings, targetServings, ingredients }, products, units, inventoryLots: lots })
}

let result = run({ ingredients: [ingredient('i', 'flour', 500, 'g')], lots: [lot('flour', 500, 'g')], products: [food('flour')] })
assert.equal(result.state, 'sufficient')
result = run({ ingredients: [ingredient('i', 'flour', 0.5, 'kg')], lots: [lot('flour', 500, 'g')], products: [food('flour')] })
assert.equal(result.state, 'sufficient')
result = run({ ingredients: [ingredient('i', 'flour', 500, 'g')], lots: [lot('flour', 300, 'g')], products: [food('flour')] })
assert.equal(result.state, 'partial')
result = run({ ingredients: [ingredient('i', 'flour', 500, 'g')], products: [food('flour')] })
assert.equal(result.state, 'missing')
assert.equal(result.cookable, false, 'Shopping is intentionally absent from matcher authority; no physical stock stays missing')
result = run({ ingredients: [ingredient('i', 'milk', 1, 'package', 1, 'l')], lots: [lot('milk', 1000, 'ml')], products: [food('milk')] })
assert.equal(result.state, 'sufficient')
result = run({ ingredients: [ingredient('i', 'milk', 1, 'l')], lots: [lot('milk', 2, 'package', 500, 'ml')], products: [food('milk')] })
assert.equal(result.state, 'sufficient')
result = run({ ingredients: [ingredient('i', 'milk', 1, 'l')], lots: [lot('milk', 0.25, 'l'), lot('milk', 1, 'package')], products: [food('milk')] })
assert.equal(result.state, 'unresolved')
result = run({ ingredients: [ingredient('i', 'milk', 1, 'l')], lots: [lot('milk', 1, 'l'), lot('milk', 1, 'package')], products: [food('milk')] })
assert.equal(result.state, 'sufficient')
result = run({ ingredients: [ingredient('i', 'passata', 1, 'pcs')], lots: [lot('passata', 700, 'g')], products: [food('passata')] })
assert.equal(result.state, 'unresolved')
result = run({ ingredients: [ingredient('a', 'flour', 300, 'g'), ingredient('b', 'flour', 300, 'g')], lots: [lot('flour', 500, 'g')], products: [food('flour')] })
assert.equal(result.state, 'partial')
assert.equal(result.ingredientStates.a, 'partial')
assert.equal(result.ingredientStates.b, 'partial')
result = run({ ingredients: [ingredient('i', 'salt', 999, 'g')], lots: [lot('salt', 1, 'pcs')], products: [spice('salt')] })
assert.equal(result.state, 'sufficient')
result = run({ ingredients: [ingredient('i', 'salt', 999, 'g')], products: [spice('salt')] })
assert.equal(result.state, 'missing')
result = run({ ingredients: [ingredient('i', 'paper', 1, 'pcs')], lots: [lot('paper', 1, 'pcs')], products: [household('paper')] })
assert.equal(result.state, 'unresolved')
result = run({ ingredients: [], products: [] })
assert.equal(result.state, 'unresolved')
result = run({ ingredients: [ingredient('i', 'flour', 500, 'g')], lots: [lot('flour', 750, 'g')], products: [food('flour')], baseServings: 2, targetServings: 2 })
assert.equal(result.state, 'sufficient')
result = run({ ingredients: [ingredient('i', 'flour', 500, 'g')], lots: [lot('flour', 750, 'g')], products: [food('flour')], baseServings: 2, targetServings: 4 })
assert.equal(result.state, 'partial')

const discoverable = [
  { id: 'a', categoryCode: 'lunch', cookable: true },
  { id: 'b', categoryCode: 'lunch', cookable: false },
  { id: 'c', categoryCode: 'breakfast', cookable: true },
]
const lunches = filterRecipesByCategory(discoverable, 'lunch')
assert.deepEqual(filterRecipesByCookability(lunches, 'cookable').map((x) => x.id), ['a'])

const sameInput = { ingredients: [ingredient('i', 'flour', 500, 'g')], lots: [lot('flour', 500, 'g')], products: [food('flour')] }
assert.equal(run(sameInput).state, run(sameInput).state, 'Home and RecipesPage must consume the same pure matcher result')

console.log('V4.3 Recipe matching tests: PASS')
