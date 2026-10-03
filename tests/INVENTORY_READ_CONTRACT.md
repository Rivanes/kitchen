# Inventory Read Contract — V1.2 CLOSED / carried by V1.3

Required invariants:

- Authenticated sessions still pass through OwnerGate before AppShell.
- Inventory reads use the public Supabase browser client only.
- Owner-data reads are explicitly filtered by authenticated `owner_id` in addition to database RLS.
- Read model consumes `storage_locations`, `products`, `measurement_units` and `inventory_items`.
- Inventory stock lots are grouped by `storage_location_id`.
- Products and controlled unit symbols are resolved from canonical tables.
- Loading, error and ready/empty states exist.
- Expiry dates may be displayed neutrally; urgency/sorting semantics remain V1.6.
- Shopping and Recipes navigation remains unavailable until their own stages.
