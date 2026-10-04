# Shopping List Contract — V2.3.3

## Navigation/read
- active bottom-nav Shopping view
- owner-scoped active rows
- loading/error/empty states
- search at 8+ rows
- legacy `custom_name` rows remain readable for V2.2 compatibility

## Shared Product authority
- Inventory and Shopping use one Product autocomplete/matching authority
- Inventory and Shopping use one owner-scoped Product catalog loader
- Inventory and Shopping use one resolve/create/rename/cleanup authority
- unknown Shopping names create canonical Product immediately
- current Shopping writes `product_id` and `custom_name = null`
- Product-backed Shopping typo correction renames the same Product UUID
- selecting an existing Product rebinds the Shopping row to that UUID

## Shared quantity/unit authority
- same quantity parser/validator as Inventory/Consume
- max 3 decimals; no scientific notation
- same Measurement Unit loader/type/default resolver
- default count code is `pcs`, never display symbol `szt.`

## Merge/edit/remove
- same Product + same unit may merge on create
- different units never merge implicitly
- edit collision is blocked
- explicit remove remains available

Purchased state and Inventory/Shopping shortcuts remain later V2 stages.


## V2.4 Inventory integration

- Inventory quick-add and post-consume replenishment reuse the same `ShoppingEditor` create surface.
- Inventory does not implement a separate Shopping mutation path.
- seeded create keeps the canonical Product UUID and editable quantity/unit.
- existing `createShoppingItem()` merge behavior remains authoritative.


## V3.5.3 Recipe missing-Product bridge

- Recipe-to-Shopping reuse keeps `createShoppingItem()` as the final add/merge authority.
- canonical batch execution validates inputs first and calls the shared single-item authority sequentially.
- Recipe code must never write `shopping_items` directly.
- existing same Product + same unit merge behavior remains authoritative.
