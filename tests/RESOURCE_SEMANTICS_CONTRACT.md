# V3.8 Resource Semantics Contract

V3.8 introduces explicit canonical Product semantics before any V4 Recipe matching.

- `food`: Recipe eligible + quantitative Inventory.
- `spice`: Recipe eligible + presence-only Inventory.
- `household`: Recipe ineligible + quantitative Inventory.
- Product behavior is never inferred from Product names.
- `Przyprawy` and `Domowe` are first-class top-level Inventory sections using the existing `storage_locations` authority.
- A spice has one idempotent Inventory presence marker (`1 pcs`) stored only as an internal representation. The mobile UI exposes persistent `Mam / Brak`, never a tracked gram/count balance.
- Spice Recipe quantities remain normal Recipe authoring data and continue to scale with servings, but V3.8 does not decrement spice Inventory.
- Household Products remain valid in Shopping and Inventory, but are excluded from Recipe Product selection and are rejected by database Recipe persistence.
- Expiry surfaces exclude spices and household resources.
- Reclassification between roles must use the atomic Product resource-semantics authority and must not guess missing quantitative stock.
- V3.8 contains no Recipe sufficiency, shortage calculation or `What Can I Cook?` matching.
