# H1 — Home Hub + module shells verification contract

Status: **LOCAL SOURCE CONTRACT ONLY / LIVE QA PENDING** (2026-10-30).

1. Auth remains a single `OwnerGate` using `is_kitchen_owner` before any module UI; no module-specific signup.
2. First authenticated owner view is Home Hub with two focusable buttons, `Jedzenie` and `Porządki`, two columns at phone sizes, no bottom navbar and an accessible logout action.
3. The Hub does not mount Food data-query components before entry. On return, Food components unmount; reopening begins at Food Start.
4. Food shell keeps existing 4 buttons: Start / Zapasy / Zakupy / Przepisy and internal Expiry route, product-create token and recipe-open tokens. It now exposes an explicit `Dom` return.
5. Cleaning shell has separately scoped blue design with Start / Pomieszczenia / Harmonogram, exactly 3 bottom buttons, and explicit `Dom` return. Three tabs are functional navigation; there is **no room/task CRUD, fabricated data, fake checkboxes or calendar data in H1**.
6. Compile-time `KITCHEN_VOICE_ENABLED = false` remains untouched; no voice UI/diagnostics.
7. No Supabase schema, SQL/RLS, or data-authority modifications in H1.
8. Mobile: manually check 320/375/390/430 px, no horizontal overflow, iPhone safe areas and both navbars, keyboard and vertical scroll. Check Hub cards visible and accessible by touch / VoiceOver.
9. Real smoke: OwnerGate → Hub → Food → add product / expiry / shopping / recipes / back → Hub → Cleaning Start → Rooms → Schedule → Hub → logout/login. Check that Food requests do not run on Hub and cleaning routes make no DB requests.
10. CI Kitchen QA and Pages must both PASS **on the same final commit**. Then user phone QA; only then mark H1 CLOSED.

Run `node scripts/test-home-hub-shell.mjs` locally, `npm run verify:project`, `npm run typecheck`, `npm run build` in a provisioned Node environment.
