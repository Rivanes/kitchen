# V3.6B — Package Semantics contract

## Shared authority
- Package semantics live in shared Product / Measurement / Inventory layers, never inside Recipes.
- Canonical Product remains `products.id`.
- Shared `measurement_units.family` is the unit-family authority.
- Allowed package-content target families are only `count`, `mass`, `volume`.
- Container row families are `package`, `jar`, `bottle`, `can`, `sachet`.
- Never infer package size from Product name.

## Product default
- A Product may store one optional default package-content value/unit pair.
- Both fields are NULL or both are set.
- Value uses shared Quantity precision: positive, max 3 decimal places.
- Changing Product default never rewrites existing Inventory-lot snapshots.

## Inventory lot
- Inventory-lot resolved package-content snapshot is the physical-lot authority.
- Direct rows (`pcs`, mass, volume) store no package-content pair.
- New container rows require explicit or Product-default package content.
- The resolved pair is snapshotted onto the physical Inventory lot.
- Existing unresolved legacy container lots remain consumable/removable.
- Editing an unresolved legacy container lot requires the UI to resolve package content.
- Different resolved package contents must not merge.
- Equal resolved package contents preserve existing merge behavior.

## Shopping -> Inventory
- Product, purchased quantity and purchased row unit remain immutable in seeded transfer.
- For a container purchase, the Inventory sheet collects/prefills actual content per one container.
- The exact package-content pair is passed through the shared transfer RPC into `add_inventory_lot(...)`.

## Recipe boundary
- V3.6B does not compute Recipe sufficiency, shortage, or cookability.
- V3.5 Recipe presence colors/actions remain presence-only.
- V4 is the first quantity-aware Recipe matching stage.

## V4.1 Recipe snapshot extension
- Package semantics remain shared; Recipes do not introduce a second container-family dictionary.
- Recipe container ingredients snapshot their own package-content value/unit pair.
- Product default may seed a new Recipe snapshot, but a stored Recipe snapshot is authoritative over later Product-default changes.
- Direct Recipe units never carry package-content metadata.
- V4.1 adds conversion/snapshot foundations only; V3.6B does not compute Recipe sufficiency and V4.1 still does not expose cookability UI.
