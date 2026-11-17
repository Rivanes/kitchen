# H7.4C — Frontend Shared Product Catalog contract

**Stage:** source implementation candidate; requires GitHub same-SHA CI and H7.4D runtime A/B QA.

## Required UI

- Shared `ProductAutocompleteField` groups **Moje** above **Katalog Kitchen**; query only if name has at least 2 characters, 250 ms debounce, stale-response guard, 5 results per source, no global ownership metadata.
- Existing owner matches take precedence; `sharedCatalogId` is selection state, **not** an owner product id.
- Inventory: match role to chosen section (`food`, `spice`, `household`), maintain quantity/presence/containers and package defaults.
- Shopping: save as owner private product with existing owner merge; edits selecting shared identity relink the item without renaming the old owner product. Household unit remains fixed.
- Recipes: ingredient draft carries `sharedCatalogId` and a private/public choice to snapshot save. Household excluded, spices eligible, package snapshots remain private.
- For manually typed NEW names, explicit **Tylko dla mnie** (default) or **Dodaj do Katalogu Kitchen**. Previously existing owner products are NEVER automatically published.
- Publication RPC runs after successful Inventory, Shopping, Recipe business save, only when new owner product was created and user opted in. If publication fails after save, form shows **Zakończ** and must not perform another business write.
- Adoption uses H7.4B `h74_adopt_shared_product` and resolves owner-private product. Search uses H7.4B `h74_search_shared_products`. Publishing uses H7.4B `h74_publish_local_product`.
- No direct write to `shared_product_catalog`, no owner RLS/FK migrations, no backfill and no new SQL for this stage.

## Verification

- `scripts/test-h7-4c-shared-catalog.mjs` checks syntactic and source contracts, RPC adapter behaviour with a mocked client, and post-save publish ordering.
- Same commit must pass GitHub Kitchen QA + Deploy (typecheck / build / verifier). This source package is NOT proof of a live CI pass.
- H7.4D runtime: account A opts-in new Mleko, B searches and adopts → different private UUIDs; 2l vs 1l, locations and recipe snapshots separate; private new name never appears globally; roles, unit constraints, concurrency, rename/delete, anon/suspended; API negative tests.
- Potential non-atomic frontend boundary: adoption can create a private identity before a later business save fails; cleanup is best-effort and must be examined under concurrent sessions in H7.4D. No global publication occurs before successful business save.
- Backup/restore and current GitHub live-main SHA remain independent release gates.
