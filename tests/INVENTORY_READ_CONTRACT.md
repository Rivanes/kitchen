# Inventory Read Contract — V1.2 carried forward through V3.6B

Required invariants:

- Authenticated sessions still pass through OwnerGate before AppShell.
- Inventory reads use the public Supabase browser client only.
- Owner-data reads are explicitly filtered by authenticated `owner_id` in addition to database RLS.
- Read model consumes `storage_locations`, `products`, `measurement_units` and `inventory_items`.
- Inventory stock lots are grouped by `storage_location_id`.
- Products and controlled unit symbols are resolved from canonical tables.
- V3.6B reads Product default package-content metadata and each Inventory lot's own resolved package-content snapshot separately.
- A physical lot displays/uses its own snapshot; it must never be reinterpreted from the Product's current default during reads.
- Legacy unresolved container lots may read with a null snapshot and must not be guessed from Product names.
- Loading, error and ready/empty states exist.
- Expiry dates use the established V1.6 semantics.
