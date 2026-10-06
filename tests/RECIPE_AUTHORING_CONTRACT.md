# Recipe Authoring Contract — current V3

One Recipe authoring draft owns:
- name
- servings
- optional preparation time
- optional cooking/baking time
- cover change
- source focal point
- structured Recipe-local sections
- ingredient draft/order and section identity
- preparation instructions

Canceling the whole Recipe editor discards the Recipe draft.

Crop `Zastosuj` changes only the authoring draft. It does not have a second persistence authority.

Final Recipe Save uses one `save_recipe_snapshot(...)` database authority for Recipe/section/ingredient state, including both optional duration fields.

The snapshot requires exactly one primary Recipe section, persists section identity, writes contiguous ingredient order 0..N-1 after section-order flattening, and removes rows absent from the final draft.

A new Recipe draft always starts with primary `Główne`. Section rename/delete and ingredient section assignment remain local draft operations until final Save. The primary section is never optional and cannot be deleted/replaced.

## Ingredient child-draft boundary — V3.6A.1

Add/Edit Ingredient is a dedicated `RecipeIngredientEditorSheet` rendered outside the parent Recipe `<form>`.

The ingredient sheet owns all transient ingredient fields and local validation. `Dodaj/Zastosuj` commits one child result to the parent Recipe draft; it does not persist to Supabase. `Anuluj` must leave parent ingredients, sections and order unchanged.

Creating a secondary section from ingredient `+ Nowa` is transactional with ingredient Apply: the pending section is not added to parent Recipe state until the ingredient is applied. Canceling the ingredient therefore cannot leave an empty orphan section.

Ingredient `Wyżej/Niżej` stages a target order inside the child draft. Parent ingredient order changes only on `Zastosuj`; Cancel preserves the original order.

The section manager does not own a separate `Dodaj sekcję` action. It owns rename and safe empty-secondary deletion only. New secondary sections are created in the context of an ingredient.

Final Recipe Save must not depend on Product Catalog loading. Product/Unit readiness gates ingredient authoring only. If a section rename subdraft is open, the UI must show that it has to be completed or canceled before final Recipe Save.

Ingredient validation errors belong inside the ingredient sheet. Section rename errors belong beside section rename. Final Recipe/snapshot errors belong to the parent Recipe editor.

## V4.1 container ingredient snapshot
Container Recipe units expose one compact `Zawartość 1 …` block inside the existing Ingredient child sheet. The value/unit is part of the child draft and is committed to the parent only by `Dodaj/Zastosuj`.

Direct units clear package-content draft metadata. Container units require it. A valid Product default may prefill a new snapshot, but editing an existing ingredient starts from its stored Recipe snapshot and never reinterprets it from Product defaults.

## V4.2 category authoring
- Every Recipe save includes exactly one explicit category.
- Create has no implicit default category.
- Edit preloads the stored category.
- Category persists atomically through `save_recipe_snapshot(...)`; no direct second Recipe update is allowed.

