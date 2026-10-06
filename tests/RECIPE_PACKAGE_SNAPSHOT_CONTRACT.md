# V4.1 — Recipe Package Snapshot Contract

## Immutable Recipe meaning
For a Recipe ingredient whose row unit is a container (`package`, `jar`, `bottle`, `can`, `sachet`), the Recipe stores the content of **one** container as its own immutable Recipe meaning:
- `package_content_value`
- `package_content_unit`

The snapshot belongs to `recipe_ingredients`, not to Product identity and not to a physical Inventory lot.

## Direct vs container units
- Direct ingredient families (`count`, `mass`, `volume`) must persist both package-content fields as NULL.
- Container ingredient families require both package-content fields.
- Package-content target unit must be a direct Measurement Unit.
- Unsupported families fail closed.

## Product default boundary
A Product default may prefill a **new** Recipe container snapshot. After Save, the stored Recipe snapshot wins forever over later Product default changes. Changing Product defaults must not reinterpret historical Recipes.

Re-selecting the same Product while editing must not silently erase the stored Recipe snapshot.

## Servings
Ingredient `quantity` scales with target servings. Package content is per one container and does not scale itself.

Example: base Recipe `1 opak.` with snapshot `1 l / opak.` becomes `2 opak.` at 2x servings, while the snapshot remains `1 l / opak.`.

## Persistence authority
The existing `save_recipe_snapshot(...)` remains the only Recipe write authority. V4.1 extends its ingredient JSON payload; it does not create a second Recipe-ingredient mutation path.

The audited historical `Kawa z mlekiem -> Mleko -> 1 opak.` row is backfilled only from the explicitly confirmed `1 l` meaning. Product-level Mleko defaults are not mutated by this backfill.

## Product default seeding boundary

A Product package default may prefill a new Recipe container snapshot only when the Recipe row container unit is the same as `products.default_unit_code`. A `package` default must never silently become the content definition for `jar`, `bottle`, `can`, or `sachet`. Changing between different container units clears the prior per-container meaning unless the editor is restoring the already-stored snapshot of the same Recipe ingredient and the same original container unit.
