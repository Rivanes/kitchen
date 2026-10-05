import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const semantics = await readFile('src/features/products/productResourceSemantics.ts', 'utf8')
const inventoryEditor = await readFile('src/features/inventory/InventoryEditor.tsx', 'utf8')
const recipeEditor = await readFile('src/features/recipes/RecipeEditor.tsx', 'utf8')
const homePage = await readFile('src/features/home/HomePage.tsx', 'utf8')
const expiryPage = await readFile('src/features/inventory/ExpiryPage.tsx', 'utf8')

assert.match(semantics, /'food' \| 'spice' \| 'household'/)
assert.match(semantics, /return \{ recipeEligible: true, inventoryTrackingMode: 'presence' \}/)
assert.match(semantics, /return \{ recipeEligible: false, inventoryTrackingMode: 'quantity' \}/)
assert.match(inventoryEditor, /isPresenceMode/)
assert.match(inventoryEditor, /!isPresenceMode &&/)
assert.match(inventoryEditor, /Przyprawy/)
assert.match(inventoryEditor, /Domowe/)
assert.match(recipeEditor, /products\.filter\(\(product\) => product\.recipeEligible\)/)
assert.match(homePage, /lot\.recipeEligible && lot\.inventoryTrackingMode === 'quantity'/)
assert.match(expiryPage, /lot\.recipeEligible && lot\.inventoryTrackingMode === 'quantity'/)

console.log('V3.8 resource semantics contract smoke: PASS')
