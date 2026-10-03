# Shopping List Contract — V2.3

## Navigation
- `Zakupy` is an active bottom-navigation destination.
- Start has a contextual shortcut to the active Shopping List.
- Shopping is not duplicated as a disabled `Wkrótce` preview.

## Read
- read only owner-scoped `shopping_items`
- V2.3 shows active rows (`is_purchased = false`)
- loading, error and empty states are explicit
- search appears only at 8+ active rows

## Add
- name, positive quantity and controlled unit are required
- exact normalized match to an existing canonical Product stores `product_id`
- otherwise the row stores a trimmed `custom_name`
- create merges only the same active identity + same unit
- no raw comparison between different units

## Edit / remove
- item name, quantity and unit are editable
- changing name may switch canonical/custom identity intentionally
- edit refuses a same-identity + same-unit collision with another active row
- explicit remove is available with confirmation

## Not yet in V2.3
- purchased check-off
- purchased history/group
- purchased -> Inventory transfer

These belong to the following Shopping stages.

## Security
V2.3 adds no SQL and does not weaken V2.2 owner/RLS authority.
