# Shopping -> Inventory Contract — V2.6

## One-system rule
- Shopping does not implement its own Inventory create/merge algorithm.
- Normal Inventory create and Shopping transfer share `public.add_inventory_lot(...)`.
- The Shopping bridge reuses `InventoryEditor` for location, expiry and after-open configuration.

## Identity and quantity
- Current Shopping rows use the canonical Product UUID.
- Transfer preserves the exact purchased `product_id`.
- Transfer preserves the exact purchased quantity recorded by V2.5.1.
- Transfer preserves the purchased measurement unit.
- Product, quantity and unit are not editable during transfer.

## Transfer lifecycle
- User starts transfer from a row in `Kupione`.
- User chooses storage location and may set expiry / after-open days.
- Database atomically adds/merges the Inventory lot and removes the purchased Shopping fragment.
- If Inventory persistence fails, the purchased Shopping fragment remains unchanged.
- After success, the transferred row disappears from `Kupione`.

## Merge semantics
`public.add_inventory_lot(...)` may merge only when all are equal:
- owner
- canonical Product
- location
- unit
- declared expiry (including null)
- after-open days (including null)
- destination lot is unopened

Otherwise a new Inventory lot is created.

## Legacy custom Shopping rows
- Current UI no longer creates `custom_name` identities.
- A purchased legacy row without `product_id` fails closed for direct Inventory transfer.
- It must be restored/re-saved through the shared Product system rather than creating a second identity path.

## Security
- both V2.6 RPCs are `SECURITY INVOKER`
- owner id must match `auth.uid()` and `public.is_kitchen_owner()`
- RLS remains active
- anon cannot execute
- authenticated owner may execute
