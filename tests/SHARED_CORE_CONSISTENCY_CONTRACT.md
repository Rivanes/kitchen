# Kitchen Shared Core Consistency Contract — V2.3.3

Kitchen follows **reuse before new implementation**.

If the same business operation appears in more than one module, it must use one shared authority.

## Product authority

Inventory and Shopping share:
- Product normalization/autocomplete
- owner-scoped Product catalog loading
- Product resolve/create
- Product rename
- Product cleanup after failed dependent creation
- stable canonical Product UUID

Editing a Product-backed Shopping item to an unmatched new name renames the same canonical Product.
Selecting an already-existing Product rebinds the Shopping row to that Product.
Current UI-created Shopping rows never create a second ad-hoc Product identity.

## Quantity authority

Inventory, Shopping and Consume share:
- one input grammar
- max 3 decimal places
- positive-only validation
- numeric(12,3)-compatible maximum
- stored-value validation
- merge addition/overflow checks
- display formatting

Scientific notation and module-specific quantity parsers are not allowed.

## Measurement Unit authority

Inventory and Shopping share:
- one `MeasurementUnit` type
- one loader for `measurement_units`
- one default-unit resolver
- default count code = `pcs`

Display symbol `szt.` is not a database code.

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
