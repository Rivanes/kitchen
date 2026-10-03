import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'

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
  'src/features/inventory/inventoryRpcResults.ts',
  'src/features/inventory/types.ts',
  'src/styles/global.css',
  'src/lib/supabase/client.ts',
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
  'src/features/products/productIdentity.ts',
  'src/features/products/productCatalogMutations.ts',
  'src/features/measurements/measurementUnits.ts',
  'src/features/quantity/quantity.ts',
  'src/features/quantity/QuantityStepperInput.tsx',
  'tests/SHOPPING_LIST_CONTRACT.md',
  'tests/PRODUCT_AUTOCOMPLETE_CONTRACT.md',
  'tests/PRODUCT_IDENTITY_CONTRACT.md',
  'tests/SHARED_CORE_CONSISTENCY_CONTRACT.md',
  'tests/INVENTORY_TO_SHOPPING_CONTRACT.md',
  'tests/QUANTITY_STEPPER_CONTRACT.md',
  'tests/SHOPPING_PURCHASED_STATE_CONTRACT.md',
  'tests/SHOPPING_PARTIAL_PURCHASE_CONTRACT.md',
  'tests/SHOPPING_TO_INVENTORY_CONTRACT.md',
  'tests/STORAGE_LOCATION_PICKER_CONTRACT.md',
  'tests/SHOPPING_QUICK_PURCHASE_CONTRACT.md',
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

if (!shell.includes("type AppView = 'home' | 'inventory' | 'expiry' | 'shopping'")) {
  throw new Error('V2.3 AppShell must expose Shopping as a first-class view.')
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

if (!/type=["']date["']/.test(editor) || !editor.includes('inventory-expiry') || !editor.includes('expiryDate: expiryDate || null')) {
  throw new Error('V1.6 editor must provide an optional date-only expiry field and persist it on create/edit.')
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

for (const marker of ['renameCanonicalProduct', 'product-rename-trigger', 'Zmień nazwę', 'Zapisz nazwę', 'Zmiana obejmie wszystkie partie tego produktu.', 'parseQuantityInput', 'getDefaultUnitCode']) {
  if (!editor.includes(marker)) {
    throw new Error(`V2.1 Product rename UI marker missing: ${marker}`)
  }
}
if (!editor.includes("mode.kind === 'edit' && !renameOpen") || !editor.includes('handleRenameSubmit')) {
  throw new Error('V2.1 rename must remain an explicit edit-only sub-flow, separate from Inventory-lot save.')
}

if (!editor.includes('ProductAutocompleteField') || !editor.includes('useProductAutocomplete')) {
  throw new Error('V2.3.1 Inventory create must use the shared Product autocomplete surface.')
}

for (const marker of ['seed?: InventoryCreateSeed', 'createHandler = createInventoryLot', 'createSeed?.productId ?? exactProduct?.id ?? null', 'inventory-create-seed-summary', 'Produkt i kupiona ilość pozostaną bez zmian.']) {
  if (!editor.includes(marker)) {
    throw new Error(`V2.6 reusable seeded Inventory create marker missing: ${marker}`)
  }
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
if (!sharedProductCatalog.includes(".update({ name: cleanName })") || !sharedProductCatalog.includes("result.error.code === '23505'")) {
  throw new Error('V2.3.3 shared Product rename must update the existing UUID in place and guard uniqueness races.')
}

const sharedQuantity = await readFile('src/features/quantity/quantity.ts', 'utf8')
for (const marker of ['parseQuantityInput', 'assertValidQuantity', 'readStoredQuantity', 'addQuantities', 'formatQuantity', 'MAX_QUANTITY', 'QUANTITY_DECIMAL_PLACES', 'DEFAULT_QUANTITY_STEP', 'stepQuantityInput', 'canStepQuantityInput', 'formatQuantityInput']) {
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
if (!inventoryPage.includes('group.lots.length >= 8')) {
  throw new Error('V1.5 location pages must keep contextual search for larger location inventories.')
}
if (!inventoryPage.includes('model.totalLots >= 8') || !inventoryPage.includes('Szukaj produktu lub miejsca w zapasach')) {
  throw new Error('V1.7 Zapasy overview must provide contextual cross-location search for larger inventories.')
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
if (!homePage.includes('Kitchen podpowie więcej') || !homePage.includes('Terminy ważności') || !homePage.includes('Co ugotować')) {
  throw new Error('V1.6.2 Start must keep SMART future previews and provide quick access to the Expiry Center.')
}
if (!homePage.includes('getInventoryExpiryMeta') || !homePage.includes('bez terminu') || !homePage.includes('onOpenExpiry')) {
  throw new Error('V1.6.2 Start must summarize urgent/missing expiry data and open the Expiry Center.')
}
if (/pozycj|occupiedLocations/.test(homePage)) {
  throw new Error('V1.6 Home must not expose technical Inventory counters such as positions or occupied locations.')
}
if (!homePage.includes('stockedProducts')) {
  throw new Error('V1.6 Home may keep one natural product-count summary.')
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
for (const marker of ['purchaseShoppingQuantity', 'restoreShoppingPurchase', "rpc('purchase_shopping_item'", "rpc('restore_shopping_purchase'", 'assertValidQuantity(input.quantity)', 'p_owner_id: input.ownerId']) {
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
for (const marker of ['Ile kupiono?', 'QuantityStepperInput', 'max={item.quantity}', 'purchaseShoppingQuantity', 'Zostanie do kupienia:', 'Cała pozycja trafi do „Kupione”.']) {
  if (!shoppingPurchaseSheet.includes(marker)) {
    throw new Error(`V2.5.1 partial-purchase sheet marker missing: ${marker}`)
  }
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
for (const marker of ['.quantity-stepper', '.quantity-stepper-button', 'grid-template-columns: 44px minmax(0, 1fr) 44px']) {
  if (!quantityStepperStyles.includes(marker)) {
    throw new Error(`V2.4.1 quantity stepper style marker missing: ${marker}`)
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
for (const marker of ['handleQuickPurchase', 'purchaseShoppingQuantity({', 'quantity: item.quantity', 'Zmień ilość', 'setPurchaseTarget(item)']) {
  if (!shoppingPageV262.includes(marker)) {
    throw new Error(`V2.6.2 Shopping quick-purchase marker missing: ${marker}`)
  }
}
if (shoppingPageV262.includes('onClick={() => setPurchaseTarget(item)}\n                      disabled={Boolean(updatingItemId)}\n                      aria-label={`Oznacz')) {
  throw new Error('V2.6.2 purchase check must not open the quantity sheet for the full-quantity fast path.')
}
for (const marker of ['.storage-location-picker', '.storage-location-option', '.shopping-active-row', '.shopping-partial-purchase-button']) {
  if (!globalCss.includes(marker)) {
    throw new Error(`V2.6.2 mobile interaction style marker missing: ${marker}`)
  }
}

console.log('Kitchen project contract verification: PASS')


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
