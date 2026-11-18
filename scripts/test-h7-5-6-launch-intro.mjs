import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [entry, startup, app, gate, css, pwa, contract] = await Promise.all([
  readFile('src/main.tsx', 'utf8'),
  readFile('src/components/StartupScreen.tsx', 'utf8'),
  readFile('src/App.tsx', 'utf8'),
  readFile('src/components/MembershipGate.tsx', 'utf8'),
  readFile('src/styles/global.css', 'utf8'),
  readFile('vite.config.ts', 'utf8'),
  readFile('tests/H7_5_6_STARTUP_ANIMATION_CONTRACT.md', 'utf8'),
])

function assertSingleEntry(source) {
  assert.match(source, /import \{ LaunchIntro \} from '\.\/components\/StartupScreen'/)
  assert.equal((source.match(/<LaunchIntro\s*\/>/g) ?? []).length, 1,
    'One root-owned splash, not one per account/view')
  assert.match(source, /<App\s*\/>\s*<LaunchIntro\s*\/>/,
    'The app must start loading concurrently with the visual intro')
}

function assertStartupLifecycle(source) {
  assert.match(source, /useState\(shouldShowIntro\)/)
  assert.match(source, /prefers-reduced-motion:\s*reduce/)
  assert.match(source, /document\.visibilityState !== 'hidden'/)
  assert.match(source, /window\.setTimeout\(\(\) => setVisible\(false\), INTRO_LIFETIME_MS\)/)
  assert.match(source, /window\.clearTimeout\(timer\)/)
  assert.match(source, /document\.addEventListener\('visibilitychange', dismissWhenHidden\)/)
  assert.match(source, /document\.removeEventListener\('visibilitychange', dismissWhenHidden\)/)
  assert.match(source, /role="status" aria-label="Uruchamianie Kitchen"/)
  assert.match(source, /if \(!visible\) return null/)
  assert.doesNotMatch(source, /supabase|localStorage|sessionStorage|requestAnimationFrame|setInterval|onAuthStateChange|location\.reload/,
    'Launch is presentation only and cannot own/authenticate/persist/reload app state')
}

assertSingleEntry(entry)
assertStartupLifecycle(startup)
assert.throws(() => assertSingleEntry(entry.replace('<LaunchIntro />', '<LaunchIntro /><LaunchIntro />')),
  /One root-owned splash/)
assert.throws(() => assertStartupLifecycle(startup.replace('prefers-reduced-motion: reduce', 'no-preference')),
  /prefers-reduced-motion/)

for (const source of [app, gate]) {
  assert.match(source, /<StartupPending message=/)
  assert.doesNotMatch(source, /<div className="loading-dot"/,
    'Auth and Membership waiting UIs should use one presentation component')
}
assert.match(app, /if \(checkingSession\)/)
assert.match(app, /if \(!session\?\.user\)/)
assert.match(app, /<MembershipGate key=\{session\.user\.id\}/)
assert.match(gate, /\.rpc\('kitchen_my_access'\)/)
assert.match(gate, /if \(status === 'active'\)/)
assert.match(gate, /if \(status === 'checking'\)/)

assert.match(css, /\.launch-intro\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/)
assert.match(css, /animation:\s*kitchenLaunchExit 320ms 1190ms/)
assert.match(startup, /INTRO_LIFETIME_MS = 1650/, 'H7.5.7 extends the visual introduction without delaying Auth/data requests')
assert.match(css, /@keyframes kitchenLaunchExit\s*\{/)
assert.match(css, /100% \{ opacity: 0; visibility: hidden; \}/)
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.launch-intro \{ display: none; \}/)
assert.match(pwa, /registerType:\s*'prompt'/)
assert.match(pwa, /background_color:\s*'#f7f7f2'/)
assert.match(contract, /H7\.5\.6/)

console.log('H7.5.6 launch animation lifecycle and security-boundary contract: PASS')
