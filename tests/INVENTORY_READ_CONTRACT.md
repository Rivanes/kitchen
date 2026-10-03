# Inventory Read Contract — V1.2

V1.2 is a read-only Inventory UI stage.

Required invariants:

- Authenticated sessions still pass through OwnerGate before AppShell.
- Inventory reads use the public Supabase browser client only.
- Owner-data reads are explicitly filtered by the authenticated `owner_id` in addition to database RLS.
- V1.2 performs no insert/update/upsert/delete Inventory operations.
- Read model consumes `storage_locations`, `products`, `measurement_units` and `inventory_items`.
- Every configured storage location is rendered even when it contains no stock lots.
- Inventory stock lots are grouped by `storage_location_id`.
- Products and controlled unit symbols are resolved from canonical tables; stock names/units are not reconstructed from free text.
- Loading, error and ready/empty states exist.
- Expiry dates may be displayed neutrally as stored calendar dates; urgency/sorting semantics are deferred to V1.6.
- Quantity display never changes database precision or writes normalized values back.
- Shopping and Recipes navigation remains unavailable until their own stages.
