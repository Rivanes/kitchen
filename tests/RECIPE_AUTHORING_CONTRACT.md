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

Cancel discards the draft.

Crop `Zastosuj` changes only the authoring draft. It does not have a second persistence authority.

Final Recipe Save uses one `save_recipe_snapshot(...)` database authority for Recipe/section/ingredient state, including both optional duration fields.

The snapshot requires exactly one primary Recipe section, persists section identity, writes contiguous ingredient order 0..N-1 after section-order flattening, and removes rows absent from the final draft.

A new Recipe draft always starts with primary `Główne`. Section add/rename/delete and ingredient section assignment remain local draft operations until final Save. The primary section is never optional and cannot be deleted/replaced.

Delete Recipe remains a separate explicit destructive operation.
