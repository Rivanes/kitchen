# Product Settings / Rename Contract — shared authority (V2.1 + V2.3.3 + V3.6B)

Canonical Product rename is a Kitchen-wide operation. V3.6B extends the same Product-settings authority with optional default package content.

## Identity
- Rename updates the existing `public.products` row.
- Product UUID never changes.
- Inventory, Shopping and Recipe references keep the same identity.
- Rename must never be delete + recreate.
- Package-content defaults are metadata on the same Product UUID and do not affect identity matching.

## Shared authority
- Product rename/settings update lives in `src/features/products/productCatalogMutations.ts`.
- Inventory must not own a private Product-settings implementation.
- Shopping must not create a replacement Product merely to correct an unmatched typo on a Product-backed row.
- Editing a Product-backed Shopping row to an unmatched name renames the same canonical Product.
- Selecting another existing Product rebinds that Shopping row instead of renaming either Product.

## V3.6B default package content
- Product may store zero or one complete default pair: value + direct Measurement Unit.
- Partial pairs are rejected.
- Value uses shared positive Quantity rules.
- Unit must belong to count/mass/volume; a household container unit cannot describe another container's content.
- Changing/clearing a Product default affects only future resolution/prefill and must not rewrite existing Inventory-lot snapshots.

## Validation/collisions
- trim + repeated-whitespace collapse
- 1–120 characters
- normalized collision with another Product is rejected
- database `23505` remains the race-authority
- same identity may no-op; casing may be corrected

## UI
- Inventory keeps an explicit compact Product-settings sub-flow separate from stock-lot fields.
- Product rename/default-package settings remain visibly distinct from physical Inventory quantity/unit/location semantics.
- Shopping communicates when changing an unmatched Product name will update that Product everywhere.

## Security
All Product writes scope Product id + owner_id and remain under RLS. V3.6B does not relax Product RLS/Auth rules.
