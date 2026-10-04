# Recipe Structured Sections Contract — V3.6A + V3.6A.1

Recipe sections are real Recipe-local identities stored in `recipe_sections`.

## Core invariants

- Every Recipe has exactly one mandatory primary section.
- The primary section is always first (`sort_order = 0`).
- The primary section cannot be deleted or replaced by another section identity.
- Secondary sections are optional.
- Every Recipe ingredient references exactly one section from the same Recipe and owner through `section_id`.
- `recipe_sections.name` is the section-name authority.
- `recipe_ingredients.section_id` + `recipe_sections` are the only Recipe section authority after V3.7 closeout.
- The legacy `recipe_ingredients.section_label` compatibility column no longer exists.

## Authoring

- A new Recipe draft starts immediately with primary section `Główne`.
- The primary section can be renamed.
- Section rename changes one section object/record; ingredients remain linked by section identity.
- Section names are normalized for whitespace and compared case-insensitively inside one Recipe.
- Duplicate normalized section names are rejected.
- An empty secondary section may be deleted.
- A secondary section containing an ingredient cannot be deleted until its ingredients are moved elsewhere.
- Section rename/delete remain local Recipe draft operations until the single final `save_recipe_snapshot(...)` commit.
- Ingredient section assignment uses fast button/chip choices, not a dropdown and not free-text per ingredient.
- New ingredients default to the primary section.
- `Bez sekcji` no longer exists.

## V3.6A.1 section-creation UX

- The section manager has no independent `Dodaj sekcję` authority.
- A secondary section is created only from ingredient authoring via `+ Nowa`.
- `+ Nowa` starts a pending child draft, not a parent-state mutation.
- Pending section creation and ingredient Apply commit together to the Recipe draft.
- Canceling Add/Edit Ingredient discards the pending section.
- Existing sections remain one-tap chips for assignment.
- Whole-section rename remains a manager operation because section identity is first-class.

## Presentation/order

- A Recipe with one section does not show a redundant section heading in Recipe Detail.
- A Recipe with multiple sections shows headings in section order.
- Ingredient order is preserved within each section.
- Final Recipe Save flattens sections in section order and writes one contiguous global ingredient `sort_order`.

## V3 closeout

- Legacy V3.5 section labels were migrated only when their contiguous block topology was unambiguous.
- Migration never silently reordered ingredients.
- V3.7 removes the rollout-only `section_label` column and the V3.5.3 snapshot compatibility signature.
- The structured snapshot signature with `p_sections` + `p_ingredients` is the only Recipe save authority.
- V3 closeout does not perform Recipe matching, unit-aware sufficiency or shortage calculation.
