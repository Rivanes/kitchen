# Shopping Purchased State Contract — V2.5.1

## State authority
- `shopping_items.is_purchased`, `shopping_items.purchased_at` and `shopping_items.quantity` remain the database source of truth.
- No separate completion table or second Shopping state model is introduced.
- Purchased quantity transitions are atomic database operations.

## Partial purchase
- Marking an active row bought opens one shared quantity sheet.
- The purchased amount defaults to the full requested quantity.
- The existing shared `QuantityStepperInput` controls +/- and manual input.
- Purchased amount must be > 0 and <= the currently active quantity.
- Full purchase marks the existing row purchased.
- Partial purchase keeps the remainder active and creates a purchased sibling row for the exact bought amount.
- Example: planned 4, bought 3 -> active 1 + purchased 3.

## Restore / undo
- Restore is atomic.
- If no equivalent active row exists, the purchased row becomes active again.
- If an equivalent active Product/custom identity + unit exists, restore adds the purchased quantity back to that active row and removes the purchased fragment.
- Restore must never create a duplicate equivalent active row.

## Presentation
- Active rows remain in `Do kupienia`.
- Purchased rows remain in `Kupione`.
- Purchased rows are newest-first.
- Home/Start count remains active-row-only.
- `Wszystko kupione` appears only when no active remainder remains.

## Future V2.6
- Purchased rows preserve the exact quantity actually bought for Purchased -> Inventory transfer.
- V2.5.1 does not create Inventory lots.

## Security
- purchase/restore RPCs are `SECURITY INVOKER`
- explicit owner id must equal `auth.uid()`
- RLS + `public.is_kitchen_owner()` remain authoritative
- anon has no execute privilege
- authenticated has execute privilege
