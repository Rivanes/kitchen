# Shared Quantity Stepper Contract — V2.4.1

Kitchen has one shared quantity input interaction for Inventory, Shopping and Consume flows.

## Shared behavior
- manual text entry remains available
- minus and plus buttons reuse the shared Quantity authority
- one tap changes the current unit by exactly 1
- two plus taps turn 4 into 6
- values remain subject to the same max-3-decimal and positive quantity rules
- invalid manual text is never silently rewritten by the stepper
- decrement never creates zero or a negative quantity
- optional `max` clamps increment for bounded flows such as Consume
- touch targets remain at least 44 px

## Reuse
The same `QuantityStepperInput` is used by:
- Inventory add/edit quantity
- Shopping add/edit quantity
- Inventory Consume quantity

No module may create its own plus/minus quantity implementation.

## Persistence
The stepper changes only the form value. Existing shared mutation functions remain the persistence authority.

No SQL/schema/RLS/Auth changes.
