# Kitchen

Private, single-user mobile-first PWA for household inventory, shopping and recipes.

Closed runtime baseline: **V1 Inventory — PASS/CLOSED**. Current candidate: **V2.1 — Product Name Editing**.

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


## V1.7 — Inventory polish / V1 closeout candidate

V1.7 prepares the complete Inventory domain for final V1 production closeout.

- Zapasy overview gains contextual cross-location search at 8+ stock lots.
- Location pages retain their own contextual search.
- Expiry Center hides zero-value noise, exposes one calm good-state summary, and gains contextual search at 10+ lots.
- Expiry Center wording is unified around `Terminy ważności`.
- Opened-product date assignment is made explicitly household-calendar based by the accompanying V1.7 SQL corrective.

No new Inventory feature family is introduced; V1.7 is polish/corrective work before V2 Shopping List.


## V2.1 — Product Name Editing

V2 starts by stabilizing canonical Product identity before Shopping List tables begin to reference it.

- Existing Product names can be corrected from Inventory edit mode.
- Rename updates the same Product row/UUID; Inventory references are preserved.
- Rename is a dedicated compact sub-flow so it does not make the mobile lot editor permanently taller.
- Product-name whitespace is normalized before persistence.
- Case-insensitive/normalized collisions with another Product are rejected.
- Database uniqueness races (`23505`) are translated into a clear collision message.
- Rename is intentionally saved separately from Inventory-lot changes, avoiding partial multi-entity saves.

No SQL/schema/RLS/Auth change is required. Existing owner-scoped Product UPDATE authority is reused.


## V2.3 — Shopping List UI

The `Zakupy` bottom-navigation module is now active.

V2.3 adds:
- owner-scoped active shopping-list read model
- mobile list page with loading/error/empty states
- add/edit/remove flow
- canonical Product reuse when the typed name matches an existing Kitchen Product
- ad-hoc shopping names for non-catalog things
- controlled quantity + unit
- SMART create merge for the same active identity + unit
- conflict guard when edit would collide with another active row
- contextual search at 8+ active shopping items
- Start-page shortcut with a natural `rzeczy do kupienia` summary

Purchased-state behavior remains reserved for the next Shopping stage.
No SQL/schema/RLS/Auth changes in V2.3; it uses the V2.2 shopping data foundation.
