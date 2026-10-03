# Shopping Purchased State Contract — V2.6.3

## State authority
- `shopping_items.is_purchased`, `purchased_at` and `quantity` remain the database source of truth.
- No second completion table/state model is introduced.

## Fast purchase
- Active-row check purchases the entire currently requested quantity immediately.
- No quantity-confirmation modal appears for the common full-purchase path.

## Correct bought quantity after purchase
- Every purchased row exposes `Zmień ilość`.
- Correcting 4 purchased to 3 keeps purchased 3 and returns 1 to `Do kupienia`.
- Correcting upward may consume an equivalent active remainder.
- Correction is atomic through `public.adjust_purchased_shopping_quantity(...)`.

## Restore / undo
- Restore remains atomic through `public.restore_shopping_purchase(...)`.
- Equivalent active identity + unit is merged, never duplicated.

## Presentation
- Active rows remain in `Do kupienia`.
- Purchased rows remain in `Kupione`.
- Purchased rows are newest-first.
- Home/Start count remains active-only.

## Purchased -> Inventory
- Purchased rows preserve the exact corrected quantity for V2.6 transfer.

## Security
- purchase / correction / restore RPCs are `SECURITY INVOKER`
- owner id must equal `auth.uid()` and `public.is_kitchen_owner()` must pass
- anon has no execute privilege
- authenticated has execute privilege
