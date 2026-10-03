# Inventory Add / Edit Contract — V1.3

V1.3 may create stock and edit an existing stock lot, but it does not consume or delete stock.

Required invariants:

- `owner_id` is explicit in owner-data mutation payloads and RLS remains authoritative.
- New stock reuses an existing canonical Product when the normalized name already exists.
- A genuinely new Product is created once and its selected unit becomes `default_unit_code`.
- Database case-insensitive Product uniqueness remains the final duplicate-safety authority.
- If a newly-created Product cannot receive its first Inventory row, the client attempts to clean up that unused Product identity.
- New Inventory quantity must be > 0 and at most 3 decimal places.
- Quantity zero is rejected; V1.4 owns depletion/removal.
- New Inventory rows use a controlled `unit_code` and an owner Storage Location.
- Adding the same Product to the same location with the same unit and no expiry merges quantity into the existing indistinguishable lot instead of creating duplicate rows.
- Editing a lot changes quantity, controlled unit and location only.
- Editing does not rename the canonical Product.
- Editing does not modify expiry date; V1.6 owns expiry input/semantics.
- No Inventory-item delete operation exists in V1.3.
- Successful create/edit reloads the authoritative Supabase read model.
- Start is contextual and must not duplicate the module navigation already present in the bottom bar.
