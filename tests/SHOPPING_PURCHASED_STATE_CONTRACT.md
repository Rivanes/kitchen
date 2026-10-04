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


## V2.6.4 purchased-row density

- `Zmień ilość` remains post-purchase only.
- The action is a sibling of the product copy, not a vertical child beneath name/quantity.
- Purchased tiles remain compact single rows on normal mobile widths.
- The action reuses the compact borderless accent treatment proven in V2.6.2.
- Below 360px the action may collapse to its edit icon while retaining an accessible label and >=44px target.
- The Inventory transfer action remains separately tappable.
