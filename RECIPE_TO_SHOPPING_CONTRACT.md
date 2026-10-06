# Recipe -> Shopping Purchase Bridge Contract — V5.2

V5.2 supersedes the old V3.5.3 presence-only amount planning while preserving its UI placement and Shopping ownership boundary.

The Recipe detail still exposes explicit Shopping actions, but their quantity now comes from the V4.3 physical matcher + V5.1 Purchase Planning Authority.

## Authority chain

1. `recipeMatching.ts` determines physical sufficiency from Inventory only.
2. `recipePurchasePlanning.ts` converts definite physical shortage into the current Product purchase target.
3. `recipeShoppingPlan.ts` compares that target with active Shopping for the same canonical Product + planned purchase unit.
4. `shoppingMutations.ts` remains the only writer of `shopping_items`.

Shopping never feeds back into Recipe cookability. A Product may remain `Częściowo` or `Brak` physically while its purchase target is already covered on the Shopping list.

## Purchase target and active Shopping

- V5.2 accepts only V5.1 `planned` entries.
- Multiple V5.1 groups that resolve to the same Product + purchase unit are aggregated before Shopping coverage is applied.
- Active Shopping coverage is counted only for the same canonical Product + the exact planned purchase unit.
- A Shopping item in another unit is ignored conservatively; V5.2 does not invent cross-unit planned-stock equivalence.
- Active quantities for the same Product + planned unit are summed before top-up.
- If active quantity already meets or exceeds the target, no Shopping mutation is needed.
- If active quantity is below the target, only the outstanding amount is added.
- Any unresolved V5.1 group for a Product blocks automatic procurement for that whole Product so the action can never silently buy only a subset of its Recipe requirement.

## Whole retail units

For V5.1 `container` and `count-pack` modes:

- target purchase quantity is always whole;
- V5.2 never creates a fractional automatic top-up;
- an existing fractional active quantity below the required whole-unit target fails closed instead of creating another fractional result.

Direct purchase targets keep shared 3-decimal Quantity precision.

## Shopping write authority

Recipe components never insert or update `shopping_items` directly.

`ensureCanonicalShoppingTargetsSequentially(...)` belongs to Shopping and:

- validates one target per Product + unit;
- re-reads active Shopping at action time rather than trusting only the Recipe screen snapshot;
- compares current active quantity with the desired total target;
- delegates the actual insert/merge to the existing `createShoppingItem(...)` authority;
- executes multi-product work sequentially, never with `Promise.all`.

The target is an **at-least purchase quantity**, not an increment. Repeating the same Recipe action must therefore not keep increasing an already-covered active Shopping quantity.

## Recipe UI

- both definite `partial` and `missing` quantitative requirements may expose the existing add action when a purchase top-up is still needed;
- an active Shopping item remains secondary context (`Na liście zakupów`) and never changes the physical `Wystarczy / Częściowo / Brak / Nieustalone` state;
- when purchase semantics are unresolved for an otherwise definite shortage, automatic add is withheld and the exceptional hint `Ustaw sposób zakupu` may be shown;
- bulk action counts unique Products that still require a Shopping top-up, not ingredient rows;
- target-serving changes recompute matching and purchase targets without mutating Recipe/Inventory/Shopping until the user explicitly presses a Shopping action;
- after success or failure, Recipe data is refreshed from authoritative backend state before another action.

## Preserved resource semantics

- Spice remains presence-tracked and outside quantitative V5.1/V5.2 purchase math; V3.8.4 Spice `Brak` already ensures active Shopping through its own resource authority.
- Household remains Recipe-ineligible.
- Recipe/Inventory package snapshots remain historical/physical authorities and are never reused as current Product purchase defaults.
