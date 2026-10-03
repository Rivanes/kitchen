# Product Rename Contract — shared authority (V2.1 + V2.3.3)

Canonical Product rename is a Kitchen-wide operation.

## Identity
- Rename updates the existing `public.products` row.
- Product UUID never changes.
- Inventory, Shopping and future Recipe references keep the same identity.
- Rename must never be delete + recreate.

## Shared authority
- Product rename lives in `src/features/products/productCatalogMutations.ts`.
- Inventory must not own a private rename implementation.
- Shopping must not create a replacement Product merely to correct an unmatched typo on a Product-backed row.
- Editing a Product-backed Shopping row to an unmatched name renames the same canonical Product.
- Selecting another existing Product rebinds that Shopping row instead of renaming either Product.

## Validation/collisions
- trim + repeated-whitespace collapse
- 1–120 characters
- normalized collision with another Product is rejected
- database `23505` remains the race-authority
- same identity may no-op; casing may be corrected

## UI
- Inventory keeps an explicit compact rename sub-flow.
- Product rename remains visibly distinct from stock-lot fields.
- Shopping communicates when changing an unmatched Product name will update that Product everywhere.

## Security
No SQL/schema/RLS/Auth change is required.
All Product writes scope Product id + owner_id and remain under RLS.
