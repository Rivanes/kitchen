import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'

const appShell = await readFile('src/components/AppShell.tsx', 'utf8')
const page = await readFile('src/features/voice/VoiceSttSpikePage.tsx', 'utf8')
const adapter = await readFile('src/features/voice/transformersLocalSttAdapter.ts', 'utf8')
const worker = await readFile('src/features/voice/localStt.worker.ts', 'utf8')
const capture = await readFile('src/features/voice/audioCapture.ts', 'utf8')
const types = await readFile('src/features/voice/localSttTypes.ts', 'utf8')
const metrics = await readFile('src/features/voice/voiceSpikeMetrics.ts', 'utf8')
const worklet = await readFile('public/voice/pcm-recorder-worklet.js', 'utf8')
const css = await readFile('src/styles/global.css', 'utf8')
const vite = await readFile('vite.config.ts', 'utf8')
const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const contract = await readFile('tests/VOICE_LOCAL_STT_SPIKE_CONTRACT.md', 'utf8')

assert.equal(packageJson.dependencies['@huggingface/transformers'], '4.3.0')
assert.equal(packageJson.scripts['test:voice-stt-spike'], 'node scripts/test-voice-stt-spike.mjs')
assert.match(appShell, /get\('voice-spike'\) === '1'/)
assert.match(appShell, /lazy\(\(\) => import\('\.\.\/features\/voice\/VoiceSttSpikePage'\)/)
assert.match(page, /Diagnostyka tylko do testu telefonu/)
assert.match(page, /Audio nie jest zapisywane ani wysyłane do Supabase/)
assert.match(page, /POLISH_VOICE_SPIKE_PHRASES/)
assert.match(adapter, /new Worker\(new URL\('\.\/localStt\.worker\.ts'/)
assert.match(types, /interface LocalSpeechToTextAdapter/)
assert.match(worker, /onnx-community\/whisper-tiny/)
assert.match(worker, /ff4177021cc41f7db950912b73ea4fdf7d01d8e7/)
assert.match(worker, /language: 'polish'/)
assert.match(worker, /task: 'transcribe'/)
assert.match(worker, /device: 'wasm'/)
assert.match(worker, /dtype: 'q8'/)
assert.match(worker, /device: 'webgpu'/)
assert.match(worker, /encoder_model: 'fp16'/)
assert.match(worker, /env\.useBrowserCache = true/)
assert.match(worker, /env\.useWasmCache = true/)
assert.match(capture, /getUserMedia/)
assert.match(capture, /typeof navigator\.mediaDevices\?\.getUserMedia === 'function'/)
assert.match(capture, /isAudioWorkletSupported/)
assert.doesNotMatch(capture, /&& navigator\.mediaDevices\?\.getUserMedia/)
assert.match(adapter, /isGetUserMediaSupported/)
assert.match(adapter, /isAudioWorkletSupported/)
assert.doesNotMatch(adapter, /Boolean\(navigator\.mediaDevices\?\.getUserMedia\)/)
assert.match(capture, /AudioWorkletNode/)
assert.match(capture, /WHISPER_SAMPLE_RATE = 16_000/)
assert.match(capture, /VOICE_SPIKE_MAX_DURATION_MS = 10_000/)
assert.match(worklet, /registerProcessor\('kitchen-pcm-recorder'/)
assert.match(vite, /globIgnores:[\s\S]*localStt\.worker[\s\S]*\*\.wasm/)
assert.match(css, /\.voice-spike-page/)
assert.match(metrics, /Dodaj dwa opakowania mleka do lodówki\./)
assert.match(metrics, /Jedno opakowanie ma czterysta gramów\./)
for (const marker of ['zero Kitchen business mutations', '10 seconds', 'model cache', 'real target phone']) {
  assert.match(contract, new RegExp(marker, 'i'))
}

const voiceFiles = (await readdir('src/features/voice')).filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
for (const name of voiceFiles) {
  const source = await readFile(`src/features/voice/${name}`, 'utf8')
  assert.doesNotMatch(source, /lib\/supabase|supabase\/client|inventoryMutations|shoppingMutations|recipeMutations|productCatalogMutations/,
    `V6.1A Voice spike must not import Kitchen write authorities: ${name}`)
  assert.doesNotMatch(source, /functions\.invoke|openai|api\.openai|edge function/i,
    `V6.1A Voice spike must remain local-only: ${name}`)
}

const executable = String.raw`
import assert from 'node:assert/strict'
import { resampleLinear, flattenFloat32, getPeakAmplitude } from './src/features/voice/audioCapture.ts'

const first = new Float32Array([0, 0.5, -0.5])
const second = new Float32Array([1, -1])
assert.deepEqual(Array.from(flattenFloat32([first, second], 5)), [0, 0.5, -0.5, 1, -1])
assert.ok(Math.abs(getPeakAmplitude(new Float32Array([0.1, -0.8, 0.3])) - 0.8) < 1e-6)

const source = new Float32Array(48_000)
for (let i = 0; i < source.length; i += 1) source[i] = Math.sin(i / 30)
const downsampled = resampleLinear(source, 48_000, 16_000)
assert.equal(downsampled.length, 16_000)
assert.ok(Number.isFinite(downsampled[5_000]))

const sameRate = resampleLinear(new Float32Array([0.1, 0.2]), 16_000, 16_000)
assert.deepEqual(Array.from(sameRate), [0.10000000149011612, 0.20000000298023224])
assert.throws(() => resampleLinear(source, 0, 16_000))
`

execFileSync(
  process.execPath,
  ['--no-warnings', '--experimental-strip-types', '--input-type=module', '--eval', executable],
  { cwd: process.cwd(), stdio: 'pipe' },
)

console.log('V6.1A Local STT diagnostic spike contract: PASS')
