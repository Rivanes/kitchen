# Canonical Product Identity Contract — V2.3.2

A Product is created once and referenced by UUID across Kitchen.

Both Inventory and Shopping must call resolveOrCreateCanonicalProduct.
Unknown names create canonical Product once.
Existing names reuse the same UUID.
Owner scoping and 23505 uniqueness-race recovery remain mandatory.
Current Shopping UI writes product_id, not a second ad-hoc identity.
