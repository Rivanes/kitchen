# Recipe Authoring Contract — current V3

One Recipe authoring draft owns:
- name
- servings
- optional preparation time
- optional cooking/baking time
- cover change
- source focal point
- ingredient draft/order
- per-ingredient lightweight section label
- preparation instructions

Cancel discards the draft.

Crop `Zastosuj` changes only the authoring draft. It does not have a second persistence authority.

Final Recipe Save uses one `save_recipe_snapshot(...)` database authority for Recipe/ingredient state, including both optional duration fields.

The snapshot writes contiguous ingredient order 0..N-1 and removes rows absent from the final draft.

Section labels are selected/reused from the current Recipe draft and remain presentation metadata on each ingredient. V3.5.2 does not create section identity, section-level persistence or a `recipe_sections` authority.

Delete Recipe remains a separate explicit destructive operation.
