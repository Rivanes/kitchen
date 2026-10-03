# Product Rename Contract — V2.1

V2.1 introduces safe editing of the canonical Product name before Shopping List work begins.

## Identity

- Renaming updates the existing `public.products` row.
- The Product UUID must not change.
- Existing Inventory lots therefore keep their `product_id` references.
- Renaming must never be implemented as delete + recreate.

## Validation and collisions

- Product names are trimmed and repeated whitespace is collapsed before persistence.
- Name length remains 1–120 characters.
- A case-insensitive / normalized collision with another Product is rejected.
- Database unique-constraint race (`23505`) is translated into a useful user-facing collision message.
- Renaming a Product to the same identity is allowed as a no-op; display casing may still be corrected.

## UI

- Rename is available only from edit mode through a compact pencil action next to the Product title.
- Opening rename switches the sheet into a dedicated rename state rather than adding another permanent row to the already dense mobile editor.
- Rename has its own save/cancel actions and is intentionally separate from the Inventory-lot save transaction.
- The UI explains that the canonical name applies to every stock lot of that Product.
- A successful rename closes the editor and reloads the Inventory read model.

## Security

No SQL/schema/RLS/Auth change is required for V2.1.
The existing `products_update_owner` RLS policy and authenticated UPDATE grant remain the authority.
Every browser mutation still scopes both Product `id` and `owner_id`.
