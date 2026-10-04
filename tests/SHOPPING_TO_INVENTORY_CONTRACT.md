# Shopping -> Inventory Contract — V2.6 + V3.6B

## One-system rule
- Shopping does not implement its own Inventory create/merge algorithm.
- Normal Inventory create and Shopping transfer share `public.add_inventory_lot(...)`.
- The Shopping bridge reuses `InventoryEditor` for location, expiry, after-open configuration and package-content resolution.

## Identity and quantity
- Current Shopping rows use the canonical Product UUID.
- Transfer preserves the exact purchased `product_id`.
- Transfer preserves the exact purchased quantity recorded by V2.5.1.
- Transfer preserves the purchased measurement unit.
- Product, quantity and row unit are not editable during transfer.

## V3.6B package semantics
- Direct row units (`count`, `mass`, `volume`) carry no package-content pair.
- Container row units (`package`, `jar`, `bottle`, `can`, `sachet`) must resolve the content of one physical container before a new Inventory lot is written.
- The transfer sheet may prefill content from the canonical Product default, but the value written to Inventory is a physical lot snapshot.
- An explicit value entered during transfer overrides the Product default for that Inventory lot.
- Changing a Product default later must not reinterpret or rewrite an existing Inventory-lot snapshot.
- Package content may target only controlled direct count/mass/volume units.
- No Product-name parsing or inferred package size is allowed.

## Transfer lifecycle
- User starts transfer from a row in `Kupione`.
- User chooses storage location and may set expiry / after-open days.
- For a container unit, the user also resolves package content when no usable default exists or when this purchase differs from the default.
- Database atomically adds/merges the Inventory lot and removes the purchased Shopping fragment.
- If Inventory persistence fails, the purchased Shopping fragment remains unchanged.
- After success, the transferred row disappears from `Kupione`.

## Merge semantics
`public.add_inventory_lot(...)` may merge only when all are equal:
- owner
- canonical Product
- location
- row unit
- declared expiry (including null)
- after-open days (including null)
- package-content value (including null for direct units)
- package-content unit (including null for direct units)
- destination lot is unopened

Two container lots such as `1 opak. = 1 l` and `1 opak. = 2 l` must never merge.

## Legacy custom Shopping rows
- Current UI no longer creates `custom_name` identities.
- A purchased legacy row without `product_id` fails closed for direct Inventory transfer.
- It must be restored/re-saved through the shared Product system rather than creating a second identity path.

## Security
- shared Inventory-add and Shopping-transfer RPCs are `SECURITY INVOKER`
- owner id must match `auth.uid()` and `public.is_kitchen_owner()`
- RLS remains active
- anon cannot execute
- authenticated owner may execute

## RPC result typing authority
- Custom Supabase RPC payloads are treated as `unknown` at the boundary because this repository does not use generated Database types.
- Inventory create and Shopping -> Inventory must use the same `requireInventoryItemId()` runtime decoder.
- Callers must not directly access `result.data.inventory_item_id` on an untyped RPC response.
