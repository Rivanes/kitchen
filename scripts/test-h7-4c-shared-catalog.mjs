import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { assertTsSyntax } from './assert-ts-syntax.mjs'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
const src = (name) => readFileSync(new URL(name, root), 'utf8')

const productSources = [
  'src/features/products/ProductAutocomplete.tsx',
  'src/features/products/SharedCatalogVisibilityChoice.tsx',
  'src/features/products/sharedProductCatalog.ts',
  'src/features/products/productCatalogMutations.ts',
  'src/features/inventory/InventoryEditor.tsx',
  'src/features/inventory/inventoryMutations.ts',
  'src/features/shopping/ShoppingEditor.tsx',
  'src/features/shopping/shoppingMutations.ts',
  'src/features/recipes/RecipeEditor.tsx',
  'src/features/recipes/RecipeIngredientEditorSheet.tsx',
  'src/features/recipes/recipeMutations.ts',
]
for (const file of productSources) {
  assertTsSyntax(file, src(file))
}

let calls = []
let nextData = null
let nextError = null
const supabase = {
  async rpc(name, parameters) {
    calls.push({ name, parameters })
    return { data: nextData, error: nextError }
  },
}

// Isolate the real RPC adapter with a stubbed authenticated Supabase client.
const source = src('src/features/products/sharedProductCatalog.ts')
// Node 22.16's built-in transform-types keeps this test independent of the
// removed TypeScript 7 compiler JS API (see H7.3C compatibility corrective).
const js = stripTypeScriptTypes(source, { mode: 'transform' })
  .replace(/^import \{ supabase \} from .*?;\s*$/m, '')
  .replace(/\bexport (async function|function|class) /g, '$1 ')
  + '\nObject.assign(module.exports, {searchSharedProductCatalog, adoptSharedProduct, publishLocalProduct, publishAfterSuccessfulSave});\n'
const module = { exports: {} }
vm.runInNewContext(js, { module, supabase })
const catalog = module.exports

calls = []
assert.deepEqual(JSON.parse(JSON.stringify(await catalog.searchSharedProductCatalog('m'))), [])
assert.equal(calls.length, 0, 'No query should be sent for 1-letter strings.')
nextData = [
  { id: 'uuid-1', name: 'Mleko', resource_role: 'food', suggested_unit_code: 'l', owner_id: 'private-should-not-leak' },
  { id: 'uuid-2', name: 'Proszek', resource_role: 'invalid', suggested_unit_code: 'pcs' },
]
assert.deepEqual(JSON.parse(JSON.stringify(await catalog.searchSharedProductCatalog('  Ml  '))), [
  { id: 'uuid-1', name: 'Mleko', resourceRole: 'food', suggestedUnitCode: 'l' },
])
assert.equal(calls.at(-1).name, 'h74_search_shared_products')
assert.equal(calls.at(-1).parameters.p_query, 'Ml')
assert.equal(calls.at(-1).parameters.p_limit, 30)

nextData = 'my-private-product-id'
assert.equal(await catalog.adoptSharedProduct('shared-id'), 'my-private-product-id')
assert.equal(calls.at(-1).name, 'h74_adopt_shared_product')
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).parameters)), { p_catalog_id: 'shared-id' })

calls = []
await catalog.publishAfterSuccessfulSave('local-id', false, true)
await catalog.publishAfterSuccessfulSave('local-id', true, false)
assert.equal(calls.length, 0, 'Private choice and existing products must never publish.')
nextData = 'shared-id'
await catalog.publishAfterSuccessfulSave('local-id', true, true)
assert.equal(calls.length, 1)
assert.equal(calls[0].name, 'h74_publish_local_product')
assert.equal(calls[0].parameters.p_product_id, 'local-id')

nextError = { code: '42501', message: 'membership required' }
let afterSaveError
try { await catalog.publishAfterSuccessfulSave('local-id', true, true, 'saved-recipe-id') } catch (error) { afterSaveError = error }
assert.equal(afterSaveError?.name, 'SharedPublicationAfterSaveError')
assert.equal(afterSaveError?.savedRecipeId, 'saved-recipe-id')
nextError = null

// Structural regression gates complement, but do NOT replace, live A/B RLS and browser smoke.
const core = src('src/features/products/productCatalogMutations.ts')
const auto = src('src/features/products/ProductAutocomplete.tsx')
assert.ok(core.includes('h74_') === false || !core.includes(".from('shared_product_catalog')"))
assert.ok(core.includes('const adoptedId = await adoptSharedProduct(input.sharedCatalogId)'))
assert.ok(core.includes('ownerProducts.find((product) => product.id === adoptedId)'))
assert.ok(auto.includes('Moje') && auto.includes('Katalog Kitchen'))
for (const file of productSources) {
  assert.ok(!src(file).includes(".from('shared_product_catalog')"), `${file} must not bypass catalog RPCs.`)
}
for (const [file, businessMarker] of [
  ['src/features/inventory/inventoryMutations.ts', "rpc('add_inventory_lot'"],
  ['src/features/shopping/shoppingMutations.ts', ".from('shopping_items')"],
  ['src/features/recipes/recipeMutations.ts', "rpc('save_recipe_snapshot'"],
]) {
  const content = src(file)
  assert.ok(content.includes('publishAfterSuccessfulSave'))
  assert.ok(content.indexOf('await publishAfterSuccessfulSave') > content.indexOf(businessMarker), `Publication must follow saved business item: ${file}`)
}
for (const file of [
  'src/features/inventory/InventoryEditor.tsx',
  'src/features/shopping/ShoppingEditor.tsx',
  'src/features/recipes/RecipeIngredientEditorSheet.tsx',
]) {
  const content = src(file)
  assert.ok(content.includes('useSharedProductSuggestions') && content.includes('onChooseShared='), file)
  assert.ok(content.includes('SharedCatalogVisibilityChoice'), file)
}
for (const file of [
  'src/features/inventory/InventoryEditor.tsx',
  'src/features/shopping/ShoppingEditor.tsx',
  'src/features/recipes/RecipeEditor.tsx',
]) {
  const content = src(file)
  assert.ok(content.includes('SharedPublicationAfterSaveError') && content.includes('Zakończ'), `${file}: avoid duplicate save after partial publication failure`)
}
assert.ok(src('src/features/recipes/RecipeIngredientEditorSheet.tsx').includes('publishToSharedCatalog: false'))
assert.ok(src('src/features/recipes/RecipeEditor.tsx').includes('sharedCatalogId: ingredient.sharedCatalogId'))
assert.ok(src('src/features/recipes/recipeMutations.ts').includes('sharedCatalogId: ingredient.sharedCatalogId'))
assert.ok(src('src/features/recipes/recipeMutations.ts').includes('if (error instanceof SharedPublicationAfterSaveError) throw error'))
console.log('H7.4C source syntax + mocked RPC + privacy/save-order contracts: PASS')
