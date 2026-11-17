import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { assertTsSyntax } from './assert-ts-syntax.mjs'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
const src = (name) => readFileSync(new URL(name, root), 'utf8')

const productSources = [
  'src/features/products/ProductAutocomplete.tsx',
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
for (const file of productSources) assertTsSyntax(file, src(file))
assert.ok(!existsSync(new URL('src/features/products/SharedCatalogVisibilityChoice.tsx', root)))

// Mock only the read/adopt RPC adapter; auto-publication now lives in a DB trigger.
const calls = []
let data = null
let error = null
const supabase = {
  async rpc(name, parameters) {
    calls.push({ name, parameters })
    return { data, error }
  },
}
const source = src('src/features/products/sharedProductCatalog.ts')
const js = stripTypeScriptTypes(source, { mode: 'transform' })
  .replace(/^import \{ supabase \} from .*?;\s*$/m, '')
  .replace(/\bexport (async function|function|class) /g, '$1 ')
  + '\nObject.assign(module.exports, {searchSharedProductCatalog, adoptSharedProduct});\n'
const module = { exports: {} }
vm.runInNewContext(js, { module, supabase })
const catalog = module.exports

assert.deepEqual(JSON.parse(JSON.stringify(await catalog.searchSharedProductCatalog('m'))), [])
assert.equal(calls.length, 0)
data = [
  { id:'catalog-milk', name:'Mleko', resource_role:'food', suggested_unit_code:'l', owner_id:'NEVER' },
  { id:'invalid', name:'Invalid', resource_role:'custom', suggested_unit_code:'pcs' },
]
assert.deepEqual(JSON.parse(JSON.stringify(await catalog.searchSharedProductCatalog('  Ml  '))), [
  { id:'catalog-milk', name:'Mleko', resourceRole:'food', suggestedUnitCode:'l' },
])
assert.equal(calls.at(-1).name,'h74_search_shared_products')
assert.equal(calls.at(-1).parameters.p_query,'Ml')
data = 'owner-local-product-id'
assert.equal(await catalog.adoptSharedProduct('catalog-milk'),'owner-local-product-id')
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).parameters)), {p_catalog_id:'catalog-milk'})

const auto = src('src/features/products/ProductAutocomplete.tsx')
assert.ok(auto.includes('combinedSuggestions') && auto.includes(".sort((a, b) => a.product.name.localeCompare(b.product.name, 'pl'))"))
assert.ok(!auto.includes('>Moje</p>') && !auto.includes('>Katalog Kitchen</p>'))
assert.ok(auto.includes('useSharedProductSuggestions'))
assert.ok(auto.includes('productResourceRoleFromSemantics'))
const core = src('src/features/products/productCatalogMutations.ts')
assert.ok(core.includes('const adoptedId = await adoptSharedProduct(input.sharedCatalogId)'))
assert.ok(core.includes('ownerProducts.find((product) => product.id === adoptedId)'))
for (const file of productSources) {
  const content = src(file)
  assert.ok(!content.includes('.from(\'shared_product_catalog\')'))
  assert.ok(!content.includes('publishToSharedCatalog'))
  assert.ok(!content.includes('SharedPublicationAfterSaveError'))
  assert.ok(!content.includes('SharedCatalogVisibilityChoice'))
}
for (const file of ['src/features/inventory/InventoryEditor.tsx','src/features/shopping/ShoppingEditor.tsx','src/features/recipes/RecipeIngredientEditorSheet.tsx']) {
  assert.ok(src(file).includes('onChooseShared=') && src(file).includes('useSharedProductSuggestions'))
}
for (const file of ['src/features/inventory/inventoryMutations.ts','src/features/shopping/shoppingMutations.ts','src/features/recipes/recipeMutations.ts']) {
  assert.ok(!src(file).includes('publishAfterSuccessfulSave'))
}
assert.ok(src('src/features/recipes/RecipeEditor.tsx').includes('sharedCatalogId: ingredient.sharedCatalogId'))
assert.ok(src('src/features/recipes/recipeMutations.ts').includes('sharedCatalogId: ingredient.sharedCatalogId'))
console.log('H7.4C.1 unified-autocomplete + mocked RPC + no opt-in frontend: PASS')
