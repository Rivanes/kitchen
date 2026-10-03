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
  'src/features/inventory/InventoryPage.tsx',
  'src/features/inventory/inventoryReadModel.ts',
  'src/features/inventory/types.ts',
  'src/styles/global.css',
  'src/lib/supabase/client.ts',
  'tests/SECURITY_CONTRACT.md',
  'tests/UI_CONTRACT.md',
  'tests/INVENTORY_READ_CONTRACT.md',
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
  throw new Error('PWA theme color must use the V0.3 light mobile foundation.')
}

const globalCss = await readFile('src/styles/global.css', 'utf8')
if (!globalCss.includes('--color-bg: #f7f7f2') || !globalCss.includes('--touch-min: 48px')) {
  throw new Error('V0.3 light/mobile design tokens are missing.')
}
if (!globalCss.includes('.inventory-location-card') || !globalCss.includes('.inventory-summary')) {
  throw new Error('V1.2 Inventory mobile read styles are missing.')
}

const shell = await readFile('src/components/AppShell.tsx', 'utf8')
if (!shell.includes('aria-label="Główna nawigacja Kitchen"')) {
  throw new Error('Mobile application navigation is missing.')
}
if (!shell.includes('<InventoryPage ownerId={user.id} />')) {
  throw new Error('V1.2 must expose the owner-scoped Inventory read surface.')
}

const inventoryReadModel = await readFile('src/features/inventory/inventoryReadModel.ts', 'utf8')
for (const table of ['storage_locations', 'products', 'measurement_units', 'inventory_items']) {
  if (!inventoryReadModel.includes(`.from('${table}')`)) {
    throw new Error(`V1.2 Inventory read model must read ${table}.`)
  }
}
if (!inventoryReadModel.includes(".eq('owner_id', ownerId)")) {
  throw new Error('V1.2 owner-data reads must explicitly scope owner_id to the authenticated user.')
}
if (/\.(insert|update|upsert|delete)\s*\(/.test(inventoryReadModel)) {
  throw new Error('V1.2 Inventory read model must remain read-only.')
}

const inventoryPage = await readFile('src/features/inventory/InventoryPage.tsx', 'utf8')
if (!inventoryPage.includes("status: 'loading'") || !inventoryPage.includes("status: 'error'") || !inventoryPage.includes("status: 'ready'")) {
  throw new Error('V1.2 Inventory page must implement loading, error and ready states.')
}

console.log('Kitchen project contract verification: PASS')
