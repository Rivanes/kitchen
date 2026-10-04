# V2 Shopping Closeout Contract — V2.7

V2 can close only if the following remain true.

## Shared core

- canonical Product is shared by Inventory and Shopping
- same Product UUID is preserved across Inventory -> Shopping and Shopping -> Inventory
- Product create/resolve/rename/cleanup is one shared authority
- Quantity parse/validate/format/add/step is one shared authority
- Measurement Units are one shared authority
- Storage Location choice is one shared picker in InventoryEditor
- no module creates a derivative implementation of an existing business operation

## Shopping lifecycle

- add/edit/remove active item
- same Product + same unit merge semantics
- active check immediately buys the full active quantity
- purchased quantity can be corrected after purchase
- factual purchased quantity may exceed the earlier plan
- decreasing purchased quantity returns the difference to `Do kupienia`
- restore merges rather than duplicating an equivalent active row
- purchased rows can transfer atomically to Inventory

## Inventory integration

- Inventory -> Shopping uses existing ShoppingEditor/createShoppingItem
- partial/full consume may offer replenishment
- explicit remove never behaves like consume
- Shopping -> Inventory preserves Product UUID, exact purchased quantity and unit
- normal Inventory create and transfer share add_inventory_lot authority

## Mobile

- shared +/- controls work from their initial value
- purchased row remains compact
- storage locations use the shared icon picker
- touch targets remain mobile-friendly
- no raw backend English is rendered in mutation error UI

## Security

- single-owner/RLS authority remains intact
- no V2.7 security relaxation
- no public sign-up or anonymous data access

## Exit gate

- GitHub Kitchen QA PASS
- GitHub Pages deploy PASS
- production/mobile V2.7 smoke PASS
- then V2 becomes PASS / CLOSED and V3 Recipes becomes NEXT
