# Kitchen Voice Push-to-Talk UI Contract — V6.1B-RO.1

Status: corrective contract for the production-shaped read-only Voice shell.

## Stable-sheet authority
- The Voice sheet owns a fixed, viewport-bounded shell.
- Conversation/result history is the only primary vertical scroll region.
- The push-to-talk footer remains outside the conversation scroller and stays reachable while content changes.
- Recording/transcribing state must not insert a separate Stop control into scrolling content.

## Push-to-talk interaction
- Pointer Events are the primary touch/mouse path.
- `pointerdown` begins a hold session and microphone capture only when the local STT model is already ready.
- `pointerup` ends capture, then transcribes and asks the same read-only Kitchen query authority.
- `pointercancel` / `lostpointercapture` cancel safely.
- Space/Enter key down/up provide keyboard hold-to-talk behavior.
- Very short accidental taps are discarded quietly with an instructional hint rather than surfaced as a recording error.
- The push-to-talk target uses `touch-action: none` and must not become a sheet scroll gesture while held.

## Runtime readiness
- Opening Kitchen Voice may prewarm the configured STT provider because opening the sheet is explicit Voice use.
- Microphone permission/capture still begins only on an actual hold gesture.
- A hold made before model readiness never queues a future recording after release.

## Capture policy boundary
- V6.1A diagnostic capture remains frozen at 10 seconds through `VOICE_SPIKE_MAX_DURATION_MS`.
- Product-shaped Voice uses a separate production capture policy and must not import the spike duration constant.
- Product-shaped Voice records while held and uses only a safety ceiling against an indefinitely held gesture.

## Shared bottom geometry authority
- Bottom navigation, floating Voice launcher, app content clearance and Inventory -> Shopping notice derive their vertical placement from shared CSS custom properties.
- The Voice launcher must not use an independent hard-coded bottom offset.
- Global app content clearance reserves space for the persistent Voice launcher as well as the bottom navigation.
- Inventory -> Shopping notice occupies a slot above the Voice launcher rather than colliding with it.

## Scope invariants
- This corrective changes UI/interaction only.
- Voice remains read-only: no Product, Inventory, Shopping, Resource or Recipe mutation authority is imported/called.
- Existing read models, Recipe matching, STT provider boundary and TTS boundary remain authoritative.
- No SQL/schema/RLS/Auth/Storage change.
