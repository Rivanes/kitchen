# Recipe -> Shopping Presence Bridge Contract — V3.5.3

V3.5.3 is a narrow convenience bridge for Products whose Recipe presence is `missing`.
It is not Recipe matching and does not calculate shortages.

## Action gate

- only canonical Products with `presence === 'missing'` expose an add action;
- green Inventory Products are never added by this bridge;
- orange active-Shopping Products are never added again by this bridge;
- purchased Shopping history does not block a new missing-Product action;
- Product identity is canonical `product_id` only, never display-name matching.

## Serving preview boundary

- changing Recipe servings remains read-only and never mutates Shopping;
- an explicit `Dodaj do listy` / `Dodaj wszystkie brakujące` action may use the current target-servings requirement visible to the user;
- stored Recipe base servings and stored ingredient quantities are never rewritten.

## Quantity plan

Before Shopping mutation, Recipe builds a pure plan:
- duplicate Recipe occurrences are grouped by canonical Product + unit;
- same Product + same unit quantities are summed from the current serving preview;
- the final Shopping quantity uses shared 3-decimal Quantity precision;
- a positive scaled result below representable precision becomes `0.001` for the Shopping write only;
- the same Product in different units remains separate; V3.5.3 performs no unit conversion.

Clicking an individual missing Product adds the complete requirement for that Product across the current Recipe, not just one duplicate ingredient row.
The bulk count is the number of unique missing canonical Products, not ingredient rows.

## Shopping mutation authority

- Recipe never inserts/updates `shopping_items` directly;
- final add/merge stays owned by `createShoppingItem()` and the Shopping mutation module;
- deterministic multi-entry execution is sequential, not `Promise.all`;
- same Product + same unit keeps existing Shopping merge semantics;
- no Recipe-specific Shopping identity or merge implementation may exist.

## UI/state

- each red ingredient Product exposes a compact accessible Shopping-add action;
- Recipe Detail exposes one `Dodaj wszystkie brakujące` action while missing Products exist;
- while a Shopping action is in flight, duplicate submissions are disabled;
- after full success, all Recipe occurrences of affected Products become orange in-memory;
- after a failure, Recipe presence is refreshed from authoritative data before a later attempt where possible;
- the mobile ingredient row must remain readable at <=380px.

## Hard boundary

V3.5.3 must not:
- subtract Inventory quantities;
- top up orange Shopping quantities;
- infer package contents;
- convert incompatible units;
- claim `wystarczy`, `możesz ugotować` or Recipe feasibility.

Package-content semantics remain V3.6. Quantity-aware matching remains V4; later Recipe -> Shopping work may add shortage/top-up semantics only after those foundations exist.
