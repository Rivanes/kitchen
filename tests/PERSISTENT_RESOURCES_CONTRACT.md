# V3.8.4 — Persistent Resources + Auto-Replenishment Contract

- Canonical Product role is the persistent membership authority for `Przyprawy` and `Domowe`.
- `inventory_items` remains physical stock only. Do not create fake zero-quantity rows and do not add a parallel tracked-resource table.
- A Spice Product remains visible when missing: `Mam` means a canonical presence marker exists; `Brak` means it does not.
- `Mam -> Brak` transactionally ensures the canonical Product exists on the active Shopping list. `Brak -> Mam` restores presence and does not silently remove Shopping intent.
- A Household Product remains visible at zero. Normal stock changes use mobile-first inline `- / +`, not the full Inventory editor.
- Household stock, minimum-stock policy, Shopping replenishment and quick adjustment all use the Product `default_unit_code`.
- `minimum_stock_quantity` is optional, Product-level, Household-only, and interpreted in `default_unit_code`.
- Home follows SMART UI: show the `Do uzupełnienia` block only when one or more Household Products are at/below minimum. Show `Na liście` instead of a duplicate add action when Shopping already contains the Product.
- Automatic replenishment uses one shared idempotent `ensure_active_shopping_product(...)` authority. It must not increment an existing active Shopping quantity. New automatic Spice rows use `1 pcs`; Household rows use `1` canonical `default_unit_code`.
- Spice state uses `set_spice_presence(...)`; Household quick stock uses `adjust_household_stock(...)`. These are business operations around existing shared authorities, not replacement Inventory save systems.
- `add_inventory_lot(...)` remains the standard Inventory create/merge authority.
- No V4 Recipe matching or quantity-sufficiency logic belongs in V3.8.4.
