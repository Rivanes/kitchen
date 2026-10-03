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
  'src/features/inventory/ExpiryPage.tsx',
  'src/features/inventory/InventoryEditor.tsx',
  'src/features/inventory/InventoryConsumeSheet.tsx',
  'src/features/inventory/expiry.ts',
  'src/features/inventory/inventoryReadModel.ts',
  'src/features/inventory/inventoryMutations.ts',
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
for (const marker of ['--color-bg: #f7f7f2', '--touch-min: 48px', '.home-quick-action', '.home-coming-card', '.home-expiry-hub', '.expiry-page', '.expiry-filter', '.expiry-row', '.after-open-details', '.consume-open-rule', '.inventory-sheet', '.primary-icon-button', '.inventory-search', '.inventory-stock-actions', '.inventory-consume-sheet', '.danger-button', '.inventory-location-entry', '.inventory-location-page', '.inventory-back-button', '.expiry-status', '.date-input-row', 'max-height: calc(100dvh - 8px)', 'grid-template-columns: repeat(2, minmax(0, 1fr))']) {
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

const inventoryReadModel = await readFile('src/features/inventory/inventoryReadModel.ts', 'utf8')
for (const table of ['storage_locations', 'products', 'measurement_units', 'inventory_items']) {
  if (!inventoryReadModel.includes(`.from('${table}')`)) {
    throw new Error(`Inventory read model must read ${table}.`)
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
if (!mutations.includes(".from('products')") || !mutations.includes(".from('inventory_items')")) {
  throw new Error('V1.3 mutations must use canonical Products and Inventory items.')
}
if (!mutations.includes('.insert({') || !mutations.includes('.update({')) {
  throw new Error('V1.3 must support create and edit mutations.')
}
if (!mutations.includes(".eq('owner_id', input.ownerId)")) {
  throw new Error('V1.3 mutations must explicitly scope owner_id.')
}
if (!mutations.includes("productResult.error.code === '23505'")) {
  throw new Error('V1.3 must handle database duplicate Product identity safely.')
}
if (!mutations.includes('findMergeableInventoryLot') || !mutations.includes(".is('expiry_date', null)") || !mutations.includes(".eq('expiry_date', expiryDate)") || !mutations.includes(".is('opened_at', null)")) {
  throw new Error('V1.6.2 merge behavior must only combine unopened lots with identical expiry semantics.')
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

const editor = await readFile('src/features/inventory/InventoryEditor.tsx', 'utf8')
if (!editor.includes("mode.kind === 'create'") || !editor.includes("mode.kind === 'edit'")) {
  throw new Error('Inventory editor must support explicit create and edit modes.')
}
if (!editor.includes('inputMode="decimal"') || !editor.includes('model.units.map') || !editor.includes('model.locations.map')) {
  throw new Error('V1.3 editor must use validated quantity, controlled units and owner locations.')
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

console.log('Kitchen project contract verification: PASS')
