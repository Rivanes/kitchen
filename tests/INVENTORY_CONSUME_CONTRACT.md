# Inventory Consume / Remove Contract — V1.4 + V1.6.2 + V2.3.3

Required behavior:

- consume is available only for an existing Inventory lot
- quantity uses the shared Kitchen quantity authority
- quantity must be > 0, max 3 decimal places, numeric(12,3)-compatible
- consuming more than current stock is rejected
- partial consume uses `public.consume_inventory_item(uuid,numeric)`
- full consume (`Zużyj wszystko`) uses the same consume RPC path
- exact depletion removes the lot; zero is never persisted
- explicit `Usuń z zapasów` is a separate direct-delete action with confirmation
- explicit removal deletes only `inventory_items`; canonical Product survives
- owner_id + RLS remain authoritative

## Why consume and remove stay separate

They may currently end with the same row disappearing, but they are different business events.
V2.4 may offer `Dodaj do zakupów` after consumption, while explicit removal must not pretend food was consumed.

## Opened-product extension

When the lot has `after_open_days`:
- first partial consumption snapshots opened_at
- opened_use_by_date = opened_at + after_open_days
- later consumption does not move opening forward

No after-open rule -> no invented opened deadline.
