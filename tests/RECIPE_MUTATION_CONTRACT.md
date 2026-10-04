# Recipe Mutation Contract — V3.3

## Scope

V3.3 owns Recipe metadata CRUD:
- create
- edit
- delete
- one optional cover image

Ingredient mutation does not belong to V3.3.

## Create/edit

Recipe fields:
- name
- base servings
- instructions
- optional private cover image path

Recipe name length:
1..160 after trim.

Servings:
integer 1..999.

## Delete

Recipe delete:
- owner-scoped
- existing database FK cascade removes Recipe ingredient rows
- canonical Products are not deleted
- cover Storage cleanup is best-effort after authoritative DB delete

## Cover path

Database stores only a private Storage object path.

Path:
`owner/recipe/cover-asset.(avif|webp)`

No base64/blob inside Postgres.

## Storage consistency

New/replacement image is uploaded under a new unique object path.
DB path changes only after successful upload.

If DB create/update fails:
newly uploaded cover is removed best-effort.

Old cover is removed only after DB successfully stops referencing it.
