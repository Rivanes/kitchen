# H7.5.6 — Launch animation / startup lifecycle

## Scope

- One fixed, short branded Kitchen intro at the React root on a fresh document load.
- App and Supabase Auth/Membership load simultaneously behind the visual overlay; intro must not await data or authorize access.
- CSS completes and hides the overlay independently of JS timer; the component then unmounts and releases resources.
- Launch must not replay on module transitions, Auth state change or iOS PWA foreground/resume; there is no persistence/UA sniffing.
- Reduced motion: no launch overlay at all, all other existing CSS motion accessibility rules remain active.
- On slow network/Auth/Membership, one `StartupPending` presentation covers either existing locked loading state; auth/RLS fail-closed remains unchanged.
- Icon and palette reuse existing Kitchen UI/PWA colors. No new images, dependencies, SQL, Supabase changes, SW config or cache policies.

## SOURCE QA

1. `node scripts/test-h7-5-6-launch-intro.mjs` with negative fixtures (duplicate mount, removed reduced-motion policy).
2. `npm run check` (complete architectural verifier, TS7 and PWA/Vite build).
3. Chromium browser smoke: immediate intro, automatic disappearance, login without config, no page exceptions, 390 px viewport, `prefers-reduced-motion` fallback.

## LIVE QA — open until user testing

1. Confirm Kitchen QA and GitHub Pages Deploy PASS at same new SHA.
2. iOS Safari tab and Home-screen installed PWA: cold launch animates once, foreground resume does not replay, logo fades to login/Home.
3. Android Chrome tab and installed PWA: same tests, no black frame or clipped layout.
4. Offline install/relaunch, failed Supabase Auth, suspended/denied account: animation never bypasses the existing access checks.
5. `prefers-reduced-motion` device setting: animation is skipped, navigation remains immediately functional.

SQL: BRAK. H7.4D/H7.6 real negative A/B security remains separate OPEN.
