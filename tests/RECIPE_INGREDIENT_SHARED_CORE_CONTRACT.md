# Recipe Ingredient Shared-Core Contract — V3.4

## Product identity

Recipe ingredients MUST use canonical Product UUID.

Current UI:
- searches the existing owner Product catalog;
- reuses exact existing Product;
- creates a missing Product through `resolveOrCreateCanonicalProduct`;
- stores returned `product_id` in `recipe_ingredients`.

There is no Recipe-only free-text identity.

Changing an ingredient Product switches identity.
It must not silently rename the previously referenced canonical Product.

## Quantity

Recipe ingredient amount reuses:
- `QuantityStepperInput`
- `parseQuantityInput`
- shared 3-decimal Quantity semantics

Database quantity remains `numeric(12,3)`.

## Units

Recipe ingredients reuse:
- `measurement_units`
- `loadMeasurementUnits`
- `getDefaultUnitCode`

No Recipe-only unit dictionary.

## Sections

`section_label` is optional presentation metadata.
It never changes Product identity.

Same canonical Product may appear more than once in one Recipe.

## Ordering

Reorder uses one atomic DB authority:
`reorder_recipe_ingredients(...)`.

Mobile UI uses explicit up/down controls.
