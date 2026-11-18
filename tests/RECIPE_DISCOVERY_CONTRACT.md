# Recipe Discovery Contract — V4.4

- Every Recipe stores exactly one intrinsic category: `breakfast`, `lunch`, `dinner`, `snack`, or `cake`.
- `Ogólne` / `Wszystkie` is a derived view and is never stored in `recipes.category_code`.
- Recipe create/edit requires an explicit category selection. Existing Recipes reopen with their saved category.
- Home Recipe discovery uses a lightweight owner-scoped Recipe projection. It does **not** load the full Recipe/ingredient/Inventory/Shopping read model just to render preview cards.
- General Recipe discovery is available whenever there are distinct cards to show, including at 23:00–05:59. If no Recipes exist or every Recipe is already promoted on the default Start, the empty preview is hidden; the Recipes bottom tab remains available.
- `Na teraz` is device-local time projection only:
  - 06:00–11:59 → Śniadanie;
  - 12:00–17:59 → Obiad;
  - 18:00–22:59 → Kolacja;
  - 23:00–05:59 → hidden.
- Przekąska and Ciasto are never time-promoted.
- Home refreshes the local clock on minute boundaries, focus and visibility return; no timezone or meal-time state is persisted.
- The default Start has three prioritized, non-overlapping visual lanes: `Mogę ugotować` (sufficient recipes from other categories), `Na teraz` (sufficient current-meal recipes) and distinct general planning previews. Recipes lacking physical ingredients belong in general planning, not `Na teraz`. A Recipe already shown in a higher-priority lane is not reintroduced in a lower automatic lane.
- When the user selects a general category, current-meal promotional lanes pause, while the chosen category filter shows its **complete** matching list. The explicit filter never silently drops Recipes. The full RecipesPage remains independent.
- Home opens the canonical RecipesPage detail through an explicit AppShell request; Home never owns a duplicate Recipe detail/write authority.

## V4.3.1 cookability discovery
- Home lightweight discovery additionally loads only the compact ingredient requirement projection needed by the shared matcher; it still does not load sections, instructions or editor state.
- Home reuses the already-loaded Inventory read model as physical-stock authority.
- `Mogę ugotować` is a **separate availability Home section**, not a filter on general Recipe discovery. It shows recipes that the canonical matcher confirms as sufficient, excluding the current-meal items reserved for `Na teraz`. It can display available meals, snacks or cakes even outside meal-time windows.
- `Na teraz` uses the time windows above but **only physically sufficient** recipes of the relevant current meal. It is hidden if all current-meal recipes are missing/partial/unresolved, or Inventory loading has not completed.
- General `Przepisy` stays category-filterable and complete for planning/inspiration; RecipesPage also keeps category/search only.
- A deliberate category filter (`Śniadanie`/`Obiad`/`Kolacja`/...) is a **planning catalogue**: it includes sufficient and missing/partial/unresolved recipes and is never limited by the default six-card preview size.


## V4.4 final polish
- Home matching badges are rendered only when the Inventory read model is ready and a canonical matcher result exists.
- Recipe data may finish loading before Inventory; that infrastructure timing must never be presented as domain state `Nieustalone`.
- If Inventory loading fails, Home keeps Recipe discovery/navigation available but does not fabricate a cookability badge.
- Empty automatic Recipe sections (including `Mogę ugotować` and `Na teraz`) are hidden, not rendered as empty cards. A deliberately selected category with no matches retains its filter and informative empty result. The absence of a section never claims that other Recipes are definitely missing ingredients.
