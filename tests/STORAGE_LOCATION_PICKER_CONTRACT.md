# Storage Location Picker Contract — V2.6.2

- Storage location selection is one shared UI system: `StorageLocationPicker`.
- `InventoryEditor` uses it for normal Inventory create, Inventory edit and Shopping -> Inventory because those flows reuse the same editor.
- Do not add a second storage-location dropdown to another module.
- Each owner location is represented by one touch-friendly icon tile with a visible name.
- Known kinds map consistently: fridge -> fridge, freezer -> freezer, pantry -> pantry, custom -> inventory.
- Current selection is explicit through `aria-checked` and selected styling.
- The underlying value remains the canonical storage location UUID.
