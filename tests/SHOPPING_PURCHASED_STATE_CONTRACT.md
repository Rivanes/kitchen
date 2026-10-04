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
- Correcting upward consumes an equivalent active remainder first, but an insufficient or missing remainder must not cap the factual purchased quantity.
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


## V2.6.5 overpurchase rule

Purchased quantity records what was actually bought, even when that is more than the earlier Shopping plan.

Required example:
- bought row = 3
- matching active remainder = 1
- correction target = 5
- result = bought 5, active remainder 0

The missing extra 1 is valid overpurchase and must not cause an error.

If there is no matching active remainder at all, increasing a purchased row is still allowed.

Decreasing a purchased row keeps the established rule: the difference is returned/merged into `Do kupienia`.
