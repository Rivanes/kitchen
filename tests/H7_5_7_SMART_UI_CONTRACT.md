# H7.5.7 Corrective — visible hierarchy, truthful Recipe discovery and intro timing

- Food keeps a quiet global brand row (K, Dom, logout), but **Start, Zapasy, Zakupy and Przepisy each have one visible H1**. Bottom navigation is not a replacement for visual page hierarchy. Avoid extra eyebrow slogans and tautological helper text.
- Cleaning always displays the current `Start` / `Pomieszczenia` / `Harmonogram` H1 in its top header; opening one room displays that room's **visible unique name**.
- Empty Food screens keep one relevant empty-state/action, without duplicated tutorials. Start always shows `Twoja kuchnia`; when there are resources it shows the actual resource count below this heading. Loading/error states remain truthful.
- Home sections have visual priority `Mogę ugotować` (physically sufficient Recipes outside the current meal category) → `Na teraz` (physically sufficient Recipes for the current meal) → default planning `Przepisy` (remaining Recipes, including those missing ingredients).
- Neither automatic lane can promote partial/missing/unresolved Recipes. No automatic availability section renders before the Inventory read model is ready. Night has no `Na teraz`, but `Mogę ugotować` can show ready Recipes of any category.
- Automatically promoted Recipe cards do not appear again in later automatic Home sections. Unfiltered general preview stays empty when no distinct alternative exists; do not reinsert promoted cards as fallback.
- When no cards are eligible, the entire automatic section is hidden. The all-empty account does not display empty Recipe panels. A deliberate category-filter choice shows **all** matching Recipes (no six-card preview limit), including a helpful no-matches state; automatic suggestion lanes pause while a category is selected.
- Recipe category filters in RecipesPage remain complete and independent of cookability. Matching badge is never fabricated while Inventory is unresolved; `Mogę ugotować` uses the canonical shared matcher.
- The shared `HomeRecipeCard` renderer owns visual Recipe card structure. No second Home Recipe details or mutation path is introduced.
- Launch intro is extended moderately (1.65 s JS unmount, 1.51 s CSS exit completion). One per fresh document load, no replay on tab switch, login transition or wznowienie PWA. Auth/Membership/data loading runs concurrently; reduced motion suppresses the overlay.
- No SQL or changes to Auth, membership, Supabase data authority, Service Worker or PWA installation logic.

## Regression gates

1. `scripts/test-recipe-discovery.mjs`: empty, one missing, one sufficient, multi-recipe alternatives, category selection, time windows.
2. `scripts/test-h7-5-7-smart-ui.mjs`: **visible** page headings, real actions, selected room name, ordered and conditional Recipe sections, single card renderer.
3. `scripts/test-h7-5-6-launch-intro.mjs`: one root mount, lifecycle, CSS/JS timing, reduced motion.
4. Full `npm run check` on actual repository tree.
5. Production mobile smoke: empty vs populated accounts; single available/missing Recipe, selected filter, bought Shopping list, selected Room name, evening/night window; Safari/PWA cold launch and resume; focus and visibility changes.
