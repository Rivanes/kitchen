# V3.8.2 Special Resource Create Contract

V3.8.2 corrects create orchestration for the first-class `Przyprawy` and `Domowe` Inventory sections.

- The section from which Add Product is opened is the stable **target role** for that create sheet.
- An exact canonical Product match never silently rewrites the target role or routes the sheet to another Inventory section.
- `Przyprawy` targets `spice`; `Domowe` targets `household`.
- A genuinely new canonical Product is created with the target role through the existing canonical Product authority.
- An existing Product with the same role is reused by UUID.
- An existing Product with a different role creates an explicit mobile-first mismatch state before Inventory submit.
- Role conversion reuses `set_product_resource_semantics(...)`.
- Final Inventory create/merge still uses only `add_inventory_lot(...)` through `createInventoryLot()`.
- A role mismatch must block final Inventory submit until it is resolved.
- No duplicate canonical Product may be created to avoid a role mismatch.
- No new spice-specific or household-specific Inventory save function exists.
- Known role mismatch is not reduced to a generic `Nie udało się dodać zapasu.` backend failure.
- V3.8.2 does not add Recipe matching, sufficiency or automatic consumption.
