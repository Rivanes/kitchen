import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const file = (name) => readFile(name, 'utf8')
const [gate, hub, food, cleaning, flags, css, testContract] = await Promise.all([
  file('src/components/OwnerGate.tsx'),
  file('src/components/HomeHubShell.tsx'),
  file('src/components/AppShell.tsx'),
  file('src/features/cleaning/CleaningShell.tsx'),
  file('src/config/featureFlags.ts'),
  file('src/styles/global.css'),
  file('tests/HOME_HUB_H1_CONTRACT.md'),
])

// Existing auth/owner authority stays ABOVE both module shells.
assert.match(gate, /supabase\.rpc\('is_kitchen_owner'\)/)
assert.match(gate, /status === 'allowed'[\s\S]*<HomeHubShell user=\{user\}/)
assert.doesNotMatch(hub, /from ['"]\.{1,2}\/features\/inventory\/|from ['"]\.{1,2}\/features\/shopping\/|from ['"]\.{1,2}\/features\/recipes\//)
assert.match(hub, /useState<HomeModule>\('hub'\)/)
assert.match(hub, /module === 'food'[\s\S]*<AppShell user=\{user\} onExit=\{returnHome\}/)
assert.match(hub, /module === 'cleaning'[\s\S]*<CleaningShell onExit=\{returnHome\}/)
for (const marker of ['Jedzenie', 'Porządki', 'home-hub-food', 'home-hub-cleaning', "setModule('hub')"]) {
  assert.ok(hub.includes(marker), `Missing Hub marker: ${marker}`)
}
assert.match(hub, /<button[^>]*onClick=\{\(\) => openModule\('food'\)\}/)
assert.match(hub, /<button[^>]*onClick=\{\(\) => openModule\('cleaning'\)\}/)

// Food is preserved: existing navigation and token-based redirects, with a visible hub return.
for (const marker of ["view === 'home'", "view === 'expiry'", "view === 'inventory'", "view === 'shopping'", "view === 'recipes'", 'onOpenRecipe={openRecipeFromHome}', 'onCreateRequestHandled={handleInventoryCreateRequestHandled}', 'onExit']) {
  assert.ok(food.includes(marker), `Food behavior may be lost: ${marker}`)
}
for (const label of ['Start', 'Zapasy', 'Zakupy', 'Przepisy']) {
  assert.match(food, new RegExp(`<span>${label}</span>`))
}
assert.match(food, /className="module-home-button" onClick=\{onExit\}/)

// Cleaning is an honest navigation shell only; no fake tasks and no DB activity in H1.
assert.match(cleaning, /useState<CleaningView>\('start'\)/)
for (const view of ['start', 'rooms', 'schedule']) {
  assert.match(cleaning, new RegExp(`view === '${view}'`))
  assert.match(cleaning, new RegExp(`changeView\\('${view}'\\)`))
}
for (const label of ['Pomieszczenia', 'Harmonogram', 'Start', 'Nawigacja Porządki', 'Wróć do strony głównej Dom']) {
  assert.ok(cleaning.includes(label), `Missing Cleaning UI: ${label}`)
}
assert.doesNotMatch(cleaning, /supabase\.from\(|supabase\.rpc\(|insert\(|update\(|delete\(/)
assert.match(css, /\.cleaning-shell\s*\{[\s\S]*--color-accent-strong: #315c7c;/)
assert.match(css, /\.cleaning-bottom-nav\s*\{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
assert.match(css, /\.home-hub-modules\s*\{\s*display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(css, /--app-bottom-content-clearance: calc\(var\(--app-bottom-safe\) \+ var\(--app-bottom-nav-shell-height\) \+ 18px\)/)
assert.match(flags, /export const KITCHEN_VOICE_ENABLED = false\b/)
assert.match(testContract, /H1/)

console.log('Kitchen H1 Home Hub / Food / Cleaning source contract: PASS')
