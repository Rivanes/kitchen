# Recipe Cover SMART Contract — V3.4.1

## Information hierarchy

Normal Recipe editing must not expose:
- AVIF/WebP implementation explanation
- Storage terminology
- encoded byte-size/dimension diagnostics

Optimization remains automatic.

## Action hierarchy

- gallery and camera share one compact row
- `Ustaw kadr` spans the full cover-control width
- remove remains a separate full-width destructive action

## Crop persistence

For an existing Recipe:
`Zapisz kadr` persists focal coordinates immediately.

It must:
1. update `cover_focus_x/y` through the existing Recipe mutation authority;
2. scope update by owner + Recipe;
3. read back stored coordinates;
4. fail if persistence cannot be confirmed;
5. update current list/detail UI state immediately.

The user must NOT need the parent Recipe `Zapisz` button to persist crop.

For a new unsaved Recipe:
crop remains local and is stored when the Recipe is created.

## Required smoke

Edit existing Recipe -> change crop -> Zapisz kadr -> close Recipe editor with Anuluj -> detail and list retain new crop -> browser refresh -> crop still retained.
