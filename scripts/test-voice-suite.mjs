import { execFileSync } from 'node:child_process'

// One ordered Voice regression suite; used by both the project verifier (GitHub QA/Pages)
// and the dedicated `npm run test:voice` developer command.
const voiceTests = [
  'scripts/test-voice-stt-spike.mjs',
  'scripts/test-voice-readonly-foundation.mjs',
  'scripts/test-voice-push-to-talk-ui.mjs',
  'scripts/test-voice-context-evaluation.mjs',
  'scripts/test-voice-context-production.mjs',
]

for (const test of voiceTests) {
  execFileSync(process.execPath, [test], { stdio: 'inherit' })
}

console.log(`Kitchen Voice regression suite: PASS (${voiceTests.length}/${voiceTests.length})`)
