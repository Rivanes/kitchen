# Recipe Cover Image Contract — V3.3

## Input

Mobile UI provides:
- choose from gallery
- take photo (`capture="environment"`)
- preview
- replace
- remove

## Processing

One authority:
`src/features/recipes/recipeImageProcessor.ts`

Before upload:
- source is decoded locally
- SVG is rejected
- long edge is reduced to <= 1600 px
- output target is <= 1.5 MiB
- AVIF is attempted first
- WebP is used only when AVIF encoding is unavailable
- raw/original File is never uploaded

If a safe AVIF/WebP output cannot be generated:
fail instead of uploading the original.

## Storage

Bucket:
`recipe-images`

Requirements:
- private
- owner scoped
- authenticated policies
- max object size 2 MiB
- allowed MIME only AVIF/WebP

Display uses signed URLs.
No public bucket URL.
