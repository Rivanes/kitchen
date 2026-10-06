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

## Recipe timing metadata

- Preparation time and cooking/baking time are optional whole-minute Recipe metadata.
- Detail shows only stored duration values; absent durations do not produce `0 min` placeholders.
- Timing metadata is rendered separately from the compact servings summary.
- Duration preview/display does not introduce a second Recipe save authority.

## Ingredient cookability + Shopping context

- The ingredient status marker is canonical Recipe matching state: `Wystarczy`, `Częściowo`, `Brak`, or `Nieustalone`.
- Quantity sufficiency is computed only from physical Inventory/Spice presence through the V4.3 shared matcher.
- Active Shopping is secondary procurement context and never counts as physical availability.
- `Na liście zakupów` may be shown as secondary context without changing the matching state.
- A definitely missing Product that is not already active in Shopping may expose the existing explicit Shopping-add action.
- V4.3 never auto-writes partial shortages; computed top-up remains V5.
- Matching state is exposed accessibly in addition to color.

## Contextual Recipe search

- Search is shown only at 8+ Recipes.
- Search matches Recipe names and ingredient Product names.
- Small Recipe collections do not receive permanent search UI.

## Sections

- Structured Recipe sections are Recipe-local identities, not repeated ingredient labels.
- Every Recipe has one mandatory primary section; a new Recipe starts with `Główne`.
- Primary section can be renamed but cannot be deleted or replaced.
- Secondary sections are optional.
- Ingredient section assignment uses fast buttons/chips; no dropdown and no `Bez sekcji`.
- `+ Nowa` exists inside the Add/Edit Ingredient sheet and creates a secondary section only together with ingredient Apply.
- The section manager has no separate `Dodaj sekcję` button.
- Section rename is one section-level edit and immediately affects every linked ingredient in the Recipe draft.
- Duplicate section names after whitespace/case normalization are rejected.
- Empty secondary sections can be removed; non-empty secondary deletion is blocked until ingredients are moved.
- With exactly one section, Recipe Detail omits a redundant section heading.
- With multiple sections, Recipe Detail shows ordered section headings and preserves ingredient order within each section.
- Structured sections must not change serving scaling, Product presence or Recipe -> Shopping behavior.

## Recipe Editor child sheets / save state — V3.6A.1

- Add Ingredient and Edit Ingredient use the same dedicated bottom sheet/modal, never an inline form appended below the section manager.
- The ingredient sheet is outside the parent Recipe `<form>`; nested forms are forbidden.
- Ingredient Cancel is transactional: Product, quantity, unit, note, section, pending new section and staged reorder are all discarded.
- Ingredient Apply changes only the local Recipe draft; final persistence still requires the parent Recipe `Zapisz`.
- Global Recipe Save is not disabled by Product Catalog loading.
- A visible section-rename subdraft must be completed/canceled before final Recipe Save; the UI shows the reason locally.
- Escape from Ingredient Editor closes only Ingredient Editor, not the whole Recipe Editor.
- Ingredient validation errors are rendered in the ingredient sheet, not behind the overlay.

## V4.2 category + discovery UI
- Recipes overview always exposes category filters, even below the contextual-search threshold.
- Category filter composes with text search.
- Recipe list/detail display the stored category.
- Home has always-visible general Recipe discovery plus optional time-aware `Na teraz`.
- Home cards open the canonical Recipe detail.
