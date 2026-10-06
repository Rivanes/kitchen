# Recipe Shared Core Contract — current V3

Recipe ingredients reuse:
- canonical Product resolver/create authority
- shared Product autocomplete
- shared Quantity parser/validation/QuantityStepperInput
- shared Measurement Units

A missing Recipe ingredient creates the same canonical Product used by Inventory and Shopping.

Editing one Recipe ingredient changes Product identity; it must not globally rename the previously referenced Product.

Recipe ingredient presence resolves by canonical Product UUID only. Recipe code must not infer Inventory/Shopping presence by Product display name, fuzzy text, package text or legacy Shopping custom-name matching.

Recipe physical matching reads are owner-scoped and read-only. Recipe code must not own Inventory/Shopping mutation authority.

The legacy `inventory | shopping | missing` presence projection remains procurement context only. V4.3 cookability is owned by the separate pure matching authority and never treats Shopping as stock.

Recipe UI must not expose terms such as `canonical Product` or internal catalog architecture.


## V3.5.3 missing-Product Shopping bridge

Recipe may build a pure Product+unit requirement plan from the current servings preview, but final Shopping writes must remain in the shared Shopping mutation authority. The bridge must use canonical Product UUIDs, shared Quantity precision and shared Measurement Units. Duplicate Product+unit Recipe requirements are grouped before mutation; different units are never converted by V3.5.3. Serving +/- alone remains read-only and never mutates Shopping.

## V4.1 Measurement + Package shared core
Recipe container semantics reuse `src/features/measurements/packageSemantics.ts`. Compatible direct-unit arithmetic reuses the pure `measurementConversion.ts` authority backed by `measurement_units.to_base_factor`.

V4.1 still does not claim Recipe quantity sufficiency or cookability; the conversion authority is only foundation for later V4 matching.

## V4.2 shared Recipe discovery
- `recipeCategories.ts` owns category codes/labels.
- `recipeDiscovery.ts` owns pure filters/time projection.
- Home uses `recipeDiscoveryReadModel.ts`, not the heavy full Recipe read model.
- `save_recipe_snapshot(...)` remains the sole category write authority.


## V4.3 matching shared core
- `recipeMatching.ts` is the single pure cookability authority for Home and RecipesPage.
- Matching reuses shared Measurement Conversion, Recipe/Inventory package snapshots, Product resource semantics and Recipe servings scaling.
- Active Shopping state is orthogonal procurement context and never physical availability.
- Duplicate Recipe requirements aggregate by canonical Product + effective direct family before stock comparison.
