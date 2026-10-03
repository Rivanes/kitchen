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
  'src/features/inventory/InventoryEditor.tsx',
  'src/features/inventory/InventoryConsumeSheet.tsx',
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
for (const marker of ['--color-bg: #f7f7f2', '--touch-min: 48px', '.home-quick-action', '.home-coming-card', '.inventory-sheet', '.primary-icon-button', '.inventory-search', '.inventory-stock-actions', '.inventory-consume-sheet', '.danger-button', '.inventory-location-entry', '.inventory-location-page', '.inventory-back-button']) {
  if (!globalCss.includes(marker)) {
    throw new Error(`V1.3 UI contract marker missing: ${marker}`)
  }
}

const shell = await readFile('src/components/AppShell.tsx', 'utf8')
if (!shell.includes('aria-label="Główna nawigacja Kitchen"')) {
  throw new Error('Mobile application navigation is missing.')
}
if (!shell.includes('<HomePage ownerId={user.id} onAddProduct={openInventoryCreate} />')) {
  throw new Error('Start must use the contextual V1.3 HomePage.')
}
if (shell.includes('futureModules') || shell.includes('module-grid')) {
  throw new Error('Start must not duplicate bottom-navigation modules.')
}
if (!shell.includes('createRequestToken={inventoryCreateRequest}')) {
  throw new Error('Start quick-add must be able to open the Inventory create flow.')
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
if (!mutations.includes('findMergeableInventoryLot') || !mutations.includes(".is('expiry_date', null)")) {
  throw new Error('V1.3 merge behavior must remain intact in V1.4.')
}
if (!mutations.includes('consumeInventoryLot') || !mutations.includes('consumeAllInventoryLot') || !mutations.includes('removeInventoryLot')) {
  throw new Error('V1.4 must provide explicit consume and remove mutations.')
}
if (!mutations.includes(".from('inventory_items')") || !mutations.includes('.delete()')) {
  throw new Error('V1.4 depletion/removal must delete depleted or explicitly removed Inventory lots.')
}
if (!mutations.includes('consumeMilli === currentMilli') || !mutations.includes('consumeMilli > currentMilli')) {
  throw new Error('V1.4 consume logic must reject over-consumption and delete exact depletion.')
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

if (/type=["']date["']/.test(editor) || /expiry/i.test(editor)) {
  throw new Error('Expiry input/semantics remain reserved for V1.6.')
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
if (!inventoryPage.includes("initialLocationId: selectedGroup.location.id")) {
  throw new Error('V1.5 add-from-location flow must preselect the current storage location.')
}
if (inventoryPage.includes('inventory-summary')) {
  throw new Error('V1.5 must not restore the old three-counter Inventory summary.')
}
if (!inventoryPage.includes('<InventoryConsumeSheet') || !inventoryPage.includes('consumeLot')) {
  throw new Error('V1.4 Inventory page must wire the consume flow into the current stock lot.')
}

const consumeSheet = await readFile('src/features/inventory/InventoryConsumeSheet.tsx', 'utf8')
if (!consumeSheet.includes('Ile zużyto?') || !consumeSheet.includes('Zużyj wszystko') || !consumeSheet.includes('consumeInventoryLot') || !consumeSheet.includes('consumeAllInventoryLot')) {
  throw new Error('V1.4 consume sheet contract is incomplete.')
}
if (!consumeSheet.includes('quantityToUse > lot.quantity')) {
  throw new Error('V1.4 UI must reject consuming more than the visible lot quantity before mutation.')
}

const homePage = await readFile('src/features/home/HomePage.tsx', 'utf8')
if (!homePage.includes('Kitchen podpowie więcej') || !homePage.includes('Do zużycia') || !homePage.includes('Co ugotować')) {
  throw new Error('V1.3.2 Start must keep compact future SMART dashboard previews without duplicating navigation cards.')
}

console.log('Kitchen project contract verification: PASS')
