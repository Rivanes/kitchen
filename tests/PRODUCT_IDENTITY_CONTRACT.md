# Canonical Product Identity Contract — V2.3.3 + V3.6B

A Product is created once and referenced by UUID across Kitchen.

One shared Product authority owns:
- owner-scoped catalog loading
- normalization/exact matching/autocomplete
- resolve/create
- rename/settings update
- optional Product default package-content metadata
- failed-dependent-write cleanup
- uniqueness-race recovery

Inventory, Shopping and Recipes must not keep private Product CRUD variants.

Unknown names create canonical Product once.
Existing names reuse the same UUID.
Product-backed Shopping typo correction renames the same UUID.
Current Shopping UI writes product_id, not a second ad-hoc identity.
Legacy custom_name remains schema/read compatibility only.

V3.6B package-content default does **not** become part of Product identity. Two physical package sizes of the same Product remain the same canonical Product and are distinguished at the Inventory-lot snapshot/merge level.
