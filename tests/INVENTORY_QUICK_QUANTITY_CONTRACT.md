# Inventory Quick Quantity Contract — V5.3.1

## Shared visual authority

`CompactQuantityStepper` is the only compact inline `− / quantity / +` pattern used by both ordinary Inventory and Domowe. The component owns presentation only; it does not own stock business rules.

## Domowe

- Domowe continues to call `adjust_household_stock(...)`.
- Zero may continue to ensure one active Shopping row under the established Household policy.
- No manual Shopping button is added to Domowe.

## Ordinary Inventory

Ordinary food lots use `adjust_inventory_lot_quantity(...)` only when the row is whole-unit stock:

- count / `pcs`;
- package;
- jar;
- bottle;
- can;
- sachet.

Mass and volume rows (`g`, `kg`, `ml`, `l`) do not expose the quick stepper.

The RPC changes exactly one physical lot by `-1` or `+1`, preserves its package snapshot, location, expiry and opening metadata, and deletes the exact lot at zero. It must never call the consumption lifecycle.

`+1` is unavailable for an already-opened lot because a new unopened physical unit must not be merged into an opened lifecycle state. `-1` may remain available as an exact stock correction.

## Product package default assist

Creating a new container lot with explicit package content continues to seed a missing Product default through the existing `add_inventory_lot(...)` authority.

When editing a legacy resolved container lot whose Product default is still NULL **and whose Product default purchase unit matches the lot unit**, the editor offers a default-on explicit choice to reuse the saved lot content as the Product default for future purchases. A mismatched lot unit must not silently reinterpret the Product's purchase unit. Existing non-NULL Product defaults are never overwritten silently.

## Shopping boundary

- Ordinary Inventory keeps its existing manual add-to-Shopping action beside the compact stepper.
- Quick decrement does not automatically add anything to Shopping.
- Recipe purchase planning V5.1/V5.2 remains unchanged.
