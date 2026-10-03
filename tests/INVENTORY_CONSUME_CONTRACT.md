# Inventory Consume / Remove Contract — V1.4 + V1.6.2

Required behavior:

- consume is available only for an existing Inventory lot
- consume quantity must be > 0 and may use at most 3 decimal places
- consuming more than the current lot quantity is rejected
- consuming the exact remaining quantity deletes the lot; quantity zero is never persisted
- `Zużyj wszystko` remains an explicit full-depletion action
- explicit `Usuń z zapasów` requires confirmation
- removal deletes only `inventory_items`; the canonical Product is retained for future reuse
- existing owner_id + RLS authorization remains authoritative

## V1.6.2 opened-product extension

Partial consumption is delegated to `public.consume_inventory_item(uuid,numeric)`.
The function is SECURITY INVOKER and therefore preserves RLS.

When the lot has `after_open_days`:
- first partial consumption snapshots `opened_at = current_date`
- `opened_use_by_date = opened_at + after_open_days`
- later partial consumption does not move the original opened date forward

When no after-open rule exists, partial consumption does not invent an opened deadline.
