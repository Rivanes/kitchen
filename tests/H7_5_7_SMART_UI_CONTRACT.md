# H7.5.7 — SMART UI consolidation and launch timing

- Bottom navigation communicates the Food tab; the module header retains only its mark, Dom return and logout. The active page keeps an accessible H1 without repeating its tab label visually.
- Cleaning tabs are authoritative for Start, Pomieszczenia and Harmonogram. A selected room retains its **visible unique name** in the header and its accessible H1 reference.
- Empty Food screens render one relevant empty-state/action, not duplicate tutorial headers. Stocked Start keeps the actual resource count; missing/failed loading states remain visible and truthful.
- Home current-meal suggestions have **one visual priority**: `Mogę ugotować` (canonical sufficient) → `Na teraz` (other current-meal ideas) → unfiltered general `Przepisy`.
- Automatically promoted Recipe cards do not appear again in later automatic Home sections. Unfiltered general preview stays empty when no distinct alternative exists; do not reinsert promoted cards as fallback.
- When no cards are eligible, the entire automatic section is hidden. The all-empty account does not display empty Recipe panels. A deliberate category-filter choice shows its full result, including a helpful no-matches state; automatic suggestion lanes pause while a category is selected.
- Recipe category filters in RecipesPage remain complete and independent of cookability. Matching badge is never fabricated while Inventory is unresolved; `Mogę ugotować` uses the canonical shared matcher.
- The shared `HomeRecipeCard` renderer owns visual Recipe card structure. No second Home Recipe details or mutation path is introduced.
- Launch intro is extended moderately (1.65 s JS unmount, 1.51 s CSS exit completion). One per fresh document load, no replay on tab switch, login transition or wznowienie PWA. Auth/Membership/data loading runs concurrently; reduced motion suppresses the overlay.
- No SQL or changes to Auth, membership, Supabase data authority, Service Worker or PWA installation logic.

## Regression gates

1. `scripts/test-recipe-discovery.mjs`: empty, one missing, one sufficient, multi-recipe alternatives, category selection, time windows.
2. `scripts/test-h7-5-7-smart-ui.mjs`: page headings, real actions, selected room name, ordered and conditional Recipe sections, single card renderer.
3. `scripts/test-h7-5-6-launch-intro.mjs`: one root mount, lifecycle, CSS/JS timing, reduced motion.
4. Full `npm run check` on actual repository tree.
5. Production mobile smoke: empty vs populated accounts; single available/missing Recipe, selected filter, bought Shopping list, selected Room name, evening/night window; Safari/PWA cold launch and resume; focus and visibility changes.
