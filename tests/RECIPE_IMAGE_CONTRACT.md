# Recipe Image Contract — current V3

## Processing

- source stays local
- long edge <= 1600 px
- AVIF is attempted first
- WebP is used only when AVIF encoding is unavailable
- raw/original File is never uploaded

## Storage

- private `recipe-images` bucket
- owner-scoped Storage policy
- signed display URLs
- database stores only the object path

## Crop

`cover_focus_x/y` describe one normalized point on the full source image.

One pure crop geometry authority converts that source focal point to an exact pixel layout for the actual rendered container.

The shared renderer measures the actual CSS container and is used by:
- list thumbnail
- Recipe detail hero
- authoring preview
- crop previews

The crop editor shows the full source image and maps pointer coordinates into the displayed source rectangle.

## Aspect consistency

One shared aspect authority defines:
- Recipe hero/editor/crop preview = `RECIPE_COVER_HERO_ASPECT` (16:10)
- list thumbnail = `RECIPE_COVER_THUMBNAIL_ASPECT` (1:1)

The `Widok przepisu` preview inside crop editing MUST use the exact same 16:10 frame and the same pixel-layout renderer as the Recipe editor preview and final Recipe detail hero. The renderer must not accept a separate nominal `targetAspect`; it derives crop geometry from the actual rendered box. What the user sees in crop preview must therefore match what appears after `Zastosuj`.

## Cleanup

Superseded/deleted cover paths are queued transactionally. Cleanup retries never block Recipe reading. Queue insertion errors are not silently ignored. A cleanup path is checked against current Recipe references before Storage deletion.


## SMART empty state

Muted explanatory copy must target only the descriptive copy. It must not style nested labels inside primary action buttons. `Dodaj przepis` remains white/high-contrast on the green primary button.
