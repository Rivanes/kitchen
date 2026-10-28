import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const appShell = await readFile('src/components/AppShell.tsx', 'utf8')
const normalVoice = await readFile('src/features/voice/VoiceAssistantSheet.tsx', 'utf8')
const contextPage = await readFile('src/features/voice/contextSpike/VoiceContextEvaluationSpikePage.tsx', 'utf8')
const classifier = await readFile('src/features/voice/context/hashedCharIntentClassifier.ts', 'utf8')
const phonetics = await readFile('src/features/voice/context/phoneticEntityEvidence.ts', 'utf8')
const engine = await readFile('src/features/voice/context/voiceContextEngine.ts', 'utf8')
const semantic = await readFile('src/features/voice/contextSpike/semanticEmbeddingBenchmark.ts', 'utf8')
const corpus = await readFile('src/features/voice/contextSpike/contextEvaluationCorpus.ts', 'utf8')
const runner = await readFile('src/features/voice/contextSpike/contextEvaluationRunner.ts', 'utf8')
const contract = await readFile('tests/VOICE_CONTEXT_EVALUATION_SPIKE_CONTRACT.md', 'utf8')
const vite = await readFile('vite.config.ts', 'utf8')
const packageJson = JSON.parse(await readFile('package.json', 'utf8'))

assert.equal(packageJson.scripts['test:voice-context-spike'], 'node scripts/test-voice-context-evaluation.mjs')
assert.match(appShell, /voice-context-spike/)
assert.match(appShell, /VoiceContextEvaluationSpikePage/)
assert.match(appShell, /ownerId={user\.id}/)
assert.match(normalVoice, /interpretAndAnswerReadOnlyKitchen/)
assert.doesNotMatch(normalVoice, /DistilUseSemanticBenchmark|semanticEmbeddingBenchmark/)
assert.match(contextPage, /Ten ekran niczego nie zapisuje/)
assert.match(contextPage, /Uruchom benchmark ~135 MB/)
assert.match(contextPage, /Kopiuj JSON/)
assert.match(classifier, /class HashedCharIntentClassifier/)
assert.match(classifier, /NGRAM_MIN = 2/)
assert.match(phonetics, /phoneticPhraseSimilarity/)
assert.match(phonetics, /resolveContextEntity/)
assert.doesNotMatch(phonetics, /lasagne\s*[:=]|lazania\s*[:=]|lasania\s*[:=]/i)
assert.match(engine, /KitchenVoiceContextEngine/)
assert.match(engine, /activeRecipeId/)
assert.match(engine, /activeProductId/)
assert.match(semantic, /Xenova\/distiluse-base-multilingual-cased-v2/)
assert.match(semantic, /cad454171d918d9873a2701ba245054b6c1760dd/)
assert.match(semantic, /dtype: SEMANTIC_BENCHMARK_DTYPE/)
assert.match(semantic, /await import\('@huggingface\/transformers'\)/)
assert.doesNotMatch(vite, /distiluse-base-multilingual-cased-v2|multilingual-e5|MiniLM/)
assert.match(corpus, /I lebałam rzeczy na liście\./)
// Regression for GitHub QA #101 TS2339: not every initial evaluation turn has an `entity` property.
assert.match(runner, /'entity' in sequence\.initial/)
assert.doesNotMatch(runner, /sequence\.initial\.entity\?\./)
for (const forbidden of [
  'inventoryMutations',
  'shoppingMutations',
  'recipeMutations',
  'resourceMutations',
  'productCatalogMutations',
  "supabase/client",
  '.rpc(',
]) {
  assert.doesNotMatch(`${contextPage}\n${classifier}\n${phonetics}\n${engine}\n${semantic}`, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
for (const marker of ['diagnostic only', 'no production integration', 'held-out', 'real phone', 'no business writes']) {
  assert.match(contract, new RegExp(marker, 'i'))
}

const executable = String.raw`
import assert from 'node:assert/strict'
import { runLocalContextEvaluation } from './src/features/voice/contextSpike/contextEvaluationRunner.ts'
import { phoneticPhraseSimilarity } from './src/features/voice/context/phoneticEntityEvidence.ts'

const report = runLocalContextEvaluation()
assert.ok(report.micro.accuracy > report.literal.accuracy + 0.25, 'Micro classifier must materially beat literal baseline.')
assert.equal(report.actualPhoneCaseRecovered, true, 'Real iPhone shopping-list transcript must be recovered without transcript mapping.')
assert.equal(report.writeShapedNoiseRejected, true, 'Read-only Context Engine must reject write-shaped STT noise.')
assert.equal(report.entity.passed, report.entity.total, 'All entity evaluation cases must pass.')
assert.equal(report.context.passed, report.context.total, 'All multi-turn context evaluation sequences must pass.')
assert.ok(report.rows.every((row) => row.microCorrect), 'Held-out non-context micro classifier cases must pass in this frozen evaluation corpus.')
assert.ok(phoneticPhraseSimilarity('Lasagne', 'lazania') >= 0.8, 'General phonetic signal should bridge Lasagne/lazania without a word mapping.')
const ambiguity = report.entity.rows.find((row) => row.id === 'ambiguous-lasagne')
assert.equal(ambiguity?.actualDecision, 'clarify')
const missing = report.entity.rows.find((row) => row.id === 'missing-recipe')
assert.equal(missing?.actualDecision, 'missing')
`

execFileSync(
  process.execPath,
  ['--no-warnings', '--experimental-strip-types', '--input-type=module', '--eval', executable],
  { cwd: process.cwd(), stdio: 'pipe' },
)

console.log('V6.1B-RO.2A Context Engine Evaluation Spike contract: PASS')
