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


## V1.6.1 — Mobile editor layout corrective

Expiry support made the add/edit sheet too tall on phone-sized viewports.

Corrective:
- phone/coarse-pointer opening no longer forces the software keyboard
- quantity + unit remain side-by-side on narrow phones
- expiry clear is a compact icon action on the same row
- redundant expiry helper copy removed
- edit consume/remove actions are compact
- the sheet is bounded to the dynamic viewport and internally scrolls only as fallback

No SQL, schema, RLS or Auth changes.


## V1.6.2 — Expiry Center + opened products

- Start has direct access to all stock expiry information.
- Dedicated Expiry Center lists every stock lot, including `Nie podano` dates.
- Filters: all / with declared expiry / without declared expiry.
- Status thresholds: <=3 days red, 4–10 days orange, >10 days green.
- Effective expiry uses the earlier of declared expiry and the opened-product use-by date.
- Optional per-lot `after_open_days` supports products that spoil faster after opening.
- Partial consumption automatically applies opened-product semantics when that rule exists.
- Opened stock never merges with newly added unopened stock.

V1.6.2 requires its Supabase migration before this frontend is deployed.
