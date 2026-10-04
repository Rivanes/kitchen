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

One pure crop geometry authority converts that source focal point to target-specific cover alignment.

The same renderer is used by:
- list thumbnail
- Recipe detail hero
- authoring preview
- crop previews

The crop editor shows the full source image and maps pointer coordinates into the displayed source rectangle.

## Cleanup

Superseded/deleted cover paths are queued transactionally. Cleanup retries never block Recipe reading. Queue insertion errors are not silently ignored. A cleanup path is checked against current Recipe references before Storage deletion.
