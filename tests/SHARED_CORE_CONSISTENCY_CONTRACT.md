# Kitchen Shared Core Consistency Contract — V2.3.3 + V3.6B

Kitchen follows **reuse before new implementation**.

If the same business operation appears in more than one module, it must use one shared authority.

## Product authority

Inventory, Shopping and Recipes share:
- Product normalization/autocomplete
- owner-scoped Product catalog loading
- Product resolve/create
- Product rename/settings update
- Product cleanup after failed dependent creation
- stable canonical Product UUID

V3.6B adds optional Product-level package-content defaults to the same canonical Product authority. These defaults are metadata on the existing UUID; they never create a second Product identity.

Editing a Product-backed Shopping item to an unmatched new name renames the same canonical Product.
Selecting an already-existing Product rebinds the Shopping row to that Product.
Current UI-created Shopping rows never create a second ad-hoc Product identity.

## Quantity authority

Inventory, Shopping, Recipes and Consume share:
- one input grammar
- max 3 decimal places
- positive-only validation
- numeric(12,3)-compatible maximum
- stored-value validation
- merge addition/overflow checks
- display formatting

Package-content values use this same Quantity authority. Scientific notation and module-specific quantity parsers are not allowed.

## Measurement Unit authority

Inventory, Shopping and Recipes share:
- one `MeasurementUnit` type
- one loader for `measurement_units`
- one default-unit resolver
- default count code = `pcs`

V3.6B package semantics reuse the same controlled Measurement Units:
- direct content families: `count`, `mass`, `volume`
- household container row families: `package`, `jar`, `bottle`, `can`, `sachet`

Display symbol `szt.` is not a database code.

## Package semantics authority — V3.6B

- Product package content is only a default for future container lots.
- Inventory-lot resolved package-content snapshot is the physical-lot authority.
- Normal Inventory add and Shopping -> Inventory both delegate final resolution/merge to `public.add_inventory_lot(...)`.
- Explicit lot content wins over Product default.
- Product defaults must never retroactively rewrite existing Inventory lots.
- Merge identity includes package-content value + unit.
- No module may infer package size from Product names.
- Recipe matching remains out of scope until the later Recipe matching stage.

## Consume vs remove

- partial consume -> `consume_inventory_item`
- full consume -> `consume_inventory_item`
- explicit remove -> direct owner-scoped DELETE

Full consumption must not be implemented by calling the explicit-remove path.

## Read models

Inventory and Shopping reuse the shared Product catalog and Measurement Unit loaders.
They may keep domain-specific joins for their own rows.

## Architecture rule

UI context may differ.
Business authority must not fork.
New functionality should extend/reuse existing shared services before adding another implementation.
