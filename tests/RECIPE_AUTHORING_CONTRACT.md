# Recipe Authoring Contract — V3.4.2

One Recipe authoring draft owns:
- name
- servings
- cover change
- source focal point
- ingredient draft/order
- preparation

Cancel discards the draft.

Crop `Zastosuj` changes only the authoring draft. It does not have a second persistence authority.

Final Recipe Save uses one `save_recipe_snapshot(...)` database authority for Recipe/ingredient state.

The snapshot writes contiguous ingredient order 0..N-1 and removes rows absent from the final draft.

Delete Recipe remains a separate explicit destructive operation.
