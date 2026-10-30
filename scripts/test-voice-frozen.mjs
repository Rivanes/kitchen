import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Source contract for the deliberate V6 Voice/AI freeze. Keep historical Voice
// tests running to preserve implementation while all runtime entries are OFF.
const flags = await readFile('src/config/featureFlags.ts', 'utf8')
const shell = await readFile('src/components/AppShell.tsx', 'utf8')
const css = await readFile('src/styles/global.css', 'utf8')
const contract = await readFile('tests/VOICE_FREEZE_CONTRACT.md', 'utf8')

assert.match(flags, /export const KITCHEN_VOICE_ENABLED = false\b/)
assert.doesNotMatch(flags.split('*/').pop(), /import\.meta\.env|localStorage|sessionStorage|URLSearchParams|process\.env/)
assert.match(shell, /import \{ KITCHEN_VOICE_ENABLED \} from ['"]\.\.\/config\/featureFlags['"]/) 
assert.match(shell, /const voiceSpikeMode = KITCHEN_VOICE_ENABLED && queryParams\.get\('voice-spike'\) === '1'/)
assert.match(shell, /const voiceContextSpikeMode = KITCHEN_VOICE_ENABLED && queryParams\.get\('voice-context-spike'\) === '1'/)
assert.match(shell, /\{KITCHEN_VOICE_ENABLED && \(\s*<button\s+className="voice-launch-button"/)
assert.match(shell, /\{KITCHEN_VOICE_ENABLED && voiceOpen && \(\s*<Suspense[\s\S]*?<VoiceAssistantSheet/)
assert.match(shell, /className=\{KITCHEN_VOICE_ENABLED \? 'app-layout voice-enabled' : 'app-layout'\}/)
assert.match(shell, /const \[voiceOpen, setVoiceOpen\] = useState\(false\)/)
assert.match(css, /--app-bottom-content-clearance: calc\(var\(--app-bottom-safe\) \+ var\(--app-bottom-nav-shell-height\) \+ 18px\);/)
assert.match(css, /\.app-layout\.voice-enabled\s*\{\s*--app-bottom-content-clearance: calc\(var\(--voice-launch-bottom\)/)
assert.match(css, /\.inventory-shopping-notice\s*\{\s*position: fixed;[\s\S]*?bottom: calc\(var\(--app-bottom-safe\) \+ var\(--app-bottom-nav-shell-height\)/)
assert.match(css, /\.app-layout\.voice-enabled \.inventory-shopping-notice\s*\{\s*bottom: calc\(var\(--voice-launch-bottom\)/)
for (const coreRoute of ["view === 'home'", "view === 'inventory'", "view === 'shopping'", "view === 'recipes'", "view === 'expiry'"]) {
  assert.ok(shell.includes(coreRoute), `Core feature lost: ${coreRoute}`)
}
for (const phrase of ['diagnostic', 'read-only', 'compile-time', 'no schema', 'restore']) {
  assert.match(contract, new RegExp(phrase, 'i'))
}
console.log('Kitchen V6 Voice + AI freeze contract: PASS (no UI or diagnostic entry, reversible)')
