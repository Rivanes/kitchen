# Inventory -> Shopping Integration Contract — V2.4

Kitchen must not create a second add-to-shopping system.

## Quick add from Inventory

- every Inventory lot row exposes a compact `Dodaj do listy zakupów` action
- the action opens the existing `ShoppingEditor` create surface
- canonical Product is preselected by Product UUID
- Product catalog and Measurement Units come from the same shared authorities already used by Inventory/Shopping
- quantity/unit remain editable before save
- final create/merge remains owned by `createShoppingItem()`
- if the same Product + same unit already exists on the active list, existing Shopping merge semantics apply

## After consume

- partial consume and full consume are successful `consume_inventory_item` events
- after success, Inventory shows a non-blocking replenishment offer
- accepting the offer opens the same seeded `ShoppingEditor`
- declining the offer leaves Shopping unchanged
- explicit `Usuń z zapasów` is not a consume event and must not show the replenishment offer

## Product identity

- Inventory -> Shopping uses the same canonical Product UUID
- it must never create another Product row for the transfer
- Product rename remains shared globally

## Architecture

Inventory may orchestrate the UI, but it must not import or duplicate Shopping create/merge mutation rules.
The Shopping editor and `createShoppingItem()` remain the single Shopping-add authority.

## Database

V2.4 requires no SQL/schema/RLS/Auth changes.
