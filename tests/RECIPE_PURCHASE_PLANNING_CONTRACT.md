# Recipe Purchase Planning Contract — V5.1

V5.1 converts a **definite physical shortage** from the V4.3 Recipe matcher into a realistic purchase target. It is pure planning logic only: no Supabase query, no Shopping mutation and no change to cookability.

## Authority boundaries

- V4.3 `recipeMatching.ts` remains the only physical sufficiency authority.
- Recipe package snapshots describe historical Recipe requirement semantics.
- Inventory package snapshots describe physical owned-lot semantics.
- Product `defaultUnitCode` + Product package content describe how the Product is bought **now**.
- V5.1 never infers package size from Recipe snapshots, Inventory snapshots or Product names.
- V5.2 may later compare the V5.1 target with active Shopping and delegate writes to the existing Shopping authority.

## Definite shortage only

For quantitative matcher groups:

`shortageBase = max(requiredBaseQuantity - availableBaseQuantity, 0)`

- `sufficient` -> no purchase target;
- `partial` / `missing` -> may produce a purchase target;
- `unresolved` -> never auto-plan;
- presence-tracked Spice -> excluded from quantitative V5.1 planning;
- Household/corrupt Recipe Product -> fail closed.

## Purchase modes

### Direct

When Product default unit is a direct `count / mass / volume` unit from the same family as the shortage, convert the base shortage into that unit and round **up** to Shopping's 3-decimal precision. Upward rounding must never under-buy.

A mass/volume direct default carrying package-content metadata is treated as ambiguous and fails closed. Production data gates should prevent this state.

### Count-pack

A Product whose purchase default is `pcs` may represent one discrete sellable unit with explicit Product package content, e.g. `Passata mutti: 1 szt. = 700 g`.

When the Recipe shortage family matches that content family:

`purchase pcs = ceil(shortageBase / contentBasePerPiece)`

The result is a whole number of `pcs`. Example: shortage `200 g`, Product `1 szt. = 700 g` -> buy `1 szt.`; shortage `701 g` -> buy `2 szt.`.

When `pcs + package content` is present and the package-content family matches the shortage family (including count), count-pack semantics take precedence so a defined retail pack is bought whole. Direct count remains the fallback only when the explicit package content describes a different family.

### Container

For `package / jar / bottle / can / sachet`, Product package content is mandatory and must resolve to the shortage family.

`purchase containers = ceil(shortageBase / contentBasePerContainer)`

Automatic planning never produces fractional containers.

## Fail-closed states

No automatic purchase target is emitted when:

- Product/default unit cannot be resolved;
- Product is not Recipe-eligible quantitative food;
- matcher group is unresolved;
- Product container lacks package content;
- package-content unit is invalid;
- purchase family is incompatible with shortage family;
- direct mass/volume Product carries ambiguous package-content metadata;
- computed quantity is invalid or outside shared Quantity limits.

The planner returns a typed unresolved reason instead of guessing.

## No Shopping write in V5.1

V5.1 does not:

- insert/update `shopping_items`;
- inspect active Shopping quantities;
- change existing `Dodaj brakujące` UI;
- treat Shopping as physical availability;
- change Product defaults;
- mutate Recipe or Inventory.

Those boundaries are deliberate. V5.2 owns the existing Recipe -> Shopping action upgrade.
