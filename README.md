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

## V2.3.1 — Shared Product Autocomplete Corrective

V2.3.1 removes the second, browser-native Shopping suggestion system introduced in V2.3.

Inventory and Shopping now share one Product identity/autocomplete layer:
- the same Polish case-insensitive normalization
- the same exact canonical Product match
- the same substring suggestions
- the same maximum of 5 suggestions
- the same suggestion chips/UI
- explicit canonical Product id reuse after an exact match or selection

Shopping keeps its intentional semantic difference: text that does not match a canonical Product is stored as an ad-hoc Shopping name rather than creating a Product.

No SQL/schema/RLS/Auth changes.


## V2.3.2 — Unified Product Identity Corrective

- fixed V2.3.1 TypeScript deploy blocker: unsupported `products` prop on ProductAutocompleteField
- Inventory and Shopping now share the same canonical Product resolver/creator
- unknown Shopping names create canonical Product immediately
- Shopping stores product_id, enabling later purchased -> Inventory without recreating Product
- legacy custom_name stays readable for compatibility
- no SQL/schema/RLS/Auth changes


## V2.3.3 — Shared Core Consistency Corrective

V2.3.3 applies the Kitchen architectural rule: the same business operation has one shared authority.

Unified in this corrective:
- Product catalog read/create/rename/cleanup authority
- Product edit semantics across Inventory and Shopping
- Quantity parse/validate/read/add/format rules
- Measurement Unit loading/types/default-unit rules
- Product and Measurement Unit read models
- full-consume semantics through `consume_inventory_item()` rather than direct removal

Key effects:
- `pcs` is the single default count-unit code; Shopping no longer searches for the display symbol `szt` as a code.
- Shopping quantity accepts the same numeric grammar and 3-decimal limit as Inventory.
- Editing a Product-backed Shopping row to a new unmatched name renames the same canonical Product UUID rather than creating an orphan replacement Product.
- `Zużyj wszystko` is consumption, not explicit removal; it uses the same consume RPC path as partial consumption.
- explicit `Usuń z zapasów` remains a separate delete operation.

No SQL/schema/RLS/Auth migration is required.


## V2.4 — Inventory -> Shopping integration

Inventory now reuses the existing Shopping create/merge flow instead of implementing a second add-to-list system.

- each Inventory lot exposes a compact `Dodaj do listy zakupów` action
- the action opens the existing `ShoppingEditor` create surface with canonical Product preselected
- Product UUID, shared Product catalog, Quantity rules and Measurement Units are reused
- create/merge is still owned by `createShoppingItem()`
- after partial or full consumption, Inventory shows a non-blocking offer to add that Product to Shopping
- explicit `Usuń z zapasów` does not trigger the replenishment offer
- if the same Product + unit is already active in Shopping, existing merge semantics apply

No SQL/schema/RLS/Auth changes.


## V2.4.1 — Shared Quantity Stepper

Added one reusable `QuantityStepperInput` around the existing shared Quantity authority.

- Inventory add/edit, Shopping add/edit and Consume use the same +/- control.
- each tap changes quantity by 1 in the currently selected unit
- manual entry remains available
- Consume clamps increment to the visible lot quantity
- no separate module-specific stepper logic was introduced

No SQL/schema/RLS/Auth changes.


## V2.5 — Bought state / completion

Shopping now has one coherent active/completed lifecycle over the existing `shopping_items` table:
- active items can be marked bought with a one-tap check control
- `is_purchased=true` and `purchased_at=<timestamp>` are written together
- bought rows move to a collapsible `Kupione` section
- bought rows can be restored to active state
- restore refuses a same-identity + same-unit active collision instead of creating duplicate active rows
- an active-empty list with completed rows shows `Wszystko kupione`
- active Home count remains active-only

No SQL/schema/RLS/Auth changes are required because V2.2 already prepared purchased state.


## V2.5.1 — Partial purchase corrective

Shopping completion now records how much was actually bought.

Example:
- planned: 4 szt.
- bought: 3 szt.
- `Kupione`: 3 szt.
- `Do kupienia`: 1 szt.

Tapping the bought control opens one shared quantity sheet with the existing +/- quantity stepper.
The full requested amount is prefilled, so a full purchase is one confirmation; partial purchase can
be adjusted before save.

Database operations are atomic through owner-scoped SECURITY INVOKER RPCs:
- `purchase_shopping_item(...)`
- `restore_shopping_purchase(...)`

Restore merges a purchased fragment back into an equivalent active remainder instead of creating
a duplicate row.

V2.5.1 adds no table/column/schema-model change, but it does require the supplied SQL function migration.


## V2.6 — Purchased -> Inventory

A purchased Shopping fragment can be transferred into Inventory without recreating the Product.
The exact canonical `product_id`, purchased quantity and unit are preserved. The existing Inventory
editor is reused for storage location, expiry and after-open configuration.

Inventory lot add/merge now has one database authority: `public.add_inventory_lot(...)`.
Normal Inventory creation calls that same authority, and Shopping transfer delegates to it through
`public.transfer_purchased_shopping_item_to_inventory(...)`. This prevents a second Inventory merge
implementation from appearing in the Shopping module.

The transfer is atomic: Inventory add/merge and removal of the purchased Shopping fragment succeed
or fail together. Purchased rows disappear from `Kupione` after successful transfer.


## V2.6.1 — RPC result typing corrective

GitHub's dependency-backed TypeScript build exposed that the intentionally ungenerated Supabase
client infers custom RPC result rows as `{}`. V2.6.1 does not change the database contract or runtime
business rules. Both Inventory create and Shopping -> Inventory now decode the shared
`inventory_item_id` RPC payload through one runtime-validated `requireInventoryItemId()` helper.

This keeps one response-shape authority and removes unsafe direct property access from both callers.
No SQL rerun is required when the V2.6 production postcheck already passed.


## V2.6.2 — Mobile interaction corrective

- Storage location dropdowns in the shared Inventory editor are replaced by one shared icon-tile picker.
- Because Shopping -> Inventory reuses InventoryEditor, the same location picker is used there automatically.
- Shopping purchase check is now the fast path: one tap buys the full listed quantity with no confirmation sheet.
- `Zmień ilość` on the active Shopping row opens the existing partial-purchase sheet only when the bought quantity differs.
- No SQL/schema/RLS/Auth change.


## V2.6.3 — Purchased Quantity Correction + Stepper Default

The common Shopping purchase path is now truly one tap: active-row check immediately purchases the full current quantity.
If the real purchase differed (for example 4 planned but 3 bought), `Zmień ilość` appears only on the already-purchased row.
Correcting 4 -> 3 atomically keeps 3 in `Kupione` and returns 1 to `Do kupienia`.

Inventory Consume now seeds the shared quantity stepper with a valid real value (`min(1, available)`), so +/- works immediately without first typing a number when the amount is already known.

V2.6.3 requires `V2_6_3_PURCHASED_QUANTITY_CORRECTION.sql` before runtime deploy.


## V2.6.4 — Mobile Density + Shared Quantity Ergonomics Corrective

This corrective is presentation-only. Database/RLS/Auth/RPC behavior from V2.6.3 remains unchanged.

- `Zmień ilość` still appears only on an already-purchased Shopping item.
- The action is a compact sibling control in the purchased row; it no longer expands the product copy vertically.
- The visual treatment reuses the proven compact V2.6.2 action contract: borderless, transparent, accent-colored, 44px touch target, icon-only fallback below 360px.
- The one shared `QuantityStepperInput` remains the only +/- implementation.
- Its container is now intrinsically bounded to 220px while still shrinking inside narrow parents, so `-`, value/unit and `+` stay close enough for one-handed use.
- Touch targets remain >=44px and manual quantity entry remains available.
- No SQL migration is required.


## V2.6.5 — Overpurchase Corrective

An already-purchased Shopping quantity is the factual amount bought, not a hard cap derived from the earlier plan.

Example:
- originally planned: 4 pcs
- currently recorded as bought: 3 pcs
- active remainder: 1 pc
- correction: bought 5 pcs
- result: bought 5 pcs, active remainder 0

When the corrected purchased quantity is increased:
1. an equivalent active remainder is consumed first, up to the amount available;
2. any additional excess is still accepted as genuinely purchased;
3. the purchased row stores the exact corrected quantity.

When the corrected purchased quantity is reduced, the difference still returns to `Do kupienia`.

The correction remains atomic in `public.adjust_purchased_shopping_quantity(...)`.


## V2.7 — V2 Final Polish / Closeout [PASS / CLOSED]

V2.6 through V2.6.5 are production PASS/CLOSED.

V2.7 adds no new Shopping business feature and requires no SQL migration.
It closes V2 with:
- one shared user-facing mutation-error presentation helper
- final shared-core regression contracts
- authoritative documentation/status cleanup
- `*.tsbuildinfo` repository hygiene

Raw Supabase/Postgres detail appended after a Polish `Nie udało się ...:` action message is no longer shown directly in the UI.
The full backend/data authority remains unchanged.

After GitHub QA, Pages deploy and full V2 production/mobile smoke PASS, V2 Shopping can be marked PASS/CLOSED and V3 Recipes becomes next.


## V3.1 — Recipe Data Foundation [PASS / CLOSED]

The production database now contains owner-scoped `recipes` and `recipe_ingredients`.

Recipe ingredients reference:
- canonical Product UUID
- shared Measurement Units
- shared `numeric(12,3)` quantity precision

RLS, owner policies, cascade/restrict relationships and production postcheck all passed.

## V3.2 — Recipes Read Model + Navigation [PASS / CLOSED]

The existing `Przepisy` bottom-navigation destination is now active.

V3.2 is intentionally read-only:
- Recipe list
- loading/error/empty states
- Recipe detail
- base servings
- ordered ingredients
- canonical Product names
- shared quantity/unit display
- optional ingredient notes
- preparation instructions

Recipe reads explicitly scope `owner_id` and reuse the existing Product, Quantity and Measurement Unit authorities.

Create/edit/delete remains V3.3.
Ingredient mutation remains V3.4.

No SQL migration is required for V3.2.


## V3.3 — Recipe CRUD + Cover Image Foundation [PASS / CLOSED]

Recipe metadata is now mutable:
- create
- edit
- delete
- base servings
- preparation instructions

Each Recipe may have one private cover image.

Mobile cover workflow:
- gallery
- camera
- local preview
- replace/remove

Image pipeline:
- original stays on device
- resize before upload
- <=1600 px long edge
- AVIF preferred
- WebP fallback only when AVIF encoding is unavailable
- target <=1.5 MiB
- Storage bucket hard limit 2 MiB

Covers live in private Supabase Storage (`recipe-images`) and are rendered through signed URLs.

Ingredient mutation is intentionally deferred to V3.4, where it must reuse the existing canonical Product resolver/create authority.


## V3.4 — Ingredient Editor + Focal Crop + Durable Cover Cleanup

Recipe Ingredients now reuse the existing shared Kitchen core:
- canonical Product autocomplete/resolve/create
- shared QuantityStepperInput + quantity validation
- shared Measurement Units
- optional section label
- optional ingredient note
- add/edit/remove
- atomic complete reorder

Missing ingredient names create canonical Products through the same authority used by Inventory/Shopping.

Recipe cover cropping now stores one focal point and reuses it for:
- list thumbnail
- detail hero

Changing crop does not upload another image.

Superseded/deleted Recipe cover paths are transactionally queued in `recipe_image_cleanup_queue`.
The client deletes Storage objects immediately when possible and retries queued failures on later Recipe loads.

The Recipe empty-state primary action also receives an explicit high-contrast text fix.


## V3.4.1 — SMART Recipe Cover Corrective

Runtime-only corrective after V3.4 production smoke.

- removes technical compression/Storage copy from daily Recipe UI
- makes `Ustaw kadr` a full-width cover action
- existing Recipe `Zapisz kadr` now persists focal coordinates immediately
- persistence is read back and verified
- live Recipe list/detail state updates immediately
- parent Recipe Save is no longer required only to persist crop

No SQL/schema/Storage-policy change.


## V3.4.2 — Recipes Authoring Architecture Corrective

Corrects the V3 authoring architecture instead of layering another hotfix.

- Recipe detail is read-only again
- one Recipe editor owns metadata, cover/crop, ingredients and preparation
- ingredient changes remain draft until Recipe Save
- missing ingredients still resolve/create through the shared canonical Product authority
- final save uses one atomic `save_recipe_snapshot(...)` Recipe authority
- ingredient order is always contiguous
- faulty standalone reorder/update authorities are removed
- focal point is selected on the full source image
- one shared crop geometry/renderer drives hero, thumbnail and previews
- Storage cleanup maintenance no longer blocks Recipe reads
- Recipe CSS/contracts/verifier are consolidated to current architecture


## V3.4.3 — Recipe Cover Aspect Consistency Corrective

Runtime-only corrective after V3.4.2 mobile smoke.

The crop preview, Recipe editor preview and final Recipe detail hero now share one source-of-truth aspect (`RECIPE_COVER_HERO_ASPECT = 16/10`) and the same crop renderer. The list thumbnail uses the shared 1:1 thumbnail aspect.

Removed the obsolete Recipe editor 16:9 frame and removed duplicated hard-coded Recipe aspect ratios from CSS. No SQL/schema/Storage-policy change.
