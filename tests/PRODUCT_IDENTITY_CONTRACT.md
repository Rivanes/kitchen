# Canonical Product Identity Contract — V2.3.3

A Product is created once and referenced by UUID across Kitchen.

One shared Product authority owns:
- owner-scoped catalog loading
- normalization/exact matching/autocomplete
- resolve/create
- rename
- failed-dependent-write cleanup
- uniqueness-race recovery

Inventory and Shopping must not keep private Product CRUD variants.

Unknown names create canonical Product once.
Existing names reuse the same UUID.
Product-backed Shopping typo correction renames the same UUID.
Current Shopping UI writes product_id, not a second ad-hoc identity.
Legacy custom_name remains schema/read compatibility only.
