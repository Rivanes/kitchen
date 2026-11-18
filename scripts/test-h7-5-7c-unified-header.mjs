import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')
const [header, food, cleaning, home, inventory, expiry, shopping, recipes, css, refresh, contract] = await Promise.all([
  read('src/components/ModulePageHeader.tsx'),
  read('src/components/AppShell.tsx'),
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/features/home/HomePage.tsx'),
  read('src/features/inventory/InventoryPage.tsx'),
  read('src/features/inventory/ExpiryPage.tsx'),
  read('src/features/shopping/ShoppingPage.tsx'),
  read('src/features/recipes/RecipesPage.tsx'),
  read('src/styles/global.css'),
  read('src/lib/useForegroundRefresh.ts'),
  read('tests/H7_5_7C_UNIFIED_HEADER_CONTRACT.md'),
])

// One rendered page title/navigation authority; both modules preserve their palette and page names.
assert.equal((header.match(/<h1\b/g) ?? []).length, 1)
assert.match(header, /className="module-page-title"/)
assert.match(header, /module === 'cleaning' \? <KitchenIcon name="cleaning"/)
assert.match(header, /module-home-button/)
assert.match(header, /onClick=\{onLogout\}/)
assert.match(food, /<ModulePageHeader title=\{pageTitle\[view\]\} module="food"/)
assert.match(cleaning, /<ModulePageHeader title=\{pageTitle\} module="cleaning"/)
for (const pageTitle of ['Twoja kuchnia', 'Zapasy', 'Zakupy', 'Przepisy', 'Terminy ważności']) {
  assert.ok(food.includes(`'${pageTitle}'`), `Missing Food shell title: ${pageTitle}`)
}
for (const pageTitle of ['Pomieszczenia', 'Harmonogram', 'Start']) {
  assert.ok(cleaning.includes(`'${pageTitle}'`), `Missing Cleaning shell title: ${pageTitle}`)
}
for (const page of [home, shopping]) assert.doesNotMatch(page, /<h1\b/)
assert.doesNotMatch(recipes, /<h1[^>]*>Przepisy<\/h1>/) // The separate Recipe detail may still name the selected dish.
assert.doesNotMatch(inventory, /<h1[^>]*>Zapasy<\/h1>/)
assert.doesNotMatch(expiry, /<h1[^>]*>Terminy ważności<\/h1>/)
assert.doesNotMatch(css, /\.home-overview h1|\.shopping-page-heading h1|\.recipes-page-heading h1|\.cleaning-shell-page-title/)
assert.match(css, /\.module-page-title\s*\{/)
assert.match(css, /\.module-page-brand\s*\{/)

// Page-specific actions are contextual; no duplicated Shopping entry point.
assert.match(inventory, /className="inventory-overview-toolbar"/)
assert.match(inventory, /shouldShowSearch \? 'primary-icon-button' : 'inventory-add-row'/)
assert.match(recipes, /className="recipe-filters-toolbar"/)
assert.match(shopping, /className="shopping-section-add"|shopping-section-add/)
assert.doesNotMatch(shopping, /shopping-add-footer|shopping-page-heading/)
assert.match(cleaning, /className="cleaning-add-room-row"/)
assert.doesNotMatch(cleaning, /cleaning-rooms-heading/)
for (const page of [inventory, expiry, shopping, recipes]) {
  assert.doesNotMatch(page, /aria-label="Odśwież/)
  assert.match(page, /Spróbuj ponownie/)
  assert.match(page, /useForegroundRefresh/)
}
assert.match(refresh, /visibilitychange/)
assert.match(refresh, /addEventListener\('focus'/)
assert.match(refresh, /now - lastRefreshAt < 1500/)
assert.match(contract, /H7\.5\.7C/)

console.log('H7.5.7C Unified Header / contextual actions / revalidation: PASS')
