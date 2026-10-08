import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sheet = await readFile('src/features/voice/VoiceAssistantSheet.tsx', 'utf8')
const policy = await readFile('src/features/voice/voiceProductionCapturePolicy.ts', 'utf8')
const capture = await readFile('src/features/voice/audioCapture.ts', 'utf8')
const css = await readFile('src/styles/global.css', 'utf8')
const contract = await readFile('tests/VOICE_PUSH_TO_TALK_UI_CONTRACT.md', 'utf8')

for (const marker of [
  'onPointerDown={handlePointerDown}',
  'onPointerUp={handlePointerUp}',
  'onPointerCancel={handlePointerCancel}',
  'onLostPointerCapture={handleLostPointerCapture}',
  'onKeyDown={handleKeyDown}',
  'onKeyUp={handleKeyUp}',
  'setPointerCapture(event.pointerId)',
  'Przytrzymaj, aby mówić',
  'Słucham… Puść, aby wysłać',
  'voice-assistant-scroll',
  'voice-assistant-footer',
]) {
  assert.match(sheet, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}

assert.match(sheet, /VOICE_PRODUCT_MAX_DURATION_MS/)
assert.doesNotMatch(sheet, /VOICE_SPIKE_MAX_DURATION_MS/)
assert.match(policy, /VOICE_PRODUCT_MAX_DURATION_MS = 30_000/)
assert.match(policy, /VOICE_PRODUCT_MIN_UTTERANCE_MS = 300/)
assert.match(capture, /VOICE_SPIKE_MAX_DURATION_MS = 10_000/)

for (const marker of [
  '--app-bottom-safe',
  '--app-bottom-nav-shell-height',
  '--app-bottom-floating-gap',
  '--voice-launch-size',
  '--voice-launch-bottom',
  '--app-bottom-content-clearance',
  'padding: max(18px, env(safe-area-inset-top)) 18px var(--app-bottom-content-clearance)',
  'bottom: var(--app-bottom-safe)',
  'bottom: var(--voice-launch-bottom)',
  'bottom: calc(var(--voice-launch-bottom) + var(--voice-launch-size) + var(--app-bottom-floating-gap))',
  'touch-action: none',
  'grid-template-rows: auto auto minmax(0, 1fr) auto',
  'overflow: hidden',
]) {
  assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
assert.doesNotMatch(css, /\.voice-launch-button\s*\{[\s\S]*?bottom:\s*calc\(86px\s*\+/)
assert.doesNotMatch(css, /\.app-layout\s*\{[\s\S]*?padding:[^;]*112px/)

for (const forbidden of [
  'inventoryMutations',
  'shoppingMutations',
  'recipeMutations',
  'resourceMutations',
  'productCatalogMutations',
  'supabase/client',
]) {
  assert.doesNotMatch(sheet, new RegExp(forbidden))
}

for (const marker of ['stable-sheet authority', 'Push-to-talk interaction', 'Capture policy boundary', 'Shared bottom geometry authority', 'read-only']) {
  assert.match(contract, new RegExp(marker, 'i'))
}

console.log('V6.1B-RO.1 Voice push-to-talk + stable sheet contract: PASS')
