# Inventory Add / Edit Contract — V1.3 carried forward through V3.6B

Inventory may create stock and edit an existing physical stock lot.

Required invariants:

- `owner_id` is explicit in owner-data mutation payloads and RLS remains authoritative.
- New stock reuses an existing canonical Product when the normalized name already exists.
- A genuinely new Product is created once and its selected unit becomes `default_unit_code`.
- Database case-insensitive Product uniqueness remains the final duplicate-safety authority.
- If a newly-created Product cannot receive its first Inventory row, the client attempts to clean up that unused Product identity.
- Inventory quantity must be > 0 and at most 3 decimal places.
- Quantity zero is rejected; Consume owns depletion/removal.
- Inventory rows use a controlled `unit_code` and an owner Storage Location.
- Successful create/edit reloads the authoritative Supabase read model.

## V3.6B package semantics

- Direct stock units (`count`, `mass`, `volume`) must have no package-content snapshot.
- New container stock (`package`, `jar`, `bottle`, `can`, `sachet`) must resolve the content of one container.
- Explicit lot content wins over the Product default.
- A Product default may prefill a new lot but is not the authority for an already-created physical lot.
- Editing a Product default must never retroactively alter existing Inventory-lot snapshots.
- Existing legacy unresolved container lots remain readable/usable and can be resolved explicitly when edited.
- A resolved container lot cannot be changed back to unresolved semantics.
- Changing a direct lot into a container unit requires package content in the same save.
- Package content uses shared Quantity precision and controlled direct count/mass/volume Measurement Units.
- Merge identity includes package-content value and unit in addition to Product, location, row unit, expiry, after-open days and unopened state.

## Product settings vs physical lot settings

- Canonical Product name/default package content are Product-wide settings.
- Quantity, row unit, location, expiry, after-open days and package-content snapshot describe the physical Inventory lot.
- Product settings and physical-lot fields must remain visibly distinct in UI.
- Editing stock must not silently reinterpret another lot of the same Product.
