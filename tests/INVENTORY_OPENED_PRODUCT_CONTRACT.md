# Inventory Opened Product Contract — V1.6.2

## After-open rule
A stock lot can optionally define `after_open_days`.
This rule is lot-specific because package/container shelf life can differ even for the same canonical Product.

## Automatic opening
- Partial consumption of a lot with `after_open_days` marks it opened.
- `opened_at` is set only once.
- `opened_use_by_date = opened_at + after_open_days` is snapshotted.
- Exact depletion deletes the lot and does not need an opened state.
- Lots without an after-open rule are not automatically marked opened.

## Effective expiry
The effective deadline is the earlier of declared expiry and opened-use-by date.
Opening must never extend a manufacturer's earlier declared expiry date.

## Merge invariant
New stock must never merge into an already-open lot.
Merge requires same Product, location, unit, declared expiry, after-open rule and unopened state.

## Security
The consume RPC is SECURITY INVOKER and remains under owner_id + RLS authority.
Anonymous users cannot execute it.
