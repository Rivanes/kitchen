import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const appShell = await readFile('src/components/AppShell.tsx', 'utf8')
const assistantSheet = await readFile('src/features/voice/VoiceAssistantSheet.tsx', 'utf8')
const context = await readFile('src/features/voice/voiceKitchenContext.ts', 'utf8')
const assistant = await readFile('src/features/voice/voiceReadOnlyAssistant.ts', 'utf8')
const matcher = await readFile('src/features/voice/voiceTextMatch.ts', 'utf8')
const speech = await readFile('src/features/voice/browserSpeechOutput.ts', 'utf8')
const provider = await readFile('src/features/voice/voiceSttProvider.ts', 'utf8')
const css = await readFile('src/styles/global.css', 'utf8')
const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const contract = await readFile('tests/VOICE_READ_ONLY_FOUNDATION_CONTRACT.md', 'utf8')

assert.equal(packageJson.scripts['test:voice-readonly'], 'node scripts/test-voice-readonly-foundation.mjs')
assert.match(appShell, /lazy\(\(\) => import\('\.\.\/features\/voice\/VoiceAssistantSheet'\)/)
assert.match(appShell, /className="voice-launch-button"/)
assert.match(appShell, /aria-label="Otwórz Kitchen Voice"/)
assert.match(appShell, /onOpenRecipe={openRecipeFromVoice}/)
assert.match(assistantSheet, /Ta wersja niczego nie zmienia/)
assert.match(assistantSheet, /loadVoiceKitchenContext\(ownerId\)/)
assert.match(assistantSheet, /answerReadOnlyKitchenQuery/)
assert.match(assistantSheet, /Usłyszałem/)
assert.match(assistantSheet, /Możesz też wpisać pytanie/)
assert.match(assistantSheet, /stopRecordingAndAskRef\.current\(\)/)
assert.match(context, /loadRecipesReadModel/)
assert.match(context, /loadShoppingReadModel/)
assert.doesNotMatch(context, /supabase\/client|\.from\(\s*['"]|\.rpc\(\s*['"]/)
assert.doesNotMatch(assistant, /inventoryMutations|shoppingMutations|recipeMutations|resourceMutations|productCatalogMutations|supabase\/client|\.from\(\s*['"]|\.rpc\(\s*['"]/)
assert.doesNotMatch(assistantSheet, /inventoryMutations|shoppingMutations|recipeMutations|resourceMutations|productCatalogMutations|supabase\/client|\.from\(\s*['"]|\.rpc\(\s*['"]/)
assert.match(assistant, /matchRecipe/)
assert.match(assistant, /sumQuantities/)
assert.match(matcher, /resolveVoiceEntity/)
assert.match(speech, /SpeechOutputAdapter/)
assert.match(speech, /pl-PL/)
assert.match(provider, /createVoiceSpeechToTextAdapter/)
assert.match(provider, /VOICE_READONLY_STT_BACKEND/)
for (const marker of ['.voice-launch-button', '.voice-assistant-sheet', '.voice-conversation', '.voice-microphone-button']) {
  assert.match(css, new RegExp(marker.replace('.', '\\.')))
}
for (const marker of ['read-only', 'no business mutation', 'existing read models', 'STT provider boundary']) {
  assert.match(contract, new RegExp(marker, 'i'))
}

const executable = String.raw`
import assert from 'node:assert/strict'
import { answerReadOnlyKitchenQuery, classifyReadOnlyVoiceIntent } from './src/features/voice/voiceReadOnlyAssistant.ts'
import { phraseSimilarity } from './src/features/voice/voiceTextMatch.ts'

const units = [
  { code: 'pcs', labelPl: 'sztuka', symbol: 'szt.', family: 'count', sortOrder: 1, toBaseFactor: 1 },
  { code: 'l', labelPl: 'litr', symbol: 'l', family: 'volume', sortOrder: 2, toBaseFactor: 1 },
]
const products = [
  { id: 'milk', name: 'Mleko', defaultUnitCode: 'l', packageContentValue: null, packageContentUnitCode: null, recipeEligible: true, inventoryTrackingMode: 'quantity', minimumStockQuantity: null },
  { id: 'eggs', name: 'Jajka', defaultUnitCode: 'pcs', packageContentValue: null, packageContentUnitCode: null, recipeEligible: true, inventoryTrackingMode: 'quantity', minimumStockQuantity: null },
  { id: 'passata', name: 'Passata Mutti', defaultUnitCode: 'pcs', packageContentValue: null, packageContentUnitCode: null, recipeEligible: true, inventoryTrackingMode: 'quantity', minimumStockQuantity: null },
  { id: 'pepper', name: 'Pieprz', defaultUnitCode: 'pcs', packageContentValue: null, packageContentUnitCode: null, recipeEligible: true, inventoryTrackingMode: 'presence', minimumStockQuantity: null },
]
const fridge = { id: 'fridge', slug: 'fridge', name: 'Lodówka', kind: 'fridge', sortOrder: 1 }
const spices = { id: 'spices', slug: 'spices', name: 'Przyprawy', kind: 'spices', sortOrder: 2 }
const milkLot = { id: 'milk-lot', productId: 'milk', productName: 'Mleko', storageLocationId: 'fridge', quantity: 2, unitCode: 'l', unitSymbol: 'l', unitFamily: 'volume', packageContentValue: null, packageContentUnitCode: null, packageContentUnitSymbol: null, recipeEligible: true, inventoryTrackingMode: 'quantity', expiryDate: null, afterOpenDays: null, openedAt: null, openedUseByDate: null }
const eggLot = { id: 'egg-lot', productId: 'eggs', productName: 'Jajka', storageLocationId: 'fridge', quantity: 6, unitCode: 'pcs', unitSymbol: 'szt.', unitFamily: 'count', packageContentValue: null, packageContentUnitCode: null, packageContentUnitSymbol: null, recipeEligible: true, inventoryTrackingMode: 'quantity', expiryDate: null, afterOpenDays: null, openedAt: null, openedUseByDate: null }
const passataLot = { id: 'passata-lot', productId: 'passata', productName: 'Passata Mutti', storageLocationId: 'fridge', quantity: 1, unitCode: 'pcs', unitSymbol: 'szt.', unitFamily: 'count', packageContentValue: null, packageContentUnitCode: null, packageContentUnitSymbol: null, recipeEligible: true, inventoryTrackingMode: 'quantity', expiryDate: null, afterOpenDays: null, openedAt: null, openedUseByDate: null }
const pepperResource = { product: products[3], quantity: 1, unitCode: 'pcs', unitSymbol: 'szt.', present: true }

const lasagne = {
  id: 'lasagne', name: 'Lasagne', categoryCode: 'lunch', servings: 4, prepTimeMinutes: 20, cookTimeMinutes: 45,
  instructions: 'Przygotuj składniki i zapiecz całość.', coverImagePath: null, coverImageUrl: null, coverFocusX: 0.5, coverFocusY: 0.5, updatedAt: '2026-10-01T00:00:00Z',
  sections: [{ id: 's1', name: 'Główne', sortOrder: 0, isPrimary: true }],
  ingredients: [
    { id: 'i1', productId: 'milk', productName: 'Mleko', quantity: 1, unitCode: 'l', unitSymbol: 'l', packageContentValue: null, packageContentUnitCode: null, sortOrder: 0, sectionId: 's1', note: null, presence: 'inventory' },
    { id: 'i2', productId: 'passata', productName: 'Passata Mutti', quantity: 1, unitCode: 'pcs', unitSymbol: 'szt.', packageContentValue: null, packageContentUnitCode: null, sortOrder: 1, sectionId: 's1', note: null, presence: 'inventory' },
  ],
}
const omlet = {
  id: 'omlet', name: 'Omlet', categoryCode: 'breakfast', servings: 1, prepTimeMinutes: 5, cookTimeMinutes: 5,
  instructions: 'Roztrzep jajka i usmaż.', coverImagePath: null, coverImageUrl: null, coverFocusX: 0.5, coverFocusY: 0.5, updatedAt: '2026-10-02T00:00:00Z',
  sections: [{ id: 's2', name: 'Główne', sortOrder: 0, isPrimary: true }],
  ingredients: [
    { id: 'i3', productId: 'eggs', productName: 'Jajka', quantity: 2, unitCode: 'pcs', unitSymbol: 'szt.', packageContentValue: null, packageContentUnitCode: null, sortOrder: 0, sectionId: 's2', note: null, presence: 'inventory' },
  ],
}

const inventory = {
  locations: [fridge, spices], products, units,
  groups: [
    { location: fridge, lots: [milkLot, eggLot, passataLot], resources: [] },
    { location: spices, lots: [], resources: [pepperResource] },
  ],
  totalLots: 3, totalDisplayItems: 4, stockedProducts: 3, resourceProducts: 4, occupiedLocations: 2,
}
const context = {
  loadedAt: '2026-10-08T00:00:00Z',
  recipes: { recipes: [lasagne, omlet], inventory, activeShoppingItems: [] },
  shopping: {
    activeItems: [{ id: 'shop1', productId: 'milk', name: 'Mleko', quantity: 1, unitCode: 'l', unitSymbol: 'l', isPurchased: false, purchasedAt: null, createdAt: '2026-10-08T00:00:00Z' }],
    purchasedItems: [], products, units,
  },
}

assert.equal(classifyReadOnlyVoiceIntent('Ile mam mleka?'), 'inventory-product')
assert.equal(classifyReadOnlyVoiceIntent('Co mam w lodówce?'), 'inventory-location')
assert.equal(classifyReadOnlyVoiceIntent('Czy mam wszystko do lasagne?'), 'recipe-availability')
assert.ok(phraseSimilarity('Mleko', 'ile mam mleka') > 0.7)
assert.ok(phraseSimilarity('Jajka', 'co mogę ugotować z jajek') > 0.7)

const milk = answerReadOnlyKitchenQuery(context, 'Ile mam mleka?')
assert.equal(milk.intent, 'inventory-product')
assert.match(milk.text, /2 l/)
assert.match(milk.text, /Lodówka/)

const fridgeAnswer = answerReadOnlyKitchenQuery(context, 'Co mam w lodówce?')
assert.equal(fridgeAnswer.intent, 'inventory-location')
assert.ok(fridgeAnswer.details.some((line) => line.includes('Mleko')))
assert.ok(fridgeAnswer.details.some((line) => line.includes('Jajka')))

const shopping = answerReadOnlyKitchenQuery(context, 'Co jest na liście zakupów?')
assert.equal(shopping.intent, 'shopping-list')
assert.match(shopping.spokenText, /Mleko/)

const recipe = answerReadOnlyKitchenQuery(context, 'Pokaż przepis na lasagne')
assert.equal(recipe.intent, 'recipe-summary')
assert.equal(recipe.action.recipeId, 'lasagne')

const ingredients = answerReadOnlyKitchenQuery(context, 'Składniki do lasagne')
assert.equal(ingredients.intent, 'recipe-ingredients')
assert.ok(ingredients.details.some((line) => line.includes('Passata Mutti')))

const availability = answerReadOnlyKitchenQuery(context, 'Czy mam wszystko do lasagne?')
assert.equal(availability.intent, 'recipe-availability')
assert.match(availability.spokenText, /Masz wszystko/)

const cookable = answerReadOnlyKitchenQuery(context, 'Co mogę ugotować?')
assert.equal(cookable.intent, 'cookable-recipes')
assert.ok(cookable.details.includes('Lasagne'))
assert.ok(cookable.details.includes('Omlet'))

const withEggs = answerReadOnlyKitchenQuery(context, 'Co mogę ugotować z jajek?')
assert.equal(withEggs.intent, 'cookable-with-product')
assert.ok(withEggs.details.includes('Omlet'))
`

execFileSync(
  process.execPath,
  ['--no-warnings', '--experimental-strip-types', '--input-type=module', '--eval', executable],
  { cwd: process.cwd(), stdio: 'pipe' },
)

console.log('V6.1B-RO Kitchen Voice read-only foundation contract: PASS')
