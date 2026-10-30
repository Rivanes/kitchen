# Kitchen V6 Voice/AI Freeze — implementation contract

Status: **LOCAL SOURCE QA PASS / AWAITING GITHUB QA + PAGES + DEVICE SMOKE** (not CLOSED).

## Product decision

The user has suspended the full Voice/AI initiative: experimental micro/neural AI,
production read-only Context Engine, speech-to-text, speech output and ordinary Voice UI.
This is a **diagnostic and feature freeze**, not model deletion or an architectural redesign.
The neural N1–N3 research is not part of the deployed Kitchen baseline.

## Runtime invariant (compile-time gate)

`src/config/featureFlags.ts` exports `KITCHEN_VOICE_ENABLED = false`.
No URL, localStorage, query parameter or user setting may override it.

- The central Voice microphone button must not render on any ordinary page.
- The VoiceAssistantSheet must not mount or initialize capture, TTS, workers or model downloads.
- Both authenticated diagnostic routes `?voice-spike=1` and
  `?voice-context-spike=1` must fall back to the regular Kitchen shell.
- All prior Voice sources, tests and pinned dependencies are retained as research history.
- The regular Home, Inventory, Shopping, Recipes, Expiry and Auth/Owner flows
  must operate normally with unchanged no schema, no RPC and no Supabase business rules.
- The mobile layout returns to nav-only clearance. Voice-enabled styles are preserved
  under `.app-layout.voice-enabled` for a future restore.
- Service-worker or browser cached files from previous releases may remain locally,
  but Voice is not executed by the frozen Kitchen app.

## QA

Run `node scripts/verify-project.mjs` (includes all five old Voice regressions +
`node scripts/test-voice-frozen.mjs`). GitHub then must pass npm ci, TypeScript and
production build. On a real phone after deployment verify bottom nav, spacing,
normal business flows, and both diagnostic URLs. Observe no Voice/Whisper model requests.

## Future restore

**Do not** simply flip the flag and deploy. Review dependency/runtime freshness,
retest STT and iPhone performance, revisit read-only errors, and repeat privacy,
security, mobile and production QA. Restore the feature deliberately in a separate
approved release. This freeze gives no authorization for Voice mutations.
