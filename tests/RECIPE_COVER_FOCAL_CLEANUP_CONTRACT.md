# Recipe Cover Focal + Cleanup Contract — V3.4

## Focal point

One normalized focal point is stored on Recipe:
- cover_focus_x
- cover_focus_y

Range:
0..1.

The same focal point controls:
- Recipe list thumbnail
- Recipe detail hero

Changing focal point does not re-encode/upload the image.

Crop editor previews both aspect ratios.

## Durable Storage cleanup

A cover path that stops being referenced must be queued in:
`recipe_image_cleanup_queue`.

Database authorities:
- `update_recipe_with_cover_cleanup(...)`
- `delete_recipe_with_cover_cleanup(...)`

These queue the old cover in the same database transaction as the Recipe state change.

Client:
- tries Storage removal immediately;
- removes queue row only after Storage removal succeeds;
- retries queued cleanup on later Recipe loads.

If a newly uploaded image becomes orphaned because DB save fails:
direct removal is attempted; failed removal is queued.

This avoids losing track of old cover files and prevents Storage from silently filling with orphaned images.
