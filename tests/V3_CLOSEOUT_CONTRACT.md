# V3 Closeout Contract

V3 is **PASS / CLOSED through V3.8.4**. This contract is the durable boundary between the completed V3 foundation and future V4 matching.

## Final V3 authorities

- Structured Recipe sections are first-class: `recipe_sections` + mandatory ingredient `section_id`.
- No runtime or database compatibility authority remains for `recipe_ingredients.section_label`.
- Only the structured 14-argument `save_recipe_snapshot(...)` contract remains for the final V3 Recipe snapshot authority.
- Product package-content defaults and Inventory-lot package snapshots remain explicit; Product defaults never reinterpret old physical lots.
- Legacy unresolved container lots, if any remain, are explicit unknowns and are never guessed or treated as zero.
- Product role is the persistent resource-membership authority for standard food / spice / household; there is no parallel tracked-resource identity table.
- `inventory_items` remains positive physical stock only; Spice `Brak` and Household zero are represented without fake zero rows.
- `set_product_resource_semantics(...)` remains Product-role authority.
- `set_spice_presence(...)` and `adjust_household_stock(...)` remain focused resource operations.
- automatic resource replenishment uses idempotent Shopping ensure semantics rather than explicit Shopping quantity-add semantics.
- `products.minimum_stock_quantity` is optional Household policy in the Product canonical unit.
- shared Quantity owns zero-or-more physical aggregation through `sumQuantities(...)`; `addQuantities(...)` remains positive-input only.

## Final V3.8.4 corrective state

The Household runtime corrective is part of the closed V3 baseline:
- Household stock aggregation no longer calls positive-only addition with a synthetic zero accumulator;
- executable persistent-resource regression covers empty / single / multi-lot aggregation, decimal precision, overflow and invalid zero input;
- accidental repository-root copies of verifier/test files are not part of the intended repository.

## Hard boundary into V4

V3 does not add:
- Recipe cookability matching;
- compatible-unit availability calculation;
- shortage calculation;
- quantity-aware Recipe -> Shopping top-up;
- Recipe container requirement snapshots.

Before Recipe cookability matching starts, V4 prerequisites must extend the **existing** Measurement Unit authority with runtime conversion factors and introduce an immutable Recipe-side container-content snapshot. V4 must not infer historical Recipe package size from a mutable Product default.

Those capabilities belong to PRE-V4/V4 and must reuse the closed V3 Product, Quantity, Measurement Unit, Inventory, Shopping, Package Semantics and Recipe authorities.
