# Recipe Discovery Contract — V4.2

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
- Category filters are independent from the future V4.3 `Mogę ugotować` predicate.
- Home opens the canonical RecipesPage detail through an explicit AppShell request; Home never owns a duplicate Recipe detail/write authority.

## V4.3 cookability composition
- Home lightweight discovery additionally loads only the compact ingredient requirement projection needed by the shared matcher; it still does not load sections, instructions or editor state.
- Home reuses the already-loaded Inventory read model as physical-stock authority.
- General category filters compose with an independent `Mogę ugotować` toggle.
- `Na teraz` remains complete and is not silently filtered by the general cookability toggle; cards expose canonical matching state.
