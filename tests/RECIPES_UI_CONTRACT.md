# Recipes UI Contract — current V3

- Recipe list/detail are read surfaces.
- Detail has exactly one Recipe edit entry point.
- Detail does not mutate ingredients directly.
- Recipe authoring owns metadata, cover/crop, ingredients and preparation.
- Zero ingredients does not create an educational intermediate screen.
- Empty-state and primary actions use normal household language.
- Start does not duplicate the Recipes module navigation.

## Servings preview

- Recipe base servings remain canonical stored data.
- Detail may preview a target serving count from 1..999.
- Preview scaling is read-only and must not mutate Recipe, Product, Shopping or Inventory data.
- Ingredient display quantity is scaled from base quantity and base servings.
- A changed target exposes a concise reset to the base serving count.
- The base servings state stays in one compact horizontal summary row on mobile.
- Ingredient count is not repeated inside the detail servings summary because the ingredient list is immediately below it.

## Contextual Recipe search

- Search is shown only at 8+ Recipes.
- Search matches Recipe names and ingredient Product names.
- Small Recipe collections do not receive permanent search UI.

## Sections

- `section_label` remains lightweight presentation metadata.
- V3.5 does not introduce a separate Recipe section entity.
- If named sections exist, unlabeled ingredient blocks may display as `Pozostałe składniki`.
- Presentation must never reorder canonical ingredient order.
