# V3 Closeout Contract

V3.7 closes the Recipes/data-semantics milestone before V4 matching.

## Final V3 authorities

- Structured Recipe sections are first-class: `recipe_sections` + mandatory ingredient `section_id`.
- No runtime or database compatibility authority remains for `recipe_ingredients.section_label`.
- Only the structured 14-argument `save_recipe_snapshot(...)` contract remains.
- Product package-content defaults and Inventory-lot package snapshots remain explicit; Product defaults never reinterpret old physical lots.
- Legacy unresolved container lots, if any remain, are explicit unknowns and are never guessed or treated as zero.

## Hard boundary into V4

V3.7 does not add:
- Recipe cookability matching;
- compatible-unit availability calculation;
- shortage calculation;
- quantity-aware Recipe -> Shopping top-up.

Those belong to V4/V5 and must reuse the V3 Product, Quantity, Measurement Unit, Inventory, Shopping and Recipe authorities.
