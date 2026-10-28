import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const bridge = await readFile('src/features/voice/voiceContextReadOnlyBridge.ts', 'utf8')
const sheet = await readFile('src/features/voice/VoiceAssistantSheet.tsx', 'utf8')
const contextEngine = await readFile('src/features/voice/context/voiceContextEngine.ts', 'utf8')
const assistant = await readFile('src/features/voice/voiceReadOnlyAssistant.ts', 'utf8')
const training = await readFile('src/features/voice/context/voiceIntentTraining.ts', 'utf8')
const diagnostic = await readFile('src/features/voice/contextSpike/contextEvaluationCorpus.ts', 'utf8')
const contract = await readFile('tests/VOICE_CONTEXT_PRODUCTION_CONTRACT.md', 'utf8')

assert.match(sheet, /interpretAndAnswerReadOnlyKitchen/)
assert.match(sheet, /Zrozumiałem:/)
assert.match(sheet, /setLastTranscript\(transcript\)/)
assert.match(sheet, /useState\(createKitchenVoiceContextEngine\)/)
assert.match(sheet, /conversationStateRef\.current = result\.nextConversation/)
assert.match(sheet, /chooseCanonicalRead\(choice\.query, choice\.confirmedTarget\)/)
assert.match(bridge, /interpretation\.entity\.id/)
assert.match(bridge, /answerReadOnlyKitchenQuery\(input\.context, input\.rawText, resolved\)/)
assert.match(bridge, /confidence < 0\.68/)
assert.match(bridge, /appearsToRequestWrite/)
assert.match(assistant, /recipeId !== undefined/)
assert.match(assistant, /productId !== undefined/)
assert.match(assistant, /locationId !== undefined/)
assert.match(contextEngine, /KitchenVoiceContextEngine/)
assert.match(training, /VOICE_INTENT_TRAINING_EXAMPLES/)
assert.doesNotMatch(diagnostic, /export const VOICE_INTENT_TRAINING_EXAMPLES/)
assert.doesNotMatch(bridge + contextEngine + sheet, /DistilUseSemanticBenchmark|semanticEmbeddingBenchmark|\.from\(|\.rpc\(|supabase\/client|inventoryMutations|shoppingMutations|recipeMutations|resourceMutations|productCatalogMutations/)
for (const marker of ['read-only', 'canonical ID', 'confidence', 'no business writes', 'real phone']) {
  assert.match(contract, new RegExp(marker, 'i'))
}

const executable = String.raw`
import assert from 'node:assert/strict'
import { createKitchenVoiceContextEngine, interpretAndAnswerReadOnlyKitchen, confirmReadOnlyContextChoice } from './src/features/voice/voiceContextReadOnlyBridge.ts'
import { EMPTY_VOICE_CONVERSATION_STATE } from './src/features/voice/context/voiceContextEngine.ts'

const fridge = { id: 'fridge-id', name: 'Lodówka', kind: 'fridge' }
const freezer = { id: 'freezer-id', name: 'Zamrażarka', kind: 'freezer' }
const products = [
 { id: 'milk-id', name: 'Mleko', inventoryTrackingMode: 'quantity' },
 { id: 'eggs-id', name: 'Jajka', inventoryTrackingMode: 'quantity' },
]
const milk = { productId: 'milk-id', productName: 'Mleko', storageLocationId: fridge.id, quantity: 2,
  unitCode: 'l', unitSymbol: 'l', packageContentValue: null, packageContentUnitCode: null, packageContentUnitSymbol: null }
const eggs = { productId: 'eggs-id', productName: 'Jajka', storageLocationId: freezer.id, quantity: 5,
  unitCode: 'pcs', unitSymbol: 'szt.', packageContentValue: null, packageContentUnitCode: null, packageContentUnitSymbol: null }
const recipe = { id: 'lasagne-id', name: 'Lasagne', servings: 4, prepTimeMinutes: 10, cookTimeMinutes: 35,
  ingredients: [{id:'i1', productId:'milk-id', productName:'Mleko', quantity:1, unitCode:'l', unitSymbol:'l',
    packageContentValue:null,packageContentUnitCode:null}], instructions:'Upiecz lasagne.' }
const context = {
 loadedAt:'2026-10-28T00:00:00Z',
 recipes: { recipes:[recipe], inventory: {products, units:[],locations:[fridge,freezer],
  groups:[ {location:fridge,lots:[milk],resources:[]},{location:freezer,lots:[eggs],resources:[]}], stockedProducts:2 } },
 shopping: {activeItems:[{productId:'milk-id',name:'Mleko',quantity:1,unitSymbol:'l'}] },
}
const engine = createKitchenVoiceContextEngine()
let state = {...EMPTY_VOICE_CONVERSATION_STATE}
function ask(q, origin='speech') {
 const out = interpretAndAnswerReadOnlyKitchen({context,rawText:q,origin,conversation:state,engine})
 state = out.nextConversation
 return out
}
const location = ask('Co mam blodówce?')
assert.equal(location.interpretation.confidence > 0.68, true)
assert.equal(location.interpretation.entity?.id, fridge.id)
assert.equal(location.reply.title, 'Lodówka')
assert.ok(location.reply.details.some(x=>x.includes('Mleko')))
assert.ok(!location.reply.details.some(x=>x.includes('Jajka')))
const list = ask('I lebałam rzeczy na liście.')
assert.equal(list.reply.title, 'Zakupy')
assert.match(list.reply.spokenText, /Mleko/)
const ingredient = ask('Przez tego potrzebuję do lasami.')
assert.equal(ingredient.interpretation.entity?.id,recipe.id)
assert.match(ingredient.reply.title, /Składniki/)
assert.ok(ingredient.reply.details.some(x => x.includes('Mleko')))
const followup = ask('Czy mam wszystko?')
assert.equal(followup.interpretation.entity?.id, recipe.id)
assert.equal(followup.reply.intent, 'recipe-availability')
const unsure = ask('Pokaż lazanię')
assert.equal(unsure.interpretation.intent, 'recipe-summary')
assert.match(unsure.reply.title, /Dopytam/)
assert.equal(unsure.reply.choices?.[0]?.label,'Lasagne')
assert.equal(unsure.nextConversation.activeRecipeId,recipe.id)
const choice = unsure.reply.choices?.[0]
assert.ok(choice?.confirmedTarget, 'Confirmation must carry a bound canonical ID.')
const confirmed = confirmReadOnlyContextChoice({context,target:choice.confirmedTarget, query:choice.query,conversation:state})
assert.equal(confirmed.reply.action?.recipeId, recipe.id)
assert.equal(confirmed.nextConversation.activeRecipeId, recipe.id)
const forged = confirmReadOnlyContextChoice({context,target:{intent:'recipe-summary',entity:{kind:'recipe',id:'not-live'}},query:'Pokaż nieznany',conversation:state})
assert.equal(forged.reply.intent,'unknown')
assert.deepEqual(forged.nextConversation,state)
const write = ask('Dodaj dwa mleka do lodówki')
assert.equal(write.reply.intent,'unknown')
const weather = ask('Jaka jutro będzie pogoda?')
assert.equal(weather.reply.intent,'unknown')
// Explicit ID overrides are verified against live read data, never interpreted as new entities.
const missingId = ask('Czy mam wszystko do lasagne?')
assert.equal(missingId.reply.intent,'recipe-availability')
const unfamiliar = ask('Co mam w nieistniejącej lokalizacji?')
assert.notEqual(unfamiliar.reply.title, 'Nieznana lokalizacja')
console.log('Context production integration: noisy STT, live ID, context, confirmation, refusals PASS')
`
execFileSync(process.execPath, ['--no-warnings','--experimental-strip-types','--input-type=module','--eval', executable], { cwd:process.cwd(), stdio:'inherit' })
console.log('V6.1B-RO.2B contextual read-only integration contract: PASS')
