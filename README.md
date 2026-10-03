# Kitchen

Private, single-user mobile-first PWA for household inventory, shopping and recipes.

Current runtime baseline: **V1.6 — Expiry UX (QA pending)**.

Active Inventory capabilities:
- owner-scoped stock read model
- add/edit stock
- consume/remove stock
- Zapasy overview
- dedicated storage location views (Lodówka / Zamrażarka / Szafka-spiżarnia)
- contextual search for larger location inventories
- optional expiry date on create/edit
- expiry-first stock ordering and urgency labels
- SMART Home `Do zużycia` preview for products due within 7 days or already overdue

V1.6 also simplifies everyday UI language: Home no longer exposes technical `pozycje/miejsca` counts, and Zapasy no longer repeats product/lot counters above storage locations.

Security remains Supabase Auth + owner authority + RLS. Public sign-up and anonymous access are not part of the product.

No SQL/schema change is required for V1.6 because `inventory_items.expiry_date` already exists in the closed V1.1 schema.
