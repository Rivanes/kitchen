# Recipe Discovery Contract — V4.4

- Every Recipe stores exactly one intrinsic category: `breakfast`, `lunch`, `dinner`, `snack`, or `cake`.
- `Ogólne` / `Wszystkie` is a derived view and is never stored in `recipes.category_code`.
- Recipe create/edit requires an explicit category selection. Existing Recipes reopen with their saved category.
- Home Recipe discovery uses a lightweight owner-scoped Recipe projection. It does **not** load the full Recipe/ingredient/Inventory/Shopping read model just to render preview cards.
- Home always exposes general Recipe discovery for planning/inspiration, including at 23:00–05:59.
- `Na teraz` is device-local time projection only:
  - 06:00–11:59 → Śniadanie;
  - 12:00–17:59 → Obiad;
  - 18:00–22:59 → Kolacja;
  - 23:00–05:59 → hidden.
- Przekąska and Ciasto are never time-promoted.
- Home refreshes the local clock on minute boundaries, focus and visibility return; no timezone or meal-time state is persisted.
- General category filters remain complete even when the same Recipe is also eligible for `Na teraz`. Automatic de-duplication applies only to the unfiltered preview when alternatives exist.
- Home opens the canonical RecipesPage detail through an explicit AppShell request; Home never owns a duplicate Recipe detail/write authority.

## V4.3.1 cookability discovery
- Home lightweight discovery additionally loads only the compact ingredient requirement projection needed by the shared matcher; it still does not load sections, instructions or editor state.
- Home reuses the already-loaded Inventory read model as physical-stock authority.
- `Mogę ugotować` is a **separate time-aware Home section**, not a filter on general Recipe discovery.
- During 06:00–11:59 it contains only sufficient Śniadania, during 12:00–17:59 only sufficient Obiady, and during 18:00–22:59 only sufficient Kolacje. It is hidden outside those windows.
- General `Przepisy` stays category-filterable and complete for planning/inspiration; RecipesPage also keeps category/search only.
- `Na teraz` remains complete and may include non-cookable Recipes; cards expose canonical matching state.


## V4.4 final polish
- Home matching badges are rendered only when the Inventory read model is ready and a canonical matcher result exists.
- Recipe data may finish loading before Inventory; that infrastructure timing must never be presented as domain state `Nieustalone`.
- If Inventory loading fails, Home keeps Recipe discovery/navigation available but does not fabricate a cookability badge.
- Empty `Mogę ugotować` uses neutral wording: it means there is no Recipe with a fully confirmed `Wystarczy` result for the current meal window; it does not assert that every other Recipe is definitely missing ingredients.
