import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const requiredFiles = [
  '.env.example',
  '.github/workflows/qa.yml',
  '.github/workflows/deploy.yml',
  'src/App.tsx',
  'src/components/AppShell.tsx',
  'src/components/LoginPage.tsx',
  'src/components/OwnerGate.tsx',
  'src/components/KitchenIcon.tsx',
  'src/features/home/HomePage.tsx',
  'src/features/inventory/InventoryPage.tsx',
  'src/features/inventory/InventoryShoppingBridge.tsx',
  'src/features/inventory/ExpiryPage.tsx',
  'src/features/inventory/InventoryEditor.tsx',
  'src/features/inventory/StorageLocationPicker.tsx',
  'src/features/inventory/InventoryConsumeSheet.tsx',
  'src/features/inventory/expiry.ts',
  'src/features/inventory/inventoryReadModel.ts',
  'src/features/inventory/inventoryMutations.ts',
  'src/features/inventory/inventoryCreateIntent.ts',
  'src/features/inventory/inventoryRpcResults.ts',
  'src/features/inventory/resourceMutations.ts',
  'src/features/inventory/resourcePolicy.ts',
  'src/features/inventory/HouseholdMinimumSheet.tsx',
  'src/features/inventory/types.ts',
  'src/styles/global.css',
  'src/lib/supabase/client.ts',
  'src/lib/userError.ts',
  'tests/SECURITY_CONTRACT.md',
  'tests/UI_CONTRACT.md',
  'tests/INVENTORY_READ_CONTRACT.md',
  'tests/INVENTORY_EDIT_CONTRACT.md',
  'tests/INVENTORY_BROWSE_CONTRACT.md',
  'tests/INVENTORY_CONSUME_CONTRACT.md',
  'tests/INVENTORY_LOCATION_CONTRACT.md',
  'tests/INVENTORY_EXPIRY_CONTRACT.md',
  'tests/INVENTORY_EDITOR_MOBILE_CONTRACT.md',
  'tests/INVENTORY_EXPIRY_CENTER_CONTRACT.md',
  'tests/INVENTORY_OPENED_PRODUCT_CONTRACT.md',
  'tests/INVENTORY_V1_CLOSEOUT_CONTRACT.md',
  'tests/PRODUCT_RENAME_CONTRACT.md',
  'src/features/shopping/ShoppingPage.tsx',
  'src/features/shopping/ShoppingPurchaseSheet.tsx',
  'src/features/shopping/ShoppingInventoryBridge.tsx',
  'src/features/shopping/ShoppingEditor.tsx',
  'src/features/shopping/shoppingReadModel.ts',
  'src/features/shopping/shoppingMutations.ts',
  'src/features/shopping/types.ts',
  'src/features/products/ProductAutocomplete.tsx',
  'src/features/products/ProductResourceRolePicker.tsx',
  'src/features/products/productResourceSemantics.ts',
  'src/features/products/productIdentity.ts',
  'src/features/products/productCatalogMutations.ts',
  'src/features/measurements/measurementUnits.ts',
  'src/features/measurements/measurementConversion.ts',
  'src/features/measurements/packageSemantics.ts',
  'src/features/quantity/quantity.ts',
  'src/features/quantity/QuantityStepperInput.tsx',
  'src/features/quantity/CompactQuantityStepper.tsx',
  'src/features/inventory/quickQuantity.ts',
  'tests/SHOPPING_LIST_CONTRACT.md',
  'tests/PRODUCT_AUTOCOMPLETE_CONTRACT.md',
  'tests/PRODUCT_IDENTITY_CONTRACT.md',
  'tests/SHARED_CORE_CONSISTENCY_CONTRACT.md',
  'tests/INVENTORY_TO_SHOPPING_CONTRACT.md',
  'tests/QUANTITY_STEPPER_CONTRACT.md',
  'tests/INVENTORY_QUICK_QUANTITY_CONTRACT.md',
  'tests/SHOPPING_PURCHASED_STATE_CONTRACT.md',
  'tests/MOBILE_DENSITY_CONTRACT.md',
  'tests/SHOPPING_OVERPURCHASE_CONTRACT.md',
  'tests/SHOPPING_PARTIAL_PURCHASE_CONTRACT.md',
  'tests/SHOPPING_TO_INVENTORY_CONTRACT.md',
  'tests/PACKAGE_SEMANTICS_CONTRACT.md',
  'tests/MEASUREMENT_CONVERSION_CONTRACT.md',
  'tests/RECIPE_PACKAGE_SNAPSHOT_CONTRACT.md',
  'tests/RESOURCE_SEMANTICS_CONTRACT.md',
  'tests/SPECIAL_RESOURCE_CREATE_CONTRACT.md',
  'tests/PERSISTENT_RESOURCES_CONTRACT.md',
  'tests/STORAGE_LOCATION_PICKER_CONTRACT.md',
  'tests/SHOPPING_QUICK_PURCHASE_CONTRACT.md',
  'tests/USER_ERROR_PRESENTATION_CONTRACT.md',
  'tests/V2_CLOSEOUT_CONTRACT.md',
  'src/features/recipes/RecipesPage.tsx',
  'src/features/recipes/RecipeEditor.tsx',
  'src/features/recipes/RecipeIngredientEditorSheet.tsx',
  'src/features/recipes/recipeIngredientDraft.ts',
  'scripts/test-recipe-ingredient-draft.mjs',
  'scripts/test-package-semantics.mjs',
  'scripts/test-measurement-conversion.mjs',
  'scripts/test-recipe-package-snapshot.mjs',
  'scripts/test-resource-semantics.mjs',
  'scripts/test-inventory-create-intent.mjs',
  'scripts/test-persistent-resources.mjs',
  'scripts/test-inventory-quick-quantity.mjs',
  'src/features/recipes/RecipeCoverFocusEditor.tsx',
  'src/features/recipes/RecipeCoverImage.tsx',
  'src/features/recipes/RecipeServingsControl.tsx',
  'src/features/recipes/recipeServings.ts',
  'src/features/recipes/recipeShoppingPlan.ts',
  'src/features/recipes/recipeDuration.ts',
  'src/features/recipes/recipeCoverCrop.ts',
  'src/features/recipes/recipeMutations.ts',
  'src/features/recipes/recipeCoverStorage.ts',
  'src/features/recipes/recipeImageProcessor.ts',
  'src/features/recipes/recipesReadModel.ts',
  'src/features/recipes/recipeCategories.ts',
  'src/features/recipes/recipeDiscovery.ts',
  'src/features/recipes/recipeDiscoveryReadModel.ts',
  'src/features/recipes/recipeMatching.ts',
  'src/features/recipes/recipePurchasePlanning.ts',
  'src/features/recipes/types.ts',
  'scripts/test-recipe-discovery.mjs',
  'scripts/test-recipe-matching.mjs',
  'scripts/test-recipe-purchase-planning.mjs',
  'scripts/test-recipe-shopping-upgrade.mjs',
  'scripts/test-v5-closeout.mjs',
  'tests/RECIPE_MATCHING_CONTRACT.md',
  'tests/RECIPE_PURCHASE_PLANNING_CONTRACT.md',
  'tests/RECIPE_CATEGORY_CONTRACT.md',
  'tests/RECIPE_DISCOVERY_CONTRACT.md',
  'tests/RECIPES_UI_CONTRACT.md',
  'tests/RECIPE_AUTHORING_CONTRACT.md',
  'tests/RECIPE_SHARED_CORE_CONTRACT.md',
  'tests/RECIPE_IMAGE_CONTRACT.md',
  'tests/RECIPE_TO_SHOPPING_CONTRACT.md',
  'tests/V5_CLOSEOUT_CONTRACT.md',
  'vite.config.ts',
]

for (const file of requiredFiles) {
  await access(file, constants.R_OK)
}

const envExample = await readFile('.env.example', 'utf8')
const expectedEnv = 'VITE_SUPABASE_URL=\nVITE_SUPABASE_PUBLISHABLE_KEY=\n'
if (envExample.replace(/\r\n/g, '\n') !== expectedEnv) {
  throw new Error('.env.example must contain only the two empty public Vite variables.')
}

const loginPage = await readFile('src/components/LoginPage.tsx', 'utf8')
if (/signUp\s*\(/.test(loginPage) || />\s*(Zarejestruj|Utwórz konto)\s*</i.test(loginPage)) {
  throw new Error('Public sign-up logic or UI was detected in LoginPage.tsx.')
}

const client = await readFile('src/lib/supabase/client.ts', 'utf8')
if (!client.includes('VITE_SUPABASE_URL') || !client.includes('VITE_SUPABASE_PUBLISHABLE_KEY')) {
  throw new Error('Supabase client is not using the approved public Vite variables.')
}
if (/service_role|SUPABASE_SECRET|DATABASE_PASSWORD/i.test(client)) {
  throw new Error('Forbidden server/admin credential reference detected in browser client.')
}

const app = await readFile('src/App.tsx', 'utf8')
if (!app.includes('<OwnerGate user={session.user} />')) {
  throw new Error('Authenticated sessions must pass through OwnerGate before AppShell.')
}

const ownerGate = await readFile('src/components/OwnerGate.tsx', 'utf8')
if (!/\.rpc\(\s*['"]is_kitchen_owner['"]\s*\)/.test(ownerGate)) {
  throw new Error('OwnerGate must verify access through the is_kitchen_owner RPC.')
}
if (!ownerGate.includes("data === true ? 'allowed' : 'denied'")) {
  throw new Error('OwnerGate must fail closed unless the owner RPC returns true.')
}

const viteConfig = await readFile('vite.config.ts', 'utf8')
if (!viteConfig.includes("base: '/kitchen/'")) {
  throw new Error("GitHub Pages base path must stay '/kitchen/'.")
}
if (!viteConfig.includes("theme_color: '#f7f7f2'")) {
  throw new Error('PWA theme color must use the accepted light mobile foundation.')
}

const globalCss = await readFile('src/styles/global.css', 'utf8')
for (const marker of ['--color-bg: #f7f7f2', '--touch-min: 48px', '.home-quick-action', '.home-coming-card', '.home-expiry-hub', '.expiry-page', '.expiry-filter', '.expiry-row', '.after-open-details', '.consume-open-rule', '.inventory-sheet', '.primary-icon-button', '.inventory-search', '.inventory-stock-actions', '.inventory-consume-sheet', '.danger-button', '.inventory-location-entry', '.inventory-location-page', '.inventory-back-button', '.expiry-status', '.date-input-row', 'max-height: calc(100dvh - 8px)', 'grid-template-columns: repeat(2, minmax(0, 1fr))', '.inventory-editor-title-row', '.product-rename-trigger', '.product-rename-form', '.home-shopping-hub', '.shopping-page', '.shopping-list-card', '.shopping-row', '.shopping-remove-zone', '.product-autocomplete-status', '.inventory-row-shell', '.inventory-row-shopping', '.inventory-shopping-notice']) {
  if (!globalCss.includes(marker)) {
    throw new Error(`V1.3 UI contract marker missing: ${marker}`)
  }
}

const shell = await readFile('src/components/AppShell.tsx', 'utf8')
if (!shell.includes('aria-label="Główna nawigacja Kitchen"')) {
  throw new Error('Mobile application navigation is missing.')
}
if (!shell.includes("onOpenExpiry={() => changeView('expiry')}") || !shell.includes("<ExpiryPage ownerId={user.id} onBack={() => changeView('home')} />")) {
  throw new Error('V1.6.2 Start must provide a dedicated Expiry Center view and return path.')
}
if (shell.includes('futureModules') || shell.includes('module-grid')) {
  throw new Error('Start must not duplicate bottom-navigation modules.')
}
if (!shell.includes('createRequestToken={inventoryCreateRequest}')) {
  throw new Error('Start quick-add must be able to open the Inventory create flow.')
}
if (!shell.includes('onCreateRequestHandled={handleInventoryCreateRequestHandled}') || !shell.includes('currentToken === requestToken ? 0 : currentToken')) {
  throw new Error('V1.5.1 must acknowledge and clear consumed Inventory create requests so bottom-nav entry cannot replay them.')
}
if (!shell.includes('overviewRequestToken={inventoryOverviewRequest}') || !shell.includes('setInventoryOverviewRequest')) {
  throw new Error('V1.5 bottom-nav Inventory action must be able to return a location detail page to the Zapasy overview.')
}

if (!shell.includes("type AppView = 'home' | 'inventory' | 'expiry' | 'shopping' | 'recipes'")) {
  throw new Error('V3.2 AppShell must expose Inventory, Shopping and Recipes as first-class views.')
}
if (!shell.includes("<ShoppingPage ownerId={user.id} />") || !shell.includes("changeView('shopping')")) {
  throw new Error('V2.3 bottom navigation must activate the Shopping List.')
}
if (shell.includes('Zakupy — moduł w przygotowaniu')) {
  throw new Error('V2.3 must remove the disabled Shopping placeholder from bottom navigation.')
}

const inventoryReadModel = await readFile('src/features/inventory/inventoryReadModel.ts', 'utf8')
for (const table of ['storage_locations', 'inventory_items']) {
  if (!inventoryReadModel.includes(`.from('${table}')`)) {
    throw new Error(`Inventory read model must read ${table}.`)
  }
}
for (const marker of ['loadOwnerProductCatalog(ownerId)', 'loadMeasurementUnits()', 'readStoredQuantity']) {
  if (!inventoryReadModel.includes(marker)) {
    throw new Error(`V2.3.3 Inventory read model must reuse shared core authority: ${marker}`)
  }
}
if (!inventoryReadModel.includes(".eq('owner_id', ownerId)")) {
  throw new Error('Owner-data reads must explicitly scope owner_id to the authenticated user.')
}
if (/\.(insert|update|upsert|delete)\s*\(/.test(inventoryReadModel)) {
  throw new Error('Inventory read model itself must remain read-only.')
}
if (!inventoryReadModel.includes('compareExpiryDates') || !inventoryReadModel.includes('getEffectiveExpiryDate')) {
  throw new Error('V1.6.2 Inventory read model must sort by the effective declared/opened expiry date.')
}
for (const marker of ['after_open_days', 'opened_at', 'opened_use_by_date']) {
  if (!inventoryReadModel.includes(marker)) {
    throw new Error(`V1.6.2 opened-product read marker missing: ${marker}`)
  }
}

const expiry = await readFile('src/features/inventory/expiry.ts', 'utf8')
for (const marker of ['Date.UTC', 'needsAttention', 'daysUntilDate', 'compareExpiryDates', 'daysUntil <= 3', 'daysUntil <= 10', 'getEffectiveExpiryDate', 'getInventoryExpiryMeta']) {
  if (!expiry.includes(marker)) {
    throw new Error(`V1.6.2 expiry contract marker missing: ${marker}`)
  }
}
if (/new Date\(value\)/.test(expiry)) {
  throw new Error('Date-only expiry values must not be parsed with ambiguous new Date(value) semantics.')
}

const mutations = await readFile('src/features/inventory/inventoryMutations.ts', 'utf8')
if (!mutations.includes('resolveOrCreateCanonicalProduct') || !mutations.includes(".rpc('add_inventory_lot'")) {
  throw new Error('V2.6 Inventory create must use shared Product identity plus the shared Inventory lot authority.')
}
if (!mutations.includes(".rpc('add_inventory_lot'") || !mutations.includes('.update({')) {
  throw new Error('V2.6 must support shared create/merge authority and direct edit mutation.')
}
if (!mutations.includes(".eq('owner_id', input.ownerId)")) {
  throw new Error('V1.3 mutations must explicitly scope owner_id.')
}
if (mutations.includes('findMergeableInventoryLot')) {
  throw new Error('V2.6 must not keep a second client-side Inventory merge authority.')
}
if (!mutations.includes("p_expiry_date: input.expiryDate") || !mutations.includes("p_after_open_days: afterOpenDays")) {
  throw new Error('V2.6 Inventory create must delegate expiry and after-open merge semantics to add_inventory_lot.')
}
if (!mutations.includes('expiryDate: string | null') || !mutations.includes('expiry_date: input.expiryDate')) {
  throw new Error('V1.6 create/edit mutations must persist optional expiry dates.')
}
if (!mutations.includes('afterOpenDays: number | null') || !mutations.includes('after_open_days: afterOpenDays') || !mutations.includes(".rpc('consume_inventory_item'")) {
  throw new Error('V1.6.2 must persist after-open rules and use the authoritative consume RPC.')
}
if (!mutations.includes('consumeInventoryLot') || !mutations.includes('consumeAllInventoryLot') || !mutations.includes('removeInventoryLot')) {
  throw new Error('V1.4 must provide explicit consume and remove mutations.')
}
if (!mutations.includes(".from('inventory_items')") || !mutations.includes('.delete()')) {
  throw new Error('V1.4 depletion/removal must delete depleted or explicitly removed Inventory lots.')
}
if (!mutations.includes(".rpc('consume_inventory_item'") || !mutations.includes('remaining_quantity')) {
  throw new Error('V1.6.2 partial consumption must be delegated to the owner-scoped database RPC.')
}
if (!mutations.includes('return consumeInventoryLot({') || !mutations.includes('const currentLot = await getCurrentInventoryLot')) {
  throw new Error('V2.3.3 full consumption must reuse the authoritative consume path.')
}
const consumeAllBlock = mutations.slice(
  mutations.indexOf('export async function consumeAllInventoryLot'),
  mutations.indexOf('export async function removeInventoryLot'),
)
if (consumeAllBlock.includes('removeInventoryLot(') || consumeAllBlock.includes('.delete()')) {
  throw new Error('V2.3.3 full consumption must not be implemented as explicit removal.')
}
for (const marker of ['assertValidQuantity', 'readStoredQuantity', 'cleanupCreatedCanonicalProduct']) {
  if (!mutations.includes(marker)) {
    throw new Error(`V2.3.3 Inventory mutation must reuse shared core: ${marker}`)
  }
}

if (mutations.includes('export async function renameProduct') || mutations.includes(".from('products')")) {
  throw new Error('V2.3.3 Inventory must not keep a module-specific Product rename/create authority.')
}

const editor = await readFile('src/features/inventory/InventoryEditor.tsx', 'utf8')
if (!editor.includes("mode.kind === 'create'") || !editor.includes("mode.kind === 'edit'")) {
  throw new Error('Inventory editor must support explicit create and edit modes.')
}
if (!editor.includes('<QuantityStepperInput') || !editor.includes('model.units.map') || !editor.includes('<StorageLocationPicker')) {
  throw new Error('V1.3/V2.6.2 editor must use the shared quantity input, controlled units and shared owner-location picker.')
}

if (!editor.includes('mode.initialLocationId ?? model.locations[0]?.id')) {
  throw new Error('V1.5 create editor must accept a location-page initial location without removing manual location choice.')
}

if (!/type=["']date["']/.test(editor) || !editor.includes('inventory-expiry') || !editor.includes('expiryDate: effectiveExpiryDate')) {
  throw new Error('Inventory editor must keep optional date-only expiry for standard food while V3.8 excludes special resource roles.')
}
if (!editor.includes('isValidDateOnly')) {
  throw new Error('V1.6 editor must validate the optional calendar date before mutation.')
}
if (!editor.includes("matchMedia('(hover: hover) and (pointer: fine)')")) {
  throw new Error('V1.6.1 mobile editor must not force autofocus on coarse-pointer phones.')
}
if (!editor.includes('aria-label="Wyczyść termin ważności"')) {
  throw new Error('V1.6.1 expiry clear action must remain compact and accessible.')
}
if (!editor.includes('inventory-after-open-days') || !editor.includes('afterOpenDays: parsedAfterOpenDays') || !editor.includes('Otwarty od')) {
  throw new Error('V1.6.2 editor must support compact after-open shelf-life configuration and opened state.')
}
if (!editor.includes('onConsumeRequested') || !editor.includes('Usuń z zapasów') || !editor.includes('removeInventoryLot')) {
  throw new Error('V1.4 edit flow must expose consume and explicit removal actions.')
}

for (const marker of ['updateCanonicalProductSettings', 'product-rename-trigger', 'Ustawienia produktu', 'Zapisz ustawienia', 'Zmiana obejmie wszystkie partie tego produktu.', 'parseQuantityInput', 'getDefaultUnitCode']) {
  if (!editor.includes(marker)) {
    throw new Error(`V2.1/V3.6B Product settings UI marker missing: ${marker}`)
  }
}
if (!editor.includes("mode.kind === 'edit' && !productSettingsOpen") || !editor.includes('handleProductSettingsSubmit')) {
  throw new Error('Product metadata editing must remain an explicit edit-only sub-flow, separate from Inventory-lot save.')
}

if (!editor.includes('ProductAutocompleteField') || !editor.includes('useProductAutocomplete')) {
  throw new Error('V2.3.1 Inventory create must use the shared Product autocomplete surface.')
}

for (const marker of ['seed?: InventoryCreateSeed', 'createHandler = createInventoryLot', 'createSeed?.productId ?? exactProduct?.id ?? null', 'inventory-create-seed-summary', 'Produkt i kupiona ilość pozostaną bez zmian.']) {
  if (!editor.includes(marker)) {
    throw new Error(`V2.6 reusable seeded Inventory create marker missing: ${marker}`)
  }
}

const productResourceSemantics = await readFile('src/features/products/productResourceSemantics.ts', 'utf8')
for (const marker of [
  "'food' | 'spice' | 'household'",
  "inventoryTrackingMode: 'presence'",
  "recipeEligible: false",
  "kind === 'spices'",
  "kind === 'household'",
]) {
  if (!productResourceSemantics.includes(marker)) throw new Error(`V3.8 Product resource semantics marker missing: ${marker}`)
}

const productRolePicker = await readFile('src/features/products/ProductResourceRolePicker.tsx', 'utf8')
for (const marker of ['ProductResourceRolePicker', 'role="radiogroup"', 'product-role-option']) {
  if (!productRolePicker.includes(marker)) throw new Error(`V3.8 mobile Product role picker marker missing: ${marker}`)
}

const sharedProductIdentity = await readFile('src/features/products/productIdentity.ts', 'utf8')
for (const marker of ['normalizeProductName', 'findExactProduct', 'findProductSuggestions', '.slice(0, limit)']) {
  if (!sharedProductIdentity.includes(marker)) {
    throw new Error(`V2.3.1 shared Product identity marker missing: ${marker}`)
  }
}

const sharedProductAutocomplete = await readFile('src/features/products/ProductAutocomplete.tsx', 'utf8')
for (const marker of ['useProductAutocomplete', 'ProductAutocompleteField', 'product-suggestions', 'Pasujące produkty']) {
  if (!sharedProductAutocomplete.includes(marker)) {
    throw new Error(`V2.3.1 shared Product autocomplete marker missing: ${marker}`)
  }
}

const sharedProductCatalog = await readFile('src/features/products/productCatalogMutations.ts', 'utf8')
for (const marker of ['resolveOrCreateCanonicalProduct', 'resolveCanonicalProductForEdit', 'renameCanonicalProduct', 'cleanupCreatedCanonicalProduct', 'loadOwnerProductCatalog', ".from('products')", ".eq('owner_id', ownerId)", "insertResult.error.code === '23505'"]) {
  if (!sharedProductCatalog.includes(marker)) {
    throw new Error(`V2.3.3 shared Product authority marker missing: ${marker}`)
  }
}
if (!sharedProductCatalog.includes('.update({') || !sharedProductCatalog.includes('name: cleanName') || !sharedProductCatalog.includes("result.error.code === '23505'")) {
  throw new Error('Shared Product settings must update the existing UUID in place and guard uniqueness races.')
}

const sharedQuantity = await readFile('src/features/quantity/quantity.ts', 'utf8')
for (const marker of ['parseQuantityInput', 'assertValidQuantity', 'readStoredQuantity', 'addQuantities', 'sumQuantities', 'formatQuantity', 'MAX_QUANTITY', 'QUANTITY_DECIMAL_PLACES', 'DEFAULT_QUANTITY_STEP', 'stepQuantityInput', 'canStepQuantityInput', 'formatQuantityInput']) {
  if (!sharedQuantity.includes(marker)) {
    throw new Error(`V2.3.3 shared quantity authority marker missing: ${marker}`)
  }
}

const sharedUnits = await readFile('src/features/measurements/measurementUnits.ts', 'utf8')
for (const marker of ['DEFAULT_UNIT_CODE', "'pcs'", 'loadMeasurementUnits', 'getDefaultUnitCode', ".from('measurement_units')"]) {
  if (!sharedUnits.includes(marker)) {
    throw new Error(`V2.3.3 shared Measurement Unit authority marker missing: ${marker}`)
  }
}

const inventoryPage = await readFile('src/features/inventory/InventoryPage.tsx', 'utf8')
if (!inventoryPage.includes("status: 'loading'") || !inventoryPage.includes("status: 'error'") || !inventoryPage.includes("status: 'ready'")) {
  throw new Error('Inventory page must retain loading, error and ready states.')
}
if (!inventoryPage.includes('InventoryOverview') || !inventoryPage.includes('InventoryLocationView') || !inventoryPage.includes('selectedLocationId')) {
  throw new Error('V1.5 Inventory must use separate overview and location-detail page states.')
}
if (inventoryPage.includes('expandedLocations') || inventoryPage.includes('toggleLocation')) {
  throw new Error('V1.5 must remove the interim accordion-only storage browsing model.')
}
if (!inventoryPage.includes('itemCount >= 8')) {
  throw new Error('Inventory location pages must keep contextual search for larger physical or persistent resource collections.')
}
if (!inventoryPage.includes('model.totalDisplayItems >= 8') || !inventoryPage.includes('Szukaj produktu lub miejsca w zapasach')) {
  throw new Error('Zapasy overview must search both physical stock and persistent resource Products.')
}
if (!inventoryPage.includes("initialLocationId: selectedGroup.location.id")) {
  throw new Error('V1.5 add-from-location flow must preselect the current storage location.')
}
if (inventoryPage.includes('inventory-summary')) {
  throw new Error('V1.5 must not restore the old three-counter Inventory summary.')
}
if (!inventoryPage.includes('onCreateRequestHandled?.(createRequestToken)')) {
  throw new Error('V1.5.1 Inventory must acknowledge the create request immediately after opening the editor.')
}
if (!inventoryPage.includes('<InventoryConsumeSheet') || !inventoryPage.includes('consumeLot')) {
  throw new Error('V1.4 Inventory page must wire the consume flow into the current stock lot.')
}
if (!inventoryPage.includes('getInventoryExpiryMeta') || !inventoryPage.includes('openedUseByDate') || !inventoryPage.includes('expiry-status')) {
  throw new Error('V1.6.2 location pages must render the effective declared/opened expiry status.')
}
if (inventoryPage.includes('inventory-overview-summary') || /pozycj/i.test(inventoryPage)) {
  throw new Error('V1.6 SMART cleanup must remove technical overview counters and the term pozycja from everyday Inventory UI.')
}
if (!inventoryPage.includes('partia')) {
  throw new Error('V1.6 may expose the natural term partia only when multiple lots need distinction.')
}

for (const marker of ['inventory-row-shopping', 'shoppingAdd', 'onAddToShopping={inventoryShopping.openForLot}', 'useInventoryShoppingBridge', 'inventoryShopping.handleConsumed', 'inventoryShopping.bridgeUi']) {
  if (!inventoryPage.includes(marker)) {
    throw new Error(`V2.4 Inventory -> Shopping page integration marker missing: ${marker}`)
  }
}
if (inventoryPage.includes("from '../shopping/shoppingMutations'")) {
  throw new Error('V2.4 Inventory must not implement a second Shopping mutation path.')
}

const inventoryShoppingBridge = await readFile('src/features/inventory/InventoryShoppingBridge.tsx', 'utf8')
for (const marker of ['ShoppingEditor', 'ShoppingCreateSeed', 'ShoppingCatalogModel', 'buildLaunch', 'openForLot', 'handleConsumed', "kind: 'offer'", 'Dodać „', 'Dodaj do listy', "mode={{ kind: 'create', seed: shoppingLaunch.seed }}"]) {
  if (!inventoryShoppingBridge.includes(marker)) {
    throw new Error(`V2.4 shared Inventory -> Shopping bridge marker missing: ${marker}`)
  }
}
if (inventoryShoppingBridge.includes("from '../shopping/shoppingMutations'") || inventoryShoppingBridge.includes('createShoppingItem(')) {
  throw new Error('V2.4 shared bridge must reuse ShoppingEditor rather than owning Shopping persistence.')
}
if (!inventoryShoppingBridge.includes('quantity: 1') || !inventoryShoppingBridge.includes('productId: lot.productId')) {
  throw new Error('V2.4 bridge must seed the existing canonical Product and an editable replenishment quantity.')
}

const consumeSheet = await readFile('src/features/inventory/InventoryConsumeSheet.tsx', 'utf8')
if (!consumeSheet.includes('Ile zużyto?') || !consumeSheet.includes('Zużyj wszystko') || !consumeSheet.includes('consumeInventoryLot') || !consumeSheet.includes('consumeAllInventoryLot')) {
  throw new Error('V1.4 consume sheet contract is incomplete.')
}
if (!consumeSheet.includes('quantityToUse > lot.quantity')) {
  throw new Error('V1.4 UI must reject consuming more than the visible lot quantity before mutation.')
}
if (!consumeSheet.includes('lot.afterOpenDays') || !consumeSheet.includes('Po częściowym zużyciu')) {
  throw new Error('V1.6.2 consume UI must explain automatic opening when an after-open rule exists.')
}

if (!consumeSheet.includes('onConsumed: (result: ConsumeInventoryResult) => void') || !consumeSheet.includes('onConsumed(result)')) {
  throw new Error('V2.4 consume UI must return the successful consume event so Inventory can offer replenishment without conflating explicit removal.')
}
if (consumeSheet.includes('onSaved')) {
  throw new Error('V2.4 consume sheet must not collapse consume success back into a generic save event.')
}

const homePage = await readFile('src/features/home/HomePage.tsx', 'utf8')
if (!homePage.includes('Terminy ważności') || !homePage.includes('Inspiracje i planowanie') || !homePage.includes('Mogę ugotować')) {
  throw new Error('V4.3 Start must keep expiry access plus active Recipe discovery/cookability surfaces.')
}
if (!homePage.includes('getInventoryExpiryMeta') || !homePage.includes('bez terminu') || !homePage.includes('onOpenExpiry')) {
  throw new Error('V1.6.2 Start must summarize urgent/missing expiry data and open the Expiry Center.')
}
if (/pozycj|occupiedLocations/.test(homePage)) {
  throw new Error('V1.6 Home must not expose technical Inventory counters such as positions or occupied locations.')
}
if (!homePage.includes('resourceProducts')) {
  throw new Error('Home product count must include persistent Przyprawy/Domowe resources without exposing technical lot counts.')
}

const expiryPage = await readFile('src/features/inventory/ExpiryPage.tsx', 'utf8')
for (const marker of ['Wszystkie', 'Z terminem', 'Bez terminu', 'Termin: nie podano', 'getInventoryExpiryMeta', 'InventoryEditor']) {
  if (!expiryPage.includes(marker)) {
    throw new Error(`V1.6.2 Expiry Center contract marker missing: ${marker}`)
  }
}
if (!expiryPage.includes('Terminy ważności') || !expiryPage.includes('allLots.length >= 10') || !expiryPage.includes('Szukaj produktu lub miejsca')) {
  throw new Error('V1.7 Expiry Center must keep unified wording and contextual search for larger collections.')
}
if (!expiryPage.includes('counts.critical > 0') || !expiryPage.includes('Wszystko w porządku')) {
  throw new Error('V1.7 Expiry Center must suppress zero-value summary noise and expose one calm good state.')
}


if (!expiryPage.includes('useInventoryShoppingBridge') || !expiryPage.includes('inventoryShopping.handleConsumed') || !expiryPage.includes('inventoryShopping.bridgeUi')) {
  throw new Error('V2.4 consumption from Expiry Center must reuse the same Inventory -> Shopping bridge.')
}

const shoppingReadModel = await readFile('src/features/shopping/shoppingReadModel.ts', 'utf8')
if (!shoppingReadModel.includes(".from('shopping_items')")) {
  throw new Error('V2.3 Shopping read model must read shopping_items.')
}
for (const marker of ['loadOwnerProductCatalog(ownerId)', 'loadMeasurementUnits()', 'readStoredQuantity']) {
  if (!shoppingReadModel.includes(marker)) {
    throw new Error(`V2.3.3 Shopping read model must reuse shared core authority: ${marker}`)
  }
}
if (!shoppingReadModel.includes(".eq('owner_id', ownerId)")) {
  throw new Error('Shopping reads must remain owner-scoped.')
}
if (/\.(insert|update|upsert|delete)\s*\(/.test(shoppingReadModel)) {
  throw new Error('Shopping read model itself must remain read-only.')
}
if (!shoppingReadModel.includes('loadActiveShoppingCount') || !shoppingReadModel.includes(".eq('is_purchased', false)")) {
  throw new Error('Start/Home Shopping count must remain owner-scoped and active-only.')
}
for (const marker of ['is_purchased, purchased_at', 'activeItems', 'purchasedItems', 'comparePurchasedNewestFirst', 'incoherent purchased state']) {
  if (!shoppingReadModel.includes(marker)) {
    throw new Error(`V2.5 Shopping read model purchased-state marker missing: ${marker}`)
  }
}

const shoppingMutations = await readFile('src/features/shopping/shoppingMutations.ts', 'utf8')
for (const marker of ['createShoppingItem', 'updateShoppingItem', 'removeShoppingItem', 'normalizeProductName', 'resolveOrCreateCanonicalProduct', 'resolveCanonicalProductForEdit', 'currentProductId', 'cleanupCreatedCanonicalProduct', 'assertValidQuantity', 'readStoredQuantity', 'addQuantities', 'product_id: product.id', 'custom_name: null', ".eq('owner_id', input.ownerId)", ".eq('is_purchased', false)"]) {
  if (!shoppingMutations.includes(marker)) {
    throw new Error(`V2.3.2 Shopping mutation marker missing: ${marker}`)
  }
}
for (const marker of ['purchaseShoppingQuantity', 'restoreShoppingPurchase', 'adjustPurchasedShoppingQuantity', "rpc('purchase_shopping_item'", "rpc('restore_shopping_purchase'", "rpc('adjust_purchased_shopping_quantity'", 'assertValidQuantity(input.quantity)', 'p_owner_id: input.ownerId']) {
  if (!shoppingMutations.includes(marker)) {
    throw new Error(`V2.5.1 Shopping purchase mutation marker missing: ${marker}`)
  }
}
if (shoppingMutations.includes('setShoppingItemPurchased')) {
  throw new Error('V2.5.1 must not retain a second boolean-only Shopping completion mutation authority.')
}

for (const marker of ['transferPurchasedShoppingItemToInventory', "rpc('transfer_purchased_shopping_item_to_inventory'", 'p_shopping_item_id: input.itemId']) {
  if (!shoppingMutations.includes(marker)) {
    throw new Error(`V2.6 Shopping -> Inventory mutation marker missing: ${marker}`)
  }
}
if (!shoppingMutations.includes('mergeTarget') || !shoppingMutations.includes('item.unit_code === input.unitCode')) {
  throw new Error('V2.3 create must merge only the same active identity in the same unit.')
}
if (!shoppingMutations.includes('Taka rzecz jest już na liście w tej samej jednostce.')) {
  throw new Error('V2.3 edit must guard collisions instead of silently creating duplicate active identities.')
}
if (shoppingMutations.includes('normalizeShoppingName') || shoppingMutations.includes('resolveIdentity(')) {
  throw new Error('V2.3.2 must not keep a second Shopping-only Product identity implementation.')
}

const shoppingEditor = await readFile('src/features/shopping/ShoppingEditor.tsx', 'utf8')
for (const marker of ['Co kupić?', 'ProductAutocompleteField', 'useProductAutocomplete', 'model.units.map', 'createShoppingItem', 'updateShoppingItem', 'removeShoppingItem', 'Usuń z listy', 'currentProductId: mode.item.productId', 'parseQuantityInput', 'getDefaultUnitCode', "kind: 'create'; seed?: ShoppingCreateSeed", 'initialSeed?.productName', 'initialSeed?.unitCode', 'seededProductId']) {
  if (!shoppingEditor.includes(marker)) {
    throw new Error(`V2.3.1 Shopping editor marker missing: ${marker}`)
  }
}
if (shoppingEditor.includes('<datalist') || shoppingEditor.includes('shopping-product-suggestions') || /\slist=["']/.test(shoppingEditor)) {
  throw new Error('V2.3.1 Shopping must not keep a second browser-native datalist suggestion system.')
}
if (!shoppingEditor.includes("matchMedia('(hover: hover) and (pointer: fine)')")) {
  throw new Error('V2.3 Shopping editor must keep the no-forced-mobile-keyboard contract.')
}

if (shoppingEditor.includes('products={model.products}')) {
  throw new Error('V2.3.2 must not pass unsupported props to ProductAutocompleteField.')
}
if (!shoppingEditor.includes("'Zmiana nazwy zaktualizuje ten produkt wszędzie.'") || !shoppingEditor.includes("'Powstanie nowy produkt.'")) {
  throw new Error('V2.3.3 Shopping must distinguish shared Product rename from new Product creation.')
}
if (shoppingEditor.includes("unit.code === 'szt'")) {
  throw new Error('V2.3.3 Shopping must never treat the display symbol szt. as a Measurement Unit code.')
}

const shoppingPage = await readFile('src/features/shopping/ShoppingPage.tsx', 'utf8')
for (const marker of ['Zakupy', 'Lista jest pusta', 'loadShoppingReadModel', 'totalItemCount >= 8', 'Szukaj na liście', '<ShoppingEditor']) {
  if (!shoppingPage.includes(marker)) {
    throw new Error(`Shopping page marker missing: ${marker}`)
  }
}
for (const marker of ['ShoppingPurchaseSheet', 'restoreShoppingPurchase', 'purchaseTarget', 'Do kupienia', 'Kupione', 'Wszystko kupione', 'shopping-purchase-toggle', 'model.activeItems', 'model.purchasedItems', 'Przywróć ${item.name} do listy zakupów']) {
  if (!shoppingPage.includes(marker)) {
    throw new Error(`V2.5.1 Shopping purchased-state UI marker missing: ${marker}`)
  }
}
if (!shoppingPage.includes('visibleActiveItems') || !shoppingPage.includes('visiblePurchasedItems')) {
  throw new Error('V2.5 shared Shopping search must filter both active and purchased groups.')
}

for (const marker of ['ShoppingInventoryBridge', 'inventoryTarget', 'shopping-to-inventory-button', 'Dodaj ${item.name} do zapasów', 'handleTransferredToInventory']) {
  if (!shoppingPage.includes(marker)) {
    throw new Error(`V2.6 Purchased -> Inventory page marker missing: ${marker}`)
  }
}


const shoppingPurchaseSheet = await readFile('src/features/shopping/ShoppingPurchaseSheet.tsx', 'utf8')
for (const marker of ['Zmień kupioną ilość', 'QuantityStepperInput', 'adjustPurchasedShoppingQuantity', 'Do „Do kupienia” wróci:', 'Aktualnie kupiono:', 'nadwyżka również zostanie zapisana jako kupiona']) {
  if (!shoppingPurchaseSheet.includes(marker)) {
    throw new Error(`V2.6.5 purchased-quantity correction sheet marker missing: ${marker}`)
  }
}
if (shoppingPurchaseSheet.includes('System spróbuje przenieść')) {
  throw new Error('V2.6.5 must not describe upward correction as limited by the active Shopping remainder.')
}
if (shoppingPurchaseSheet.includes('max={item.quantity}') || shoppingPurchaseSheet.includes('purchaseShoppingQuantity')) {
  throw new Error('V2.6.3 correction sheet must edit an already-purchased quantity, not run the old pre-purchase partial flow.')
}


const shoppingInventoryBridge = await readFile('src/features/shopping/ShoppingInventoryBridge.tsx', 'utf8')
for (const marker of ['InventoryEditor', 'loadInventoryReadModel', 'transferPurchasedShoppingItemToInventory', 'productId: item.productId!', 'quantity: item.quantity', 'unitCode: item.unitCode', 'createHandler={transfer}']) {
  if (!shoppingInventoryBridge.includes(marker)) {
    throw new Error(`V2.6 shared Shopping -> Inventory bridge marker missing: ${marker}`)
  }
}
if (shoppingInventoryBridge.includes(".from('inventory_items')") || shoppingInventoryBridge.includes('.insert({')) {
  throw new Error('V2.6 Shopping bridge must not own a second Inventory persistence implementation.')
}

if (!homePage.includes('onOpenShopping') || !homePage.includes('home-shopping-hub') || !homePage.includes('loadActiveShoppingCount')) {
  throw new Error('V2.3 Start must provide a contextual Shopping List shortcut and natural count summary.')
}
if (homePage.includes('<strong>Do kupienia</strong>') && homePage.includes('coming-badge')) {
  throw new Error('V2.3 must remove Shopping from disabled future previews once the module is active.')
}


const inventoryTypes = await readFile('src/features/inventory/types.ts', 'utf8')
const shoppingTypes = await readFile('src/features/shopping/types.ts', 'utf8')
if (!inventoryTypes.includes("ProductIdentityOption") || !shoppingTypes.includes("ProductIdentityOption")) {
  throw new Error('V2.3.3 Inventory and Shopping must share the canonical Product type.')
}
if (!inventoryTypes.includes("MeasurementUnit as SharedMeasurementUnit") || !shoppingTypes.includes("MeasurementUnit")) {
  throw new Error('V2.3.3 Inventory and Shopping must share the Measurement Unit type.')
}

for (const marker of ['ShoppingCatalogModel', 'ShoppingCreateSeed', 'productId: string', 'productName: string', 'unitCode: string']) {
  if (!shoppingTypes.includes(marker)) {
    throw new Error(`V2.4 shared Shopping create seed/catalog marker missing: ${marker}`)
  }
}
for (const marker of ['isPurchased: boolean', 'purchasedAt: string | null', 'activeItems: ShoppingItem[]', 'purchasedItems: ShoppingItem[]']) {
  if (!shoppingTypes.includes(marker)) {
    throw new Error(`V2.5 Shopping type marker missing: ${marker}`)
  }
}

for (const marker of ['InventoryCreateSeed', 'productId: string', 'productName: string', 'quantity: number', 'unitCode: string']) {
  if (!inventoryTypes.includes(marker)) {
    throw new Error(`V2.6 Inventory create seed marker missing: ${marker}`)
  }
}

for (const file of ['src/features/inventory/InventoryPage.tsx', 'src/features/inventory/ExpiryPage.tsx', 'src/features/inventory/InventoryConsumeSheet.tsx', 'src/features/shopping/ShoppingPage.tsx']) {
  const content = await readFile(file, 'utf8')
  if (!content.includes("from '../quantity/quantity'") || !content.includes('formatQuantity')) {
    throw new Error(`V2.3.3 quantity formatting must come from the shared authority: ${file}`)
  }
}


const quantityStepper = await readFile('src/features/quantity/QuantityStepperInput.tsx', 'utf8')
for (const marker of ['stepQuantityInput', 'canStepQuantityInput', 'quantity-stepper', 'Zmniejsz ilość o 1', 'Zwiększ ilość o 1']) {
  if (!quantityStepper.includes(marker)) {
    throw new Error(`V2.4.1 shared QuantityStepper marker missing: ${marker}`)
  }
}
for (const file of ['src/features/inventory/InventoryEditor.tsx', 'src/features/shopping/ShoppingEditor.tsx', 'src/features/inventory/InventoryConsumeSheet.tsx']) {
  const content = await readFile(file, 'utf8')
  if (!content.includes("from '../quantity/QuantityStepperInput'") || !content.includes('<QuantityStepperInput')) {
    throw new Error(`V2.4.1 quantity +/- must reuse the shared QuantityStepperInput: ${file}`)
  }
}
if (!consumeSheet.includes('max={lot.quantity}')) {
  throw new Error('V2.4.1 Consume quantity stepper must be bounded by the current lot quantity.')
}
const quantityStepperStyles = await readFile('src/styles/global.css', 'utf8')
for (const marker of ['.quantity-stepper', '.quantity-stepper-button', 'grid-template-columns: 44px minmax(0, 1fr) 44px', 'max-width: 220px']) {
  if (!quantityStepperStyles.includes(marker)) {
    throw new Error(`V2.6.4 shared quantity stepper style marker missing: ${marker}`)
  }
}
for (const marker of ['.shopping-purchase-toggle', '.shopping-completed-section', '.shopping-completed-heading', '.shopping-item-completed', '.shopping-all-done-card', '.shopping-purchase-sheet', '.shopping-purchase-remaining', '.shopping-to-inventory-button', '.inventory-create-seed-summary', '.shopping-inventory-bridge-state']) {
  if (!quantityStepperStyles.includes(marker)) {
    throw new Error(`V2.6 purchased-state/inventory-transfer style marker missing: ${marker}`)
  }
}



// V2.6.2 — one shared location picker + fast full-purchase path.
const storageLocationPicker = await readFile('src/features/inventory/StorageLocationPicker.tsx', 'utf8')
for (const marker of ['storage-location-picker', 'role="radiogroup"', 'role="radio"', 'aria-checked={selected}', "kind === 'fridge'", "kind === 'freezer'", "kind === 'pantry'"]) {
  if (!storageLocationPicker.includes(marker)) {
    throw new Error(`V2.6.2 shared storage-location picker marker missing: ${marker}`)
  }
}
const inventoryEditorV262 = await readFile('src/features/inventory/InventoryEditor.tsx', 'utf8')
if (!inventoryEditorV262.includes('<StorageLocationPicker') || inventoryEditorV262.includes('id="inventory-location"')) {
  throw new Error('V2.6.2 InventoryEditor must use the shared icon location picker instead of its location select.')
}
const shoppingPageV262 = await readFile('src/features/shopping/ShoppingPage.tsx', 'utf8')
for (const marker of ['handleQuickPurchase', 'purchaseShoppingQuantity({', 'quantity: item.quantity', 'shopping-purchased-quantity-button', 'Zmień ilość', 'setPurchaseTarget(item)']) {
  if (!shoppingPageV262.includes(marker)) {
    throw new Error(`V2.6.3 Shopping quick-purchase/correction marker missing: ${marker}`)
  }
}
if (shoppingPageV262.includes('shopping-partial-purchase-button')) {
  throw new Error('V2.6.3 must not expose pre-purchase Zmień ilość on active Shopping rows.')
}
for (const marker of ['.storage-location-picker', '.storage-location-option', '.shopping-active-row', '.shopping-purchased-quantity-button']) {
  if (!globalCss.includes(marker)) {
    throw new Error(`V2.6.3 mobile interaction style marker missing: ${marker}`)
  }
}

const consumeSheetV263 = await readFile('src/features/inventory/InventoryConsumeSheet.tsx', 'utf8')
for (const marker of ['formatQuantityInput(Math.min(DEFAULT_QUANTITY_STEP, lot.quantity))', '<QuantityStepperInput', 'max={lot.quantity}']) {
  if (!consumeSheetV263.includes(marker)) {
    throw new Error(`V2.6.3 Consume stepper initialization marker missing: ${marker}`)
  }
}

// V2.6.4 — purchased-row density + one shared compact stepper sizing authority.
const purchasedCopyStart = shoppingPageV262.indexOf('<div className="shopping-completed-row-copy">')
const purchasedCopyEnd = shoppingPageV262.indexOf('</div>', purchasedCopyStart)
const purchasedQuantityAction = shoppingPageV262.indexOf('className="shopping-purchased-quantity-button"')
const purchasedInventoryAction = shoppingPageV262.indexOf('className="shopping-to-inventory-button"')
if (
  purchasedCopyStart < 0
  || purchasedCopyEnd < 0
  || purchasedQuantityAction < purchasedCopyEnd
  || purchasedInventoryAction < purchasedQuantityAction
) {
  throw new Error('V2.6.4 purchased quantity action must be a compact sibling after product copy and before Inventory action.')
}
for (const marker of [
  'grid-template-columns: 48px minmax(0, 1fr) auto 48px',
  '.shopping-purchased-quantity-button',
  'border: 0',
  'background: transparent',
  '@media (max-width: 359px)',
  'max-width: 220px',
]) {
  if (!globalCss.includes(marker)) {
    throw new Error(`V2.6.4 mobile density marker missing: ${marker}`)
  }
}
if (globalCss.includes('.shopping-purchased-quantity-button {\n  width: fit-content;')) {
  throw new Error('V2.6.4 must not retain the oversized V2.6.3 purchased-quantity button treatment.')
}

// V2.6.1 — one shared runtime decoder for untyped custom RPC result rows.
const inventoryRpcResults = await readFile('src/features/inventory/inventoryRpcResults.ts', 'utf8')
for (const marker of ['requireInventoryItemId', "'inventory_item_id' in payload", "typeof payload.inventory_item_id !== 'string'"]) {
  if (!inventoryRpcResults.includes(marker)) {
    throw new Error(`V2.6.1 shared Inventory RPC result decoder marker missing: ${marker}`)
  }
}
for (const [fileName, source] of [
  ['inventoryMutations.ts', mutations],
  ['shoppingMutations.ts', shoppingMutations],
]) {
  if (!source.includes('requireInventoryItemId')) {
    throw new Error(`V2.6.1 ${fileName} must use the shared Inventory RPC result decoder.`)
  }
  if (source.includes('result.data.inventory_item_id')) {
    throw new Error(`V2.6.1 ${fileName} must not directly access an untyped RPC result row.`)
  }
}

const overpurchaseContract = await readFile('tests/SHOPPING_OVERPURCHASE_CONTRACT.md', 'utf8')
for (const marker of ['Actual purchased quantity may be higher', 'min(A, delta)', 'valid overpurchase', 'adjust_purchased_shopping_quantity']) {
  if (!overpurchaseContract.includes(marker)) {
    throw new Error(`V2.6.5 overpurchase contract marker missing: ${marker}`)
  }
}


// V2.7 — shared user-facing error presentation + V2 closeout contract.
const userErrorHelper = await readFile('src/lib/userError.ts', 'utf8')
for (const marker of ['toUserErrorMessage', 'wrappedBackendFailure', 'Nie udało się']) {
  if (!userErrorHelper.includes(marker)) {
    throw new Error(`V2.7 shared user-error presentation marker missing: ${marker}`)
  }
}

for (const file of [
  'src/features/inventory/InventoryConsumeSheet.tsx',
  'src/features/inventory/InventoryEditor.tsx',
  'src/features/shopping/ShoppingPage.tsx',
  'src/features/shopping/ShoppingEditor.tsx',
  'src/features/shopping/ShoppingPurchaseSheet.tsx',
]) {
  const source = await readFile(file, 'utf8')
  if (!source.includes('toUserErrorMessage')) {
    throw new Error(`V2.7 user-facing mutation surface does not reuse shared error presentation: ${file}`)
  }
  if (/error instanceof Error \? error\.message/.test(source)) {
    throw new Error(`V2.7 raw caught Error.message presentation remains in: ${file}`)
  }
}

const v2CloseoutContract = await readFile('tests/V2_CLOSEOUT_CONTRACT.md', 'utf8')
for (const marker of [
  'canonical Product is shared by Inventory and Shopping',
  'factual purchased quantity may exceed the earlier plan',
  'normal Inventory create and transfer share add_inventory_lot authority',
  'no raw backend English is rendered',
]) {
  if (!v2CloseoutContract.includes(marker)) {
    throw new Error(`V2.7 closeout contract marker missing: ${marker}`)
  }
}

const gitignore = await readFile('.gitignore', 'utf8')
if (!gitignore.includes('*.tsbuildinfo')) {
  throw new Error('V2.7 repo hygiene must ignore generated TypeScript build-info files.')
}


// Recipes — current V3 architecture.
if (!shell.includes("import { RecipesPage } from '../features/recipes/RecipesPage'")) {
  throw new Error('AppShell must import RecipesPage.')
}
if (!shell.includes("view === 'recipes'") || !shell.includes("changeView('recipes')")) {
  throw new Error('Bottom navigation must activate Recipes.')
}
if (shell.includes('Przepisy — moduł w przygotowaniu')) {
  throw new Error('Recipes cannot remain a disabled navigation placeholder.')
}
if (!shell.includes('recipesOverviewRequest') || !shell.includes('overviewRequestToken={recipesOverviewRequest}')) {
  throw new Error('Active Recipes navigation must return detail to the Recipe list.')
}
if (homePage.includes('home-recipes-hub') || homePage.includes('<strong>Przepisy</strong>')) {
  throw new Error('Start must not duplicate Recipes module navigation.')
}

const recipesReadModel = await readFile('src/features/recipes/recipesReadModel.ts', 'utf8')
for (const marker of [
  ".from('recipes')",
  ".from('recipe_sections')",
  ".from('recipe_ingredients')",
  ".eq('owner_id', ownerId)",
  'loadInventoryReadModel(ownerId)',
  'readStoredQuantity',
]) {
  if (!recipesReadModel.includes(marker)) throw new Error(`Recipes read-model marker missing: ${marker}`)
}
if (/\.(insert|update|upsert|delete|rpc)\s*\(/.test(recipesReadModel)) {
  throw new Error('Recipes read model must remain read-only.')
}

for (const marker of [
  'prep_time_minutes',
  'cook_time_minutes',
  'readStoredRecipeDuration',
  'inventoryModel.groups',
  ".from('shopping_items')",
  ".eq('is_purchased', false)",
  'resolveIngredientPresence',
  'inventoryProductIds',
  'activeShoppingProductIds',
  'row.product_id',
]) {
  if (!recipesReadModel.includes(marker)) throw new Error(`V3.5.2 Recipes presence/timing read marker missing: ${marker}`)
}
if ((recipesReadModel.match(/\.eq\('owner_id', ownerId\)/g) ?? []).length < 4 || !recipesReadModel.includes('loadInventoryReadModel(ownerId)')) {
  throw new Error('V4.3 Recipe, section, ingredient and Shopping reads must be owner-scoped, with physical stock delegated to InventoryReadModel.')
}
if (/custom_name|productName.*presence|name.*presence/i.test(recipesReadModel)) {
  throw new Error('V3.5.2 Recipe presence must resolve by canonical product_id only, never display/custom name.')
}

const recipesPage = await readFile('src/features/recipes/RecipesPage.tsx', 'utf8')
for (const marker of [
  'RecipeCoverImage',
  'RecipeEditor',
  'Składniki',
  'Przygotowanie',
  'formatScaledRecipeQuantity',
]) {
  if (!recipesPage.includes(marker)) throw new Error(`Recipes UI marker missing: ${marker}`)
}
if (recipesPage.includes('RecipeIngredientsEditor') || recipesPage.includes('recipe-section-action') || recipesPage.includes('recipe-detail-empty-action')) {
  throw new Error('Recipe detail must remain read-only; ingredient mutation belongs to unified Recipe authoring.')
}
if (recipesPage.includes('await flushRecipeImageCleanupQueue(ownerId)')) {
  throw new Error('Recipe reading must not await Storage cleanup maintenance.')
}
if (!recipesPage.includes('RecipeServingsControl') || !recipesPage.includes('formatScaledRecipeQuantity')) {
  throw new Error('V3.5 Recipe detail must provide read-only servings preview scaling.')
}
if (!recipesPage.includes('model.recipes.length >= 8') || !recipesPage.includes('Szukaj przepisu lub składnika')) {
  throw new Error('V3.5 Recipes must use contextual search only for larger Recipe collections.')
}
if (!recipesPage.includes('ingredient.productName.toLocaleLowerCase')) {
  throw new Error('V3.5 Recipe search must match ingredient Product names as well as Recipe names.')
}
for (const marker of ['visibleRecipeSections.map', 'ingredient.sectionId === section.id', 'shouldShowRecipeSectionHeadings']) {
  if (!recipesPage.includes(marker)) throw new Error(`V3.6A structured Recipe detail marker missing: ${marker}`)
}
if (recipesPage.includes('sectionLabel') || recipesPage.includes('Pozostałe składniki')) {
  throw new Error('V3.6A Recipe detail must render real structured sections instead of legacy section labels/fallback groups.')
}
if (recipesPage.includes('recipe-detail-ingredient-count')) {
  throw new Error('V3.5.1 Recipe detail must not repeat ingredient count directly above the ingredient list.')
}

for (const marker of [
  'formatRecipeDuration',
  'recipe-detail-timing',
  'recipe-ingredient-index is-match-${matchState}',
  'recipeMatchStateLabel',
]) {
  if (!recipesPage.includes(marker)) throw new Error(`V3.5.2 Recipe detail polish marker missing: ${marker}`)
}

const recipeServings = await readFile('src/features/recipes/recipeServings.ts', 'utf8')
for (const marker of [
  'RECIPE_SERVINGS_MIN = 1',
  'RECIPE_SERVINGS_MAX = 999',
  'normalizeQuantityPrecision',
  'baseQuantity * targetServings / baseServings',
  "'<0,001'",
]) {
  if (!recipeServings.includes(marker)) {
    throw new Error(`V3.5 Recipe servings authority marker missing: ${marker}`)
  }
}
if (/supabase|\.from\(|\.rpc\(/i.test(recipeServings)) {
  throw new Error('V3.5 servings preview must remain a pure read-only authority.')
}

const recipeDuration = await readFile('src/features/recipes/recipeDuration.ts', 'utf8')
for (const marker of [
  'RECIPE_DURATION_MIN = 1',
  'RECIPE_DURATION_MAX = 10080',
  'parseOptionalRecipeDuration',
  'readStoredRecipeDuration',
  'formatRecipeDuration',
]) {
  if (!recipeDuration.includes(marker)) throw new Error(`V3.5.2 Recipe duration authority marker missing: ${marker}`)
}
if (/supabase|\.from\(|\.rpc\(/i.test(recipeDuration)) {
  throw new Error('Recipe duration authority must remain pure and independent from persistence.')
}

const recipeShoppingPlan = await readFile('src/features/recipes/recipeShoppingPlan.ts', 'utf8')
for (const marker of [
  'buildRecipeShoppingPlan',
  'purchasePlan',
  'activeShoppingItems',
  'targetQuantity',
  'activeQuantity',
  'topUpQuantity',
  "'needs-top-up'",
  "'covered'",
  "'blocked'",
  'unresolvedProductIds',
  'getRecipeShoppingActionProductIds',
]) {
  if (!recipeShoppingPlan.includes(marker)) throw new Error(`V5.2 Recipe Shopping-plan marker missing: ${marker}`)
}
if (/supabase|\.rpc\(/i.test(recipeShoppingPlan) || /\.from\(\s*['"]/i.test(recipeShoppingPlan)) {
  throw new Error('V5.2 Recipe Shopping plan must remain pure and must not own persistence.')
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-recipe-shopping-upgrade.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})

const v5CloseoutContract = await readFile('tests/V5_CLOSEOUT_CONTRACT.md', 'utf8')
for (const marker of [
  'Canonical chain',
  'active Shopping never changes',
  'Retail-unit rule',
  'at-least total active Shopping quantity',
  'V5.3 closeout',
]) {
  if (!v5CloseoutContract.includes(marker)) throw new Error(`V5 closeout contract marker missing: ${marker}`)
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-v5-closeout.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})

const recipeServingsControl = await readFile('src/features/recipes/RecipeServingsControl.tsx', 'utf8')
for (const marker of [
  'Zmniejsz liczbę porcji',
  'Zwiększ liczbę porcji',
  'Przywróć',
  'RECIPE_SERVINGS_MAX',
]) {
  if (!recipeServingsControl.includes(marker)) {
    throw new Error(`V3.5 servings control marker missing: ${marker}`)
  }
}

const recipeEditor = await readFile('src/features/recipes/RecipeEditor.tsx', 'utf8')
for (const marker of [
  'loadMeasurementUnits',
  'loadOwnerProductCatalog',
  'saveRecipeSnapshot',
  'processRecipeCoverImage',
  'RecipeCoverFocusEditor',
  'Dodaj składnik',
  'Przygotowanie',
]) {
  if (!recipeEditor.includes(marker)) throw new Error(`Unified Recipe authoring marker missing: ${marker}`)
}
if (recipeEditor.includes('canonical Product') || recipeEditor.includes('wspólnym katalogu Kitchen')) {
  throw new Error('Recipe authoring must not expose internal Product architecture copy.')
}
if (recipeEditor.includes('updateRecipeCoverFocus') || recipeEditor.includes('onCoverFocusSaved')) {
  throw new Error('Crop must belong to the Recipe authoring draft, not a second persistence authority.')
}

for (const marker of [
  'prepTimeMinutes',
  'cookTimeMinutes',
  'Czas przygotowania',
  'Czas gotowania / pieczenia',
  'DEFAULT_PRIMARY_RECIPE_SECTION_NAME',
  'Sekcje składników',
  'Nową sekcję dodasz podczas dodawania składnika.',
  'RecipeIngredientEditorSheet',
  'commitRecipeIngredientRow',
  'beginRenameSection',
  'removeSection',
  'validateRecipeSections',
]) {
  if (!recipeEditor.includes(marker)) throw new Error(`V3.6A Recipe section authoring marker missing: ${marker}`)
}
if (recipeEditor.includes('Bez sekcji') || recipeEditor.includes('sectionLabel') || recipeEditor.includes('sectionMode')) {
  throw new Error('V3.6A authoring must remove the legacy optional/free-text section-label path.')
}
if (recipeEditor.includes('id="recipe-ingredient-section"') || /<select[\s\S]{0,500}Sekcja/.test(recipeEditor)) {
  throw new Error('V3.6A ingredient section assignment must use fast buttons/chips, not a dropdown.')
}

const recipeIngredientEditor = await readFile('src/features/recipes/RecipeIngredientEditorSheet.tsx', 'utf8')
const recipeIngredientDraft = await readFile('src/features/recipes/recipeIngredientDraft.ts', 'utf8')
for (const marker of [
  'recipe-ingredient-editor-backdrop',
  'pendingSectionOpen',
  'Sekcja powstanie dopiero po zastosowaniu składnika.',
  'desiredSectionIndex',
  'Wybierz sekcję składnika',
  'recipe-section-choice',
  'aria-pressed',
  'ProductAutocompleteField',
  'QuantityStepperInput',
  "event.key !== 'Escape'",
]) {
  if (!recipeIngredientEditor.includes(marker)) throw new Error(`V3.6A.1 ingredient sheet marker missing: ${marker}`)
}
if (recipeIngredientEditor.includes('setSections(') || /\.(from|rpc)\s*\(/.test(recipeIngredientEditor)) {
  throw new Error('V3.6A.1 ingredient sheet must own only a local child draft and must not mutate section persistence directly.')
}
if (recipeEditor.includes('Dodaj sekcję')) {
  throw new Error('V3.6A.1 section manager must not expose an independent Add Section action.')
}
if (recipeEditor.includes('recipe-ingredient-draft-card')) {
  throw new Error('V3.6A.1 ingredient authoring must not fall back to the old inline draft card.')
}
if (!recipeEditor.includes('disabled={busy || sectionEditor !== null}')) {
  throw new Error('V3.6A.1 final Recipe Save must expose the local section-rename blocker directly.')
}
if (recipeEditor.includes('type="submit" disabled={busy || catalogLoading}')) {
  throw new Error('V3.6A.1 final Recipe Save must not depend on Product Catalog loading.')
}
const parentRecipeFormEnd = recipeEditor.indexOf('</form>')
const ingredientSheetRender = recipeEditor.indexOf('<RecipeIngredientEditorSheet')
if (parentRecipeFormEnd < 0 || ingredientSheetRender < 0 || ingredientSheetRender < parentRecipeFormEnd) {
  throw new Error('V3.6A.1 RecipeIngredientEditorSheet must render outside the parent Recipe form.')
}
for (const marker of ['commitRecipeIngredientRow', 'desiredSectionIndex', 'withoutCurrent', 'targetSectionRows']) {
  if (!recipeIngredientDraft.includes(marker)) throw new Error(`V3.6A.1 ingredient draft helper marker missing: ${marker}`)
}
if (/supabase|\.from\(|\.rpc\(/i.test(recipeIngredientDraft)) {
  throw new Error('V3.6A.1 ingredient draft transaction helper must remain pure.')
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-recipe-ingredient-draft.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})

const packageSemantics = await readFile('src/features/measurements/packageSemantics.ts', 'utf8')
for (const marker of [
  "DIRECT_PACKAGE_CONTENT_FAMILIES = ['count', 'mass', 'volume']",
  "CONTAINER_UNIT_FAMILIES = ['package', 'jar', 'bottle', 'can', 'sachet']",
  'resolveInventoryPackageContent',
  'getPackageContentUnits',
]) {
  if (!packageSemantics.includes(marker)) throw new Error(`V3.6B package-semantics marker missing: ${marker}`)
}
if (/productName|normalizeProductName/i.test(packageSemantics)) {
  throw new Error('V3.6B package semantics must never infer content from Product names.')
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-package-semantics.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})

const measurementUnits = await readFile('src/features/measurements/measurementUnits.ts', 'utf8')
for (const marker of ['toBaseFactor', 'to_base_factor', "select('code, label_pl, symbol, family, sort_order, to_base_factor')"]) {
  if (!measurementUnits.includes(marker)) throw new Error(`V4.1 Measurement Unit authority marker missing: ${marker}`)
}

const measurementConversion = await readFile('src/features/measurements/measurementConversion.ts', 'utf8')
for (const marker of ['convertMeasurementQuantity', 'toBaseMeasurementQuantity', 'fromBaseMeasurementQuantity', 'toBaseFactor', 'incompatible-family', 'non-direct-unit']) {
  if (!measurementConversion.includes(marker)) throw new Error(`V4.1 measurement-conversion marker missing: ${marker}`)
}
if (/supabase|\.from\(|\.rpc\(/i.test(measurementConversion)) {
  throw new Error('V4.1 Measurement conversion authority must remain pure.')
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-measurement-conversion.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-recipe-package-snapshot.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})

const packageSemanticsContract = await readFile('tests/PACKAGE_SEMANTICS_CONTRACT.md', 'utf8')
for (const marker of [
  'Product default',
  'Inventory-lot resolved package-content snapshot',
  'Different resolved package contents must not merge',
  'V3.6B does not compute Recipe sufficiency',
]) {
  if (!packageSemanticsContract.includes(marker)) throw new Error(`V3.6B contract marker missing: ${marker}`)
}

for (const marker of [
  'package_content_value',
  'package_content_unit',
]) {
  if (!inventoryReadModel.includes(marker)) throw new Error(`V3.6B Inventory read marker missing: ${marker}`)
  if (!mutations.includes(marker)) throw new Error(`V3.6B Inventory mutation marker missing: ${marker}`)
}
for (const marker of [
  'package-content-card',
  'Domyślna zawartość opakowania',
  'resolveInventoryPackageContent',
  'packageContentValue',
  'packageContentUnitCode',
]) {
  if (!editor.includes(marker)) throw new Error(`V3.6B Inventory editor marker missing: ${marker}`)
}
if (!shoppingMutations.includes('p_package_content_value: input.packageContentValue') || !shoppingMutations.includes('p_package_content_unit: input.packageContentUnitCode')) {
  throw new Error('V3.6B Shopping -> Inventory transfer must propagate package-content semantics.')
}
for (const marker of ['.package-content-card', '.package-content-fields', '.inventory-package-content']) {
  if (!globalCss.includes(marker)) throw new Error(`V3.6B mobile package-content CSS marker missing: ${marker}`)
}

const recipeSections = await readFile('src/features/recipes/recipeSections.ts', 'utf8')
for (const marker of [
  "DEFAULT_PRIMARY_RECIPE_SECTION_NAME = 'Główne'",
  'cleanRecipeSectionName',
  'recipeSectionIdentity',
  'validateRecipeSections',
  'primaryCount !== 1',
]) {
  if (!recipeSections.includes(marker)) throw new Error(`V3.6A pure Recipe section authority marker missing: ${marker}`)
}
if (/supabase|\.from\(|\.rpc\(/i.test(recipeSections)) {
  throw new Error('V3.6A Recipe section validation/normalization authority must remain pure.')
}

for (const marker of [
  'createCanonicalShoppingItemsSequentially',
  'for (const input of inputs)',
  'await createShoppingItem(input)',
]) {
  if (!shoppingMutations.includes(marker)) throw new Error(`V3.5.3 shared Shopping batch marker missing: ${marker}`)
}
if (/createCanonicalShoppingItemsSequentially[\s\S]{0,1200}Promise\.all/.test(shoppingMutations)) {
  throw new Error('V3.5.3 canonical Shopping batch must remain deterministic/sequential.')
}
for (const marker of [
  'ensureCanonicalShoppingTargetsSequentially',
  'targetQuantity',
  'loadActiveShoppingItems',
  'normalizeQuantityPrecision',
  'await createShoppingItem({',
  'wholeUnits',
]) {
  if (!shoppingMutations.includes(marker)) throw new Error(`V5.2 Shopping target-top-up marker missing: ${marker}`)
}
if (/ensureCanonicalShoppingTargetsSequentially[\s\S]{0,3500}Promise\.all/.test(shoppingMutations)) {
  throw new Error('V5.2 Shopping target top-up must remain deterministic/sequential.')
}

for (const marker of [
  'buildRecipePurchasePlan',
  'buildRecipeShoppingPlan',
  'getRecipeShoppingActionProductIds',
  'ensureCanonicalShoppingTargetsSequentially',
  'shoppingActionProductIds',
  'Ustaw sposób zakupu',
  'Na liście zakupów',
  'Dodaj brakujące',
  'targetServings',
  'refreshRecipesSilently',
]) {
  if (!recipesPage.includes(marker)) throw new Error(`V5.2 Recipe -> Shopping UI marker missing: ${marker}`)
}
if (recipesPage.includes('markRecipeProductsAsShopping')) {
  throw new Error('V5.2 Recipe -> Shopping must refresh canonical Shopping state instead of painting a local presence-only result.')
}
if (/\.from\(\s*['"]shopping_items['"]\s*\)|\.insert\(|\.update\(/.test(recipesPage)) {
  throw new Error('V5.2 RecipesPage must not write Shopping rows directly.')
}
if (recipesPage.includes('Promise.all') && recipesPage.includes('ensureCanonicalShoppingTargetsSequentially')) {
  throw new Error('V5.2 RecipesPage must not parallelize Shopping writes.')
}
for (const marker of ["select('product_id, quantity, unit_code')", 'activeShoppingItems', 'RecipeActiveShoppingItem']) {
  if (!recipesReadModel.includes(marker)) throw new Error(`V5.2 Recipe active-Shopping projection marker missing: ${marker}`)
}

const productAutocomplete = await readFile('src/features/products/ProductAutocomplete.tsx', 'utf8')
if (!productAutocomplete.includes('exactHint?: string') || !productAutocomplete.includes('unmatchedHint?: string')) {
  throw new Error('Shared ProductAutocomplete must support SMART flows without mandatory helper copy.')
}

const recipeMutations = await readFile('src/features/recipes/recipeMutations.ts', 'utf8')
for (const marker of [
  'resolveOrCreateCanonicalProduct',
  'cleanupCreatedCanonicalProduct',
  "supabase.rpc('save_recipe_snapshot'",
  'p_sections: cleanedSections.map',
  'p_ingredients: resolvedIngredients',
  'section_id: ingredient.sectionId',
  "supabase.rpc('delete_recipe_with_cover_cleanup'",
]) {
  if (!recipeMutations.includes(marker)) throw new Error(`Recipe snapshot authority marker missing: ${marker}`)
}
if (/renameCanonicalProduct|resolveCanonicalProductForEdit/.test(recipeMutations)) {
  throw new Error('Recipe ingredient authoring must never globally rename the previously referenced Product.')
}

for (const marker of [
  'p_prep_time_minutes',
  'p_cook_time_minutes',
  'parseOptionalRecipeDuration',
]) {
  if (!recipeMutations.includes(marker)) throw new Error(`V3.5.2 Recipe snapshot duration marker missing: ${marker}`)
}
if (recipeMutations.includes(".from('recipes')")) {
  throw new Error('V3.5.2 duration metadata must persist only through save_recipe_snapshot, not a second direct Recipe update path.')
}

for (const marker of ['validateRecipeSections(input.sections)', 'sectionIds.has(ingredient.sectionId)', 'p_sections:', 'section_id']) {
  if (!recipeMutations.includes(marker)) throw new Error(`V3.6A structured snapshot mutation marker missing: ${marker}`)
}
if (recipeMutations.includes('section_label')) {
  throw new Error('V3.6A runtime mutation payload must not use legacy section_label as section authority.')
}

for (const marker of ['packageContentValue', 'packageContentUnitCode']) {
  if (!recipeMutations.includes(marker)) throw new Error(`V4.1 Recipe mutation package-snapshot marker missing: ${marker}`)
  if (!recipesReadModel.includes(marker)) throw new Error(`V4.1 Recipe read package-snapshot marker missing: ${marker}`)
  if (!recipeIngredientEditor.includes(marker)) throw new Error(`V4.1 Recipe ingredient editor package-snapshot marker missing: ${marker}`)
}
for (const marker of ['resolveRecipePackageContent', 'package_content_value', 'package_content_unit', 'productDefaultUnitCode']) {
  if (!recipeMutations.includes(marker)) throw new Error(`V4.1 Recipe package persistence marker missing: ${marker}`)
}
for (const marker of ['Zawartość 1', 'zostanie zapamiętana dla tego przepisu', 'getPackageContentUnits', 'isContainerMeasurementUnit', 'reselectsOriginalProduct', 'detachesProductIdentity', 'returnsToOriginalProduct', 'restoresOriginalSnapshot']) {
  if (!recipeIngredientEditor.includes(marker)) throw new Error(`V4.1 Recipe package editor marker missing: ${marker}`)
}

const measurementConversionContract = await readFile('tests/MEASUREMENT_CONVERSION_CONTRACT.md', 'utf8')
for (const marker of ['to_base_factor', 'same direct family', 'container units', 'pure']) {
  if (!measurementConversionContract.includes(marker)) throw new Error(`V4.1 Measurement conversion contract marker missing: ${marker}`)
}
const recipePackageSnapshotContract = await readFile('tests/RECIPE_PACKAGE_SNAPSHOT_CONTRACT.md', 'utf8')
for (const marker of ['immutable Recipe meaning', 'Product default', 'package_content_value', 'package_content_unit', 'servings']) {
  if (!recipePackageSnapshotContract.includes(marker)) throw new Error(`V4.1 Recipe package snapshot contract marker missing: ${marker}`)
}

const recipeCategories = await readFile('src/features/recipes/recipeCategories.ts', 'utf8')
const recipeDiscovery = await readFile('src/features/recipes/recipeDiscovery.ts', 'utf8')
const recipeDiscoveryReadModel = await readFile('src/features/recipes/recipeDiscoveryReadModel.ts', 'utf8')
for (const marker of ["'breakfast'", "'lunch'", "'dinner'", "'snack'", "'cake'", 'assertRecipeCategoryCode']) {
  if (!recipeCategories.includes(marker)) throw new Error(`V4.2 Recipe category authority marker missing: ${marker}`)
}
for (const marker of ['resolveCurrentMealCategory', 'localHour >= 6', 'localHour < 12', 'localHour < 18', 'localHour < 23', 'buildHomeRecipeSuggestions']) {
  if (!recipeDiscovery.includes(marker)) throw new Error(`V4.2 Recipe discovery authority marker missing: ${marker}`)
}
if (/supabase|\.from\(|\.rpc\(/i.test(recipeDiscovery)) {
  throw new Error('V4.2 Recipe discovery filtering/time authority must remain pure.')
}
for (const marker of [".from('recipes')", 'category_code', 'createRecipeCoverSignedUrl']) {
  if (!recipeDiscoveryReadModel.includes(marker)) throw new Error(`V4.2 lightweight Recipe discovery read marker missing: ${marker}`)
}
if (recipeDiscoveryReadModel.includes('inventory_items') || recipeDiscoveryReadModel.includes('shopping_items') || recipeDiscoveryReadModel.includes('recipe_sections') || recipeDiscoveryReadModel.includes('instructions')) {
  throw new Error('V4.3 Home Recipe discovery must stay compact: matching requirements are allowed, but Inventory/Shopping/sections/instructions are not.')
}
if (!recipeDiscoveryReadModel.includes('recipe_ingredients') || !recipeDiscoveryReadModel.includes('matchingIngredients')) {
  throw new Error('V4.3 Home discovery must expose the compact Recipe requirement projection for the shared matcher.')
}
for (const marker of ['categoryCode', 'p_category_code', 'assertRecipeCategoryCode']) {
  if (!recipeMutations.includes(marker)) throw new Error(`V4.2 Recipe category persistence marker missing: ${marker}`)
}
if (recipeMutations.includes(".from('recipes')")) {
  throw new Error('V4.2 category persistence must remain inside save_recipe_snapshot and never use a second direct Recipe update.')
}
for (const marker of ['RECIPE_CATEGORIES', 'Wybierz jedną kategorię', 'recipe-category-choice']) {
  if (!recipeEditor.includes(marker)) throw new Error(`V4.2 Recipe editor category marker missing: ${marker}`)
}
for (const marker of ['recipe-category-filters', 'filterRecipesByCategory', 'openRecipeRequestToken', 'recipeCategoryLabel']) {
  if (!recipesPage.includes(marker)) throw new Error(`V4.2 RecipesPage category/navigation marker missing: ${marker}`)
}
for (const marker of ['loadRecipeDiscoveryReadModel', 'Na teraz', 'Inspiracje i planowanie', 'visibilitychange', 'recipeCategoryFilter']) {
  if (!homePage.includes(marker)) throw new Error(`V4.2 Home Recipe discovery marker missing: ${marker}`)
}
if (homePage.includes('loadRecipesReadModel')) {
  throw new Error('V4.2 Home must not load the heavy full Recipe read model for discovery cards.')
}
for (const marker of ['openRecipeFromHome', 'openRecipeId={recipeOpenRequest.recipeId}', 'onOpenRecipes']) {
  if (!shell.includes(marker)) throw new Error(`V4.2 Home -> Recipe detail navigation marker missing: ${marker}`)
}
for (const marker of ['.recipe-category-filter', '.home-recipe-grid', '.home-recipe-card', '.recipe-category-choice']) {
  if (!globalCss.includes(marker)) throw new Error(`V4.2 Recipe discovery/category CSS marker missing: ${marker}`)
}
const recipeCategoryContract = await readFile('tests/RECIPE_CATEGORY_CONTRACT.md', 'utf8')
for (const marker of ['breakfast', 'Kawa z mlekiem', 'Lasagne', 'sole Recipe write authority']) {
  if (!recipeCategoryContract.includes(marker)) throw new Error(`V4.2 Recipe category contract marker missing: ${marker}`)
}
const recipeDiscoveryContract = await readFile('tests/RECIPE_DISCOVERY_CONTRACT.md', 'utf8')
for (const marker of ['06:00–11:59', '12:00–17:59', '18:00–22:59', '23:00–05:59', 'lightweight owner-scoped Recipe projection']) {
  if (!recipeDiscoveryContract.includes(marker)) throw new Error(`V4.2 Recipe discovery contract marker missing: ${marker}`)
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-recipe-discovery.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})

const recipeMatching = await readFile('src/features/recipes/recipeMatching.ts', 'utf8')
for (const marker of ['matchRecipe', 'buildRecipeMatchMap', 'sufficient', 'partial', 'missing', 'unresolved', 'scaleRecipeIngredientQuantity', 'toBaseMeasurementQuantity']) {
  if (!recipeMatching.includes(marker)) throw new Error(`V4.3 Recipe matching authority marker missing: ${marker}`)
}
if (/supabase|\.from\(['"]|\.rpc\(|shopping_items/i.test(recipeMatching)) {
  throw new Error('V4.3 Recipe matching authority must remain pure and independent from Shopping/Supabase.')
}
for (const marker of ['recipeMatches', 'selectedRecipeMatch', 'recipeMatchStateLabel']) {
  if (!recipesPage.includes(marker)) throw new Error(`V4.3 RecipesPage matching marker missing: ${marker}`)
}
for (const marker of ['recipeMatches', 'home-recipes-cookable', 'recipe-match-badge', 'buildRecipeMatchMap', 'cookableNow']) {
  if (!homePage.includes(marker)) throw new Error(`V4.3 Home matching marker missing: ${marker}`)
}
for (const marker of ['.recipe-match-badge', '.home-recipes-cookable', '.recipe-ingredient-index.is-match-sufficient', '.recipe-ingredient-index.is-match-unresolved']) {
  if (!globalCss.includes(marker)) throw new Error(`V4.3 Recipe matching CSS marker missing: ${marker}`)
}
if (recipesPage.includes('recipe-cookable-filter') || recipesPage.includes('cookabilityFilter')) {
  throw new Error('V4.3.1 Mogę ugotować must not remain a RecipesPage filter; it is a dedicated time-aware Home section.')
}
if (homePage.includes('recipeCookabilityFilter') || homePage.includes('generalCookabilityFilter')) {
  throw new Error('V4.3.1 Home general Recipe discovery must not be filtered by Mogę ugotować.')
}
if (homePage.includes("recipe.match?.state ?? 'unresolved'") || homePage.includes('recipe.match?.state ?? \"unresolved\"')) {
  throw new Error('V4.4 Home must not synthesize Nieustalone before Inventory matching data is ready.')
}
if (!homePage.includes("homeStatus.status === 'ready' && recipe.match")) {
  throw new Error('V4.4 Home matching badges must be gated by ready Inventory data.')
}
if (!homePage.includes('Brak przepisu z kompletem potwierdzonych składników na tę porę dnia.')) {
  throw new Error('V4.4 cookable empty state must stay neutral across missing/partial/unresolved cases.')
}
if (homePage.includes('nie masz wszystkich składników do żadnego przepisu')) {
  throw new Error('V4.4 Home must not collapse unresolved/partial states into a definite ingredient-shortage message.')
}
const recipeMatchingContract = await readFile('tests/RECIPE_MATCHING_CONTRACT.md', 'utf8')
for (const marker of ['Wystarczy', 'Częściowo', 'Brak', 'Nieustalone', 'Mogę ugotować', 'Product + effective direct family', 'never promotes']) {
  if (!recipeMatchingContract.includes(marker)) throw new Error(`V4.3 Recipe matching contract marker missing: ${marker}`)
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-recipe-matching.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})

const recipePurchasePlanning = await readFile('src/features/recipes/recipePurchasePlanning.ts', 'utf8')
for (const marker of ['buildRecipePurchasePlan', 'count-pack', 'ceilWholeUnits', 'ceilShoppingPrecision', 'ProductIdentityOption', 'RecipeMatchResult']) {
  if (!recipePurchasePlanning.includes(marker)) throw new Error(`V5.1 Recipe purchase planning authority marker missing: ${marker}`)
}
if (/supabase|\.from\(['"]|\.rpc\(|shopping_items/i.test(recipePurchasePlanning)) {
  throw new Error('V5.1 Purchase Planning Authority must remain pure and independent from Shopping/Supabase writes.')
}
const recipePurchasePlanningContract = await readFile('tests/RECIPE_PURCHASE_PLANNING_CONTRACT.md', 'utf8')
for (const marker of ['physical shortage', 'Product `defaultUnitCode`', 'Count-pack', 'ceil(shortageBase / contentBasePerPiece)', 'Automatic planning never produces fractional containers', 'No Shopping write in V5.1']) {
  if (!recipePurchasePlanningContract.includes(marker)) throw new Error(`V5.1 purchase-planning contract marker missing: ${marker}`)
}
await execFileAsync(process.execPath, ['--experimental-strip-types', 'scripts/test-recipe-purchase-planning.mjs'], {
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
})
for (const [sourceName, source] of [['Recipe mutations', recipeMutations], ['Recipe read model', recipesReadModel], ['Recipe editor', recipeEditor], ['Recipes page', recipesPage]]) {
  if (source.includes('section_label')) throw new Error(`V3.7 Recipe runtime must not reference legacy section_label: ${sourceName}.`)
}

const cropGeometry = await readFile('src/features/recipes/recipeCoverCrop.ts', 'utf8')
for (const marker of [
  'getContainedImageRect',
  'mapPointerToSourceFocus',
  'calculateCoverPixelLayout',
  'containerWidth',
  'containerHeight',
  'desiredLeft',
  'desiredTop',
]) {
  if (!cropGeometry.includes(marker)) throw new Error(`Recipe crop geometry marker missing: ${marker}`)
}

const focalEditor = await readFile('src/features/recipes/RecipeCoverFocusEditor.tsx', 'utf8')
for (const marker of [
  'getContainedImageRect',
  'mapPointerToSourceFocus',
  'object-fit',
  'RecipeCoverImage',
  'Zastosuj',
]) {
  if (marker === 'object-fit') continue
  if (!focalEditor.includes(marker)) throw new Error(`Recipe focal editor marker missing: ${marker}`)
}
if (focalEditor.includes('Zapisz kadr')) {
  throw new Error('Crop editor must apply draft crop, not create a separate save contract.')
}

const coverImage = await readFile('src/features/recipes/RecipeCoverImage.tsx', 'utf8')
if (!coverImage.includes('calculateCoverPixelLayout')) {
  throw new Error('Recipe covers must use one shared exact-pixel production crop renderer.')
}
if (!coverImage.includes('ResizeObserver') || !coverImage.includes('parentElement')) {
  throw new Error('Recipe cover renderer must measure the actual rendered container.')
}
if (coverImage.includes('targetAspect')) {
  throw new Error('Recipe cover renderer must not accept a nominal targetAspect.')
}

for (const marker of [
  'RECIPE_COVER_HERO_ASPECT = 16 / 10',
  'RECIPE_COVER_THUMBNAIL_ASPECT = 1',
]) {
  if (!cropGeometry.includes(marker)) throw new Error(`Recipe cover aspect authority marker missing: ${marker}`)
}
for (const [sourceName, source] of [
  ['RecipeEditor', recipeEditor],
  ['RecipeCoverFocusEditor', focalEditor],
  ['RecipesPage', recipesPage],
]) {
  if (!source.includes('RECIPE_COVER_HERO_ASPECT')) {
    throw new Error(`${sourceName} must reuse the shared Recipe hero aspect authority.`)
  }
}
if (!focalEditor.includes('RECIPE_COVER_THUMBNAIL_ASPECT') || !recipesPage.includes('RECIPE_COVER_THUMBNAIL_ASPECT')) {
  throw new Error('Crop preview and Recipe list must reuse the shared thumbnail aspect authority.')
}
for (const [sourceName, source] of [
  ['RecipeEditor', recipeEditor],
  ['RecipeCoverFocusEditor', focalEditor],
  ['RecipesPage', recipesPage],
]) {
  if (source.includes('targetAspect=')) {
    throw new Error(`${sourceName} must not pass a second crop geometry authority through targetAspect.`)
  }
}
if (globalCss.includes('aspect-ratio: 16 / 9;')) {
  throw new Error('Recipe editor must not keep the obsolete 16:9 cover frame.')
}
if (globalCss.includes('.recipes-empty-card span {')) {
  throw new Error('Recipe empty-card muted text selector is too broad and recolors primary-button labels.')
}
if (!globalCss.includes('.recipes-empty-card > div > span {')) {
  throw new Error('Recipe empty-card descriptive copy must use the narrowed SMART selector.')
}

const imageProcessor = await readFile('src/features/recipes/recipeImageProcessor.ts', 'utf8')
for (const marker of [
  "encodeExact(canvas, 'image/avif'",
  "encodeExact(canvas, 'image/webp'",
  'avifSupported === false',
  'RECIPE_COVER_MAX_LONG_EDGE = 1600',
]) {
  if (!imageProcessor.includes(marker)) throw new Error(`Recipe image processor marker missing: ${marker}`)
}
if (/upload|supabase|storage/i.test(imageProcessor)) {
  throw new Error('Image processor must process only; Storage stays in the Storage authority.')
}

const coverStorage = await readFile('src/features/recipes/recipeCoverStorage.ts', 'utf8')
for (const marker of [
  "RECIPE_IMAGE_BUCKET = 'recipe-images'",
  'recipe_image_cleanup_queue',
  'flushRecipeImageCleanupQueue',
  'queueRecipeCoverCleanup',
  'isRecipeCoverReferenced',
  '.createSignedUrl(',
]) {
  if (!coverStorage.includes(marker)) throw new Error(`Recipe cover Storage marker missing: ${marker}`)
}
if (coverStorage.includes('getPublicUrl')) throw new Error('Recipe covers must remain private.')
if (!coverStorage.includes('if (result.error)')) throw new Error('Recipe cleanup queue insertion errors must not be silently ignored.')

const recipesUiContract = await readFile('tests/RECIPES_UI_CONTRACT.md', 'utf8')
const recipeAuthoringContract = await readFile('tests/RECIPE_AUTHORING_CONTRACT.md', 'utf8')
const recipeSharedContract = await readFile('tests/RECIPE_SHARED_CORE_CONTRACT.md', 'utf8')
const recipeImageContract = await readFile('tests/RECIPE_IMAGE_CONTRACT.md', 'utf8')
const recipeToShoppingContract = await readFile('tests/RECIPE_TO_SHOPPING_CONTRACT.md', 'utf8')
const recipeSectionsContract = await readFile('tests/RECIPE_SECTIONS_CONTRACT.md', 'utf8')
const v3CloseoutContract = await readFile('tests/V3_CLOSEOUT_CONTRACT.md', 'utf8')
for (const [contract, markers] of [
  [v3CloseoutContract, ['No runtime or database compatibility authority remains', 'structured 14-argument', 'does not add', 'Recipe cookability matching']],
  [recipesUiContract, ['read surfaces', 'exactly one Recipe edit entry point', 'compact horizontal summary row', 'Ingredient count is not repeated', 'canonical Recipe matching state', 'Active Shopping is secondary procurement context', 'mandatory primary section', 'fast buttons/chips', 'no `Bez sekcji`', 'same dedicated bottom sheet/modal', 'nested forms are forbidden', 'Global Recipe Save is not disabled by Product Catalog loading', 'Escape from Ingredient Editor closes only Ingredient Editor']],
  [recipeAuthoringContract, ['One Recipe authoring draft', 'save_recipe_snapshot', 'Canceling the whole Recipe editor discards', 'optional preparation time', 'optional cooking/baking time', 'structured Recipe-local sections', 'primary `Główne`', 'RecipeIngredientEditorSheet', 'transactional with ingredient Apply', 'Final Recipe Save must not depend on Product Catalog loading']],
  [recipeSectionsContract, ['exactly one mandatory primary section', 'section_id', 'only Recipe section authority', 'legacy `recipe_ingredients.section_label` compatibility column no longer exists', 'fast button/chip choices', '`Bez sekcji` no longer exists', 'no independent `Dodaj sekcję` authority', 'Pending section creation and ingredient Apply commit together', 'does not perform Recipe matching']],
  [recipeSharedContract, ['canonical Product resolver/create authority', 'shared Quantity', 'must not globally rename', 'canonical Product UUID only', 'single pure cookability authority']],
  [recipeImageContract, ['full source image', 'pure crop geometry authority', 'RECIPE_COVER_HERO_ASPECT', 'must therefore match', 'Cleanup retries never block Recipe reading']],
  [recipeToShoppingContract, ['V5.2', 'same canonical Product + planned purchase unit', 'at-least purchase quantity', 'never with `Promise.all`', 'Ustaw sposób zakupu', 'Shopping never feeds back into Recipe cookability']],
]) {
  for (const marker of markers) {
    if (!contract.includes(marker)) throw new Error(`Current Recipe contract marker missing: ${marker}`)
  }
}

for (const marker of [
  '/* Recipes — current V3 architecture */',
  '.recipe-authoring-section',
  '.recipe-authoring-ingredient-row',
  '.recipe-focus-source-stage',
  '.recipe-servings-stepper',
  '.recipe-detail-timing',
  '.recipe-ingredient-index.is-inventory',
  '.recipe-ingredient-index.is-shopping',
  '.recipe-ingredient-index.is-missing',
  '.recipe-shopping-add-all',
  '.recipe-ingredient-shopping-action',
  '.recipe-shopping-feedback',
  '.recipe-time-fields',
  '.recipe-section-manager',
  '.recipe-section-choice',
  '.recipe-section-choice.is-active',
  '.recipe-section-inline-editor',
  '.recipe-ingredient-editor-backdrop',
  '.recipe-ingredient-editor-sheet',
  '.recipe-ingredient-editor-actions',
  '.recipes-search-empty',
]) {
  if (!globalCss.includes(marker)) throw new Error(`Current Recipe CSS marker missing: ${marker}`)
}
if (globalCss.includes('.recipe-detail-ingredient-count')) {
  throw new Error('V3.5.1 obsolete Recipe detail ingredient-count chip CSS must stay removed.')
}

for (const staleMarker of [
  '/* V3.2 — Recipes read model + navigation */',
  '/* V3.3 — Recipe CRUD + optimized cover image */',
  '/* V3.4 — Ingredient Editor + focal crop + cover cleanup polish */',
  '/* V3.4.1 — SMART Recipe cover corrective */',
]) {
  if (globalCss.includes(staleMarker)) throw new Error(`Superseded Recipe CSS block still exists: ${staleMarker}`)
}

const resourceContract = await readFile('tests/RESOURCE_SEMANTICS_CONTRACT.md', 'utf8')
for (const marker of ['Przyprawy', 'Domowe', 'presence-only', 'Household Products', 'no Recipe sufficiency']) {
  if (!resourceContract.includes(marker)) throw new Error(`V3.8 resource contract marker missing: ${marker}`)
}

for (const marker of ['recipeEligible', 'inventoryTrackingMode']) {
  if (!inventoryReadModel.includes(marker)) throw new Error(`V3.8 Inventory read model Product-role marker missing: ${marker}`)
}
for (const marker of ['ProductResourceRolePicker', 'isPresenceMode', 'isHouseholdMode', 'setCanonicalProductResourceRole']) {
  if (!editor.includes(marker)) throw new Error(`V3.8 Inventory editor marker missing: ${marker}`)
}
if (!editor.includes("!isPresenceMode &&") || !editor.includes('Przyprawy') || !editor.includes('Domowe')) {
  throw new Error('V3.8 mobile Inventory editor must hide quantitative actions for spices and preserve special-section semantics.')
}
if (!recipeEditor.includes('products.filter((product) => product.recipeEligible)')) {
  throw new Error('V3.8 Recipe authoring must filter out Recipe-ineligible Household Products.')
}
if (!recipeMutations.includes('if (!product.recipeEligible)')) {
  throw new Error('V3.8 Recipe client mutation must guard Recipe-ineligible Product identities.')
}
for (const marker of ['.product-role-picker', '.quantity-pill-presence', '.location-mark-spices', '.location-mark-household']) {
  if (!globalCss.includes(marker)) throw new Error(`V3.8 resource UI CSS marker missing: ${marker}`)
}

const specialResourceCreateContract = await readFile('tests/SPECIAL_RESOURCE_CREATE_CONTRACT.md', 'utf8')
for (const marker of [
  'stable **target role**',
  'set_product_resource_semantics(...)',
  'add_inventory_lot(...)',
  'No new spice-specific or household-specific Inventory save function exists',
  'SMART normal-state rule',
]) {
  if (!specialResourceCreateContract.includes(marker)) {
    throw new Error(`V3.8.2 special-resource create contract marker missing: ${marker}`)
  }
}

const createIntent = await readFile('src/features/inventory/inventoryCreateIntent.ts', 'utf8')
for (const marker of ['targetRole', 'selectedProductRole', 'roleMismatch']) {
  if (!createIntent.includes(marker)) throw new Error(`V3.8.2 create-intent marker missing: ${marker}`)
}
for (const marker of [
  'resolveInventoryCreateIntent',
  'createRoleMismatch',
  'handleCreateRoleConversion',
  'setCanonicalProductResourceRole',
  'requestedCreateRole',
]) {
  if (!editor.includes(marker)) throw new Error(`V3.8.2 InventoryEditor marker missing: ${marker}`)
}
if (editor.includes("const activeRole = activeProduct ? productResourceRoleFromSemantics(activeProduct) : requestedCreateRole")) {
  throw new Error('V3.8.2 must not let an exact Product silently override the create target role.')
}
if (!globalCss.includes('.inventory-role-mismatch-card')) {
  throw new Error('V3.8.2 mobile role-mismatch card CSS is missing.')
}
if (editor.includes('inventory-resource-role-card') || editor.includes('inventory-fixed-location')) {
  throw new Error('V3.8.3 SMART UI must not render redundant normal-state role/section summary cards in InventoryEditor.')
}
if (globalCss.includes('.inventory-resource-role-card') || globalCss.includes('.inventory-fixed-location')) {
  throw new Error('V3.8.3 obsolete normal-state role/section summary CSS must be removed.')
}

const uiContract = await readFile('tests/UI_CONTRACT.md', 'utf8')
for (const marker of ['SMART UI', 'normal valid state stays visually quiet', 'do not repeat context']) {
  if (!uiContract.includes(marker)) throw new Error(`SMART UI contract marker missing: ${marker}`)
}

const persistentResourcesContract = await readFile('tests/PERSISTENT_RESOURCES_CONTRACT.md', 'utf8')
for (const marker of ['Mam', 'Brak', 'minimum_stock_quantity', 'ensure_active_shopping_product(...)', 'set_spice_presence(...)', 'adjust_household_stock(...)', 'SMART UI']) {
  if (!persistentResourcesContract.includes(marker)) throw new Error(`V3.8.4 persistent-resource contract marker missing: ${marker}`)
}

const resourceMutations = await readFile('src/features/inventory/resourceMutations.ts', 'utf8')
for (const marker of ["rpc('set_spice_presence'", "rpc('adjust_household_stock'"]) {
  if (!resourceMutations.includes(marker)) throw new Error(`V3.8.4 resource mutation authority marker missing: ${marker}`)
}
if (!shoppingMutations.includes("rpc('ensure_active_shopping_product'")) {
  throw new Error('V3.8.4 automatic replenishment must use the shared idempotent Shopping ensure authority.')
}

const compactStepper = await readFile('src/features/quantity/CompactQuantityStepper.tsx', 'utf8')
const quickQuantity = await readFile('src/features/inventory/quickQuantity.ts', 'utf8')
const quickQuantityContract = await readFile('tests/INVENTORY_QUICK_QUANTITY_CONTRACT.md', 'utf8')
for (const marker of ['compact-quantity-stepper', 'onDecrement', 'onIncrement']) {
  if (!compactStepper.includes(marker)) throw new Error(`V5.3.1 compact stepper marker missing: ${marker}`)
}
for (const marker of ['count', 'package', 'jar', 'bottle', 'can', 'sachet']) {
  if (!quickQuantity.includes(marker)) throw new Error(`V5.3.1 quick quantity family marker missing: ${marker}`)
}
if (!mutations.includes("rpc('adjust_inventory_lot_quantity'")) {
  throw new Error('V5.3.1 ordinary Inventory quick adjustment must use its exact-lot RPC authority.')
}
for (const marker of ['CompactQuantityStepper', 'onAdjustInventoryLot', 'canQuickIncrementInventoryLot']) {
  if (!inventoryPage.includes(marker)) throw new Error(`V5.3.1 Inventory UI marker missing: ${marker}`)
}
for (const marker of ['Użyj także jako domyślnej zawartości produktu', 'canSeedProductDefaultFromLot']) {
  if (!editor.includes(marker)) throw new Error(`V5.3.1 legacy Product-default assist marker missing: ${marker}`)
}
for (const marker of ['adjust_inventory_lot_quantity(...)', 'Domowe', 'Shopping boundary']) {
  if (!quickQuantityContract.includes(marker)) throw new Error(`V5.3.1 contract marker missing: ${marker}`)
}
for (const marker of ['spiceResources', 'householdResources', 'sumQuantities', 'resourceProducts']) {
  if (!inventoryReadModel.includes(marker)) throw new Error(`V3.8.4 persistent read-model marker missing: ${marker}`)
}
for (const marker of ["resource.present ? 'Mam' : 'Brak'", 'onAdjustHousehold(resource, -1)', 'onAdjustHousehold(resource, 1)', 'HouseholdMinimumSheet', 'isHouseholdLowStock']) {
  if (!inventoryPage.includes(marker)) throw new Error(`V3.8.4 mobile resource UI marker missing: ${marker}`)
}
for (const marker of ['Do uzupełnienia', 'Na liście', 'ensureActiveShoppingProduct', 'isHouseholdLowStock']) {
  if (!homePage.includes(marker)) throw new Error(`V3.8.4 SMART Home replenishment marker missing: ${marker}`)
}
for (const marker of ['.spice-presence-button', '.compact-quantity-stepper', '.home-low-stock', '.household-minimum-sheet']) {
  if (!globalCss.includes(marker)) throw new Error(`V3.8.4 resource UI CSS marker missing: ${marker}`)
}

await execFileAsync(process.execPath, ['scripts/test-resource-semantics.mjs'])
await execFileAsync(process.execPath, ['scripts/test-inventory-create-intent.mjs'])
await execFileAsync(process.execPath, ['scripts/test-persistent-resources.mjs'])
await execFileAsync(process.execPath, ['scripts/test-inventory-quick-quantity.mjs'])

console.log('Kitchen project contract verification: PASS')
