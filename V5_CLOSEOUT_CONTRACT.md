# V5 Closeout Contract

V5 closes the Recipe purchase-planning upgrade without introducing a second Recipe, Inventory or Shopping authority.

## Canonical chain

1. `recipeMatching.ts` determines **physical** Recipe sufficiency from Inventory only.
2. `recipePurchasePlanning.ts` converts a definite physical shortage into the current Product purchase target.
3. `recipeShoppingPlan.ts` compares that target with active Shopping for the same canonical Product + planned purchase unit.
4. `shoppingMutations.ts` remains the sole Shopping persistence authority.

No later layer may redefine an earlier authority. In particular, active Shopping never changes `Wystarczy / Częściowo / Brak / Nieustalone`.

## Retail-unit rule

- direct Product purchase units may use the exact compatible shortage rounded upward to shared 3-decimal precision;
- `package / jar / bottle / can / sachet` purchase targets are whole units;
- `pcs + package content` is a valid whole sellable-unit pattern;
- a physical shortage smaller than one defined retail pack still plans one whole pack;
- incomplete/incompatible Product purchase semantics fail closed and never guess from Product names, Recipe snapshots or Inventory snapshots.

## Shopping top-up rule

The Recipe action targets an **at-least total active Shopping quantity**, not a blind increment.

- same Product + planned unit is aggregated;
- existing coverage is subtracted once;
- covered target => no write;
- partial coverage => add only the outstanding quantity;
- other Shopping units are ignored conservatively;
- unresolved Product planning blocks automatic procurement for the whole Product;
- multi-product writes remain sequential.

## Resource boundary

- Spice remains presence-only and outside V5 quantitative purchase math;
- Household remains Recipe-ineligible;
- Product purchase defaults are future-buying semantics;
- Recipe package snapshots remain Recipe history;
- Inventory package snapshots remain physical-lot history.

## V5.3 closeout

V5.3 adds no new product feature and no database migration. It exists to prove the integrated V4.3 -> V5.1 -> V5.2 chain, consolidate documentation and close V5 after final production verification.

Deferred Product orphan/typo cleanup is maintenance outside V5.
