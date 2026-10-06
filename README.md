# Kitchen

Private, single-user mobile-first PWA for household inventory, shopping and recipes.

Closed milestones: **V1 Inventory — PASS/CLOSED**, **V2 Shopping — PASS/CLOSED**, **V3 Recipes + Resource Semantics — PASS/CLOSED through V3.8.4**, **V4.1 Recipe Package Snapshot + Measurement Conversion — PASS/CLOSED**, **V4.2 Recipe Categories + Home Discovery + Time-aware Suggestions — PASS/CLOSED**, and **V4.3 What Can I Cook? + V4.3.1 Cookable Meal Section UX — PASS/CLOSED**. **V4.4 Final V4 Polish is incorporated in this baseline and still awaits its final production acceptance gate. V5.1 Purchase Planning Authority is IMPLEMENTED / READY FOR GITHUB QA.** V5.1 is pure/read-only and adds no SQL or Shopping write behavior.

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


## V4.3 — What Can I Cook? + V4.3.1 UX [PASS / CLOSED]

V4.3 is the closed deterministic/read-only matching baseline; V4.3.1 finalized cookability discovery as a dedicated time-aware Home section.

- one pure `recipeMatching.ts` authority is shared by Home and RecipesPage;
- Recipe and Inventory package snapshots remain immutable authorities for container meaning;
- direct quantities reuse V4.1 Measurement Conversion;
- duplicate requirements aggregate by canonical Product + effective direct family before stock comparison;
- Spice uses `Mam / Brak`; Household is excluded;
- non-comparable or unresolved physical stock yields `Nieustalone`, never a false `Brak`;
- Recipe list/Home use stored servings, while Recipe detail recomputes immediately for the selected serving preview;
- `Mogę ugotować` is a separate time-aware Home section for the current Śniadanie / Obiad / Kolacja window; it is not a general filter;
- active Shopping remains procurement context only and never counts as physical availability;
- V4.3 performs no automatic Shopping top-up and introduces no database write/matching cache.

No SQL/schema/RLS/Auth migration is required for V4.3.


## V4.4 — Final V4 Polish + Closeout [READY FOR QA]

V4.4 is intentionally small and runtime-only. It does not change Recipe matching arithmetic, persistence, Supabase schema or write authorities.

- Home no longer fabricates `Nieustalone` when Recipe discovery is ready before Inventory matching data.
- Matching badges appear only after Inventory is ready and the shared matcher produced a canonical result.
- A failed/slow Inventory read leaves Recipe planning/navigation usable without claiming a domain availability state.
- Empty `Mogę ugotować` uses neutral wording because recipes may be partial, missing or unresolved; only `Wystarczy` is promoted into the section.
- V4.1 package snapshots, V4.2 categories/discovery and V4.3 matching semantics remain unchanged.
- No SQL migration. Final release gate is GitHub QA + Pages + phone-first smoke, then V4 may be marked PASS/CLOSED.


## V5.1 — Purchase Planning Authority [READY FOR QA]

V5.1 adds one pure bridge from the V4.3 physical matcher result to a realistic future purchase target. It does **not** change the existing Recipe UI or write to Shopping yet.

- physical shortage is reused from canonical matcher `requiredBaseQuantity - availableBaseQuantity`;
- direct Product purchase units convert through the shared Measurement authority and round upward to Shopping's 3-decimal precision;
- container defaults (`package/jar/bottle/can/sachet`) always plan whole containers with `ceil(shortage / Product package content)`;
- `pcs + package content` is a supported discrete sellable-unit pattern, e.g. Passata `1 szt. = 700 g`;
- Product purchase defaults describe future buying; Recipe/Inventory snapshots remain historical/physical facts and never define today's purchase packaging;
- unresolved matcher state or incomplete/incompatible Product purchase semantics fail closed with a typed reason;
- Spice remains outside quantitative purchase planning; Household remains outside Recipe planning;
- V5.1 performs no Supabase query and no `shopping_items` mutation.

Known production-data prerequisite for later V5.2: current Product `Mleko` still needs its Product purchase default completed as `1 opakowanie = 1 l` before automatic Recipe -> Shopping planning for that Product can be enabled. The `Melko` typo cleanup is explicitly deferred to later Product maintenance.


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

## V3.4 — Unified Recipe Authoring + Cover [PASS / CLOSED]

V3.4 closed after the full Recipes architecture corrective.

Final architecture:
- Recipe detail is read-only
- one Recipe editor owns metadata, cover/crop, ingredients and preparation
- missing ingredient names resolve/create through the shared canonical Product authority
- shared QuantityStepperInput and Measurement Units
- optional ingredient sections + notes
- one atomic `save_recipe_snapshot(...)` authority
- contiguous ingredient ordering
- private optimized Recipe cover image
- one source-image focal point reused by list/detail
- one shared exact-pixel crop renderer
- durable cleanup queue for replaced/removed/deleted covers
- Recipe image cleanup never blocks normal Recipe reads

The V3.4.1–V3.4.4 corrective chain is historical implementation work and is not a separate feature surface.

## V3.5 — Servings UX + Recipe Polish [PASS / CLOSED]

Delivered through V3.5.3:
- read-only servings preview from 1..999
- scaled ingredient quantities without mutating stored Recipe data
- reset to base servings only when preview differs
- contextual Recipe search at 8+ Recipes
- search by Recipe name and ingredient Product name
- legacy lightweight section-label grouping/reuse (superseded by V3.6A structured sections after V3.5 closeout)
- optional preparation and cooking/baking times stored as Recipe metadata
- ingredient Product-presence dots: Inventory / active Shopping / missing
- explicit add-to-Shopping action for red/missing canonical Products
- one bulk action for all unique missing Products
- current serving preview requirement is used only after the explicit Shopping action
- duplicate Product+unit Recipe requirements are grouped before Shopping mutation

V3.5.2 introduced only the two optional duration columns and extended the existing atomic `save_recipe_snapshot(...)` authority. V3.5.3 adds no SQL/schema/RLS/Auth/Storage-policy change: final add/merge remains owned by shared Shopping mutation authority. Product-presence color remains presence-only and does not claim quantity sufficiency or Recipe matching.


## V3.6A — Structured Recipe Sections [PASS / CLOSED]

V3.6A V3.6A promotes Recipe sections from repeated presentation labels to real Recipe-local identities because section-level rename and a mandatory base section are now product requirements.

- `recipe_sections` is the section authority
- every Recipe has one mandatory primary section (`Główne` by default)
- primary can be renamed but not deleted/replaced
- secondary sections are optional
- every ingredient has mandatory same-Recipe `section_id`
- RecipeEditor assigns sections with fast chips/buttons and supports `+ Nowa`
- whole-section rename is draft state until the one atomic Recipe Save
- V3.7 closeout removes the completed `section_label` and old snapshot-signature rollout compatibility
- Recipe Detail hides a single redundant section heading and shows headings when 2+ non-empty sections exist
- no Package Semantics / Recipe matching in V3.6A

Production upgrade requires `OUTSIDE_REPO/SQL/V3_6A_PRECHECK.sql` -> migration -> postcheck before runtime deploy.


## V3.6A.1 — Recipe Editor UX + Save-State Corrective

V3.6A.1 is runtime-only and sits on the already-installed V3.6A structured-section database model.

- Add/Edit Ingredient uses one dedicated bottom sheet/modal instead of expanding an inline form below section management.
- The ingredient sheet is rendered outside the parent Recipe `<form>`, preventing nested-form submit ambiguity.
- Existing section assignment remains one-tap chips.
- Secondary `+ Nowa` section creation is staged inside the ingredient child draft and is committed only together with ingredient Apply.
- Canceling ingredient authoring leaves Product/quantity/unit/note/section/order and parent sections unchanged.
- Ingredient reorder is staged and committed only on `Zastosuj`.
- The section manager no longer creates empty sections independently; it remains the rename/delete surface for existing sections.
- Parent Recipe `Zapisz` is no longer blocked by Product Catalog loading; only ingredient authoring waits for Product/Unit data.
- Section rename owns a visible local completion/error state before final Recipe Save.
- Ingredient validation stays inside the ingredient sheet, and Escape closes only the child sheet.

No SQL/schema/RLS/Auth/Storage-policy change is required for V3.6A.1. The existing V3.6A production postcheck remains the database baseline.


## V3.6B — Package Semantics Prerequisite [PASS / CLOSED]

V3.6B makes household container quantities explicit before Recipe matching.

- canonical Products may store an optional default content per one container;
- physical Inventory lots store their own resolved package-content snapshot;
- new `opak. / słoik / but. / puszka / sasz.` stock requires explicit or default content;
- direct `szt. / g / kg / ml / l` stock remains unchanged;
- changing a Product default does not rewrite existing stock;
- Inventory merge distinguishes different package sizes;
- Shopping -> Inventory carries the actual package content through the shared Inventory authority;
- legacy unresolved container lots are not guessed or backfilled;
- Recipe quantity matching remains outside this stage.

V3.6B requires its Supabase migration before the frontend is deployed.


## V3.7 — V3 Closeout [PASS / CLOSED]

V3.7 is a closeout/cleanup stage, not a new feature surface.

- removes rollout-only `recipe_ingredients.section_label`;
- removes the V3.5.3 `save_recipe_snapshot(...)` compatibility signature;
- leaves the structured Recipe snapshot as the sole Recipe save authority;
- preserves V3.6B Package Semantics unchanged;
- performs no Recipe matching or shortage calculation;
- updates project contracts/documentation so V4 starts from one unambiguous V3 baseline.

Production closeout requires `V3_7_PRECHECK.sql` -> `V3_7_V3_CLOSEOUT.sql` -> `V3_7_POSTCHECK.sql`, then GitHub QA / Pages and focused phone-first smoke.


## V3.8 — Resource Types + Inventory Sections

V3.8 adds the final resource semantics prerequisite before Recipe matching:
- first-class Inventory sections: **Przyprawy** and **Domowe**;
- explicit Product recipe eligibility and Inventory tracking mode;
- spices are tracked in Inventory as `mam / nie mam` while Recipe quantities remain normal;
- household consumables remain Shopping/Inventory resources but cannot be Recipe ingredients;
- role changes use one atomic owner-scoped database authority;
- expiry surfaces ignore spice/household resource rows;
- quantitative Products keep V3.6B package-content semantics.

V3.8 deliberately does not implement `What Can I Cook?` or quantity shortage matching.

### V3.8.1 — Resource Section Icons Corrective

V3.8.1 is a runtime-only mobile-first visual corrective. `Przyprawy` uses a dedicated spice-shaker icon instead of the earlier generic plant mark, while `Domowe` uses a household-supplies spray-bottle icon instead of the Home-like house mark. Resource semantics, Inventory behavior and SQL remain unchanged.


## V3.8.2 — Special Resource Inventory Create Corrective

V3.8.2 fixes the mobile Add Product flow for `Przyprawy` and `Domowe` without creating any new Inventory save authority.

- the section where Add Product was opened remains the stable target role for the whole create sheet
- an exact existing canonical Product may report its current role, but it no longer silently changes the target Inventory section
- a role mismatch is resolved explicitly through the existing `set_product_resource_semantics(...)` authority
- the final Inventory create/merge still uses only `add_inventory_lot(...)`
- genuinely new Products are created directly with the role implied by the target section
- no Product duplication and no name-based role inference
- no SQL/schema/RLS/Auth/Storage-policy change

## V3.8.4 — Persistent Resources + Auto-Replenishment

V3.8.4 completes the special-resource behavior before V4.

- `Przyprawy` is a persistent Product list with direct `Mam / Brak` state; missing spices stay visible and `Mam -> Brak` transactionally ensures Shopping.
- `Domowe` is a persistent recurring-stock list; Products stay visible at `0` and normal changes use phone-first inline `- / +`.
- optional `products.minimum_stock_quantity` is Household-only and uses the Product `default_unit_code`.
- Home shows a SMART `Do uzupełnienia` block only for Household Products at/below their configured minimum.
- automatic replenishment uses shared idempotent `ensure_active_shopping_product(...)`; it never increments an already-active Shopping row merely because an automatic event repeats.
- standard Inventory create/merge remains `add_inventory_lot(...)`; Product reclassification remains `set_product_resource_semantics(...)`.
- no zero-quantity fake Inventory lots and no parallel tracked-resource table are introduced.
- Recipe quantities for spices remain authoring/scaling data and are not decremented from Spice Inventory.
- V4 Recipe matching is still absent.

Production upgrade requires `OUTSIDE_REPO/SQL/V3_8_4_PRECHECK.sql` -> migration -> `V3_8_4_POSTCHECK.sql` before runtime deploy.



## V4.1 — Recipe Package Snapshot + Measurement Conversion Authority [PASS / CLOSED]

V4.1 creates the deterministic quantity foundation required before `Co mogę ugotować?`.

- container Recipe ingredients (`opak. / słoik / but. / puszka / sasz.`) store their own immutable content-per-container snapshot;
- direct Recipe units (`szt. / g / kg / ml / l`) never carry package-content metadata;
- the existing `save_recipe_snapshot(...)` RPC remains the only Recipe write authority and persists the snapshot atomically;
- the explicitly audited historical `Kawa z mlekiem -> 1 opakowanie Mleka` requirement is backfilled to `1 l` without changing the Product default;
- `measurement_units.to_base_factor` is exposed through the shared frontend Measurement Unit authority;
- one pure conversion module handles compatible direct-unit conversion such as `kg <-> g` and `l <-> ml`;
- Product package defaults may seed a **new** Recipe snapshot, but never reinterpret an already-saved Recipe;
- serving previews scale the ingredient requirement only; package content remains the fixed content of one container.

V4.1 does **not** implement cookability matching, category filtering, Home Recipe discovery or Shopping writes. Production V4.1 migration is already applied (PRECHECK/POSTCHECK PASS), GitHub Pages build/deploy PASS and phone smoke 11/11 PASS after the TypeScript narrowing corrective. Do **not** rerun the migration. The separate Kitchen QA workflow result was not independently supplied; Pages performed its own verifier, TypeScript check and production build.

V4.1–V4.3 are closed. V4.4 is the final no-SQL polish/closeout candidate; V5 owns any future quantity-aware Recipe -> Shopping top-up.


## V4.2 — Recipe Categories + Home Discovery [PASS / CLOSED]

Every Recipe requires exactly one category: **Śniadanie / Obiad / Kolacja / Przekąska / Ciasto**. `Ogólne` / `Wszystkie` is a filterable all-Recipes view, never a stored category. Create requires an explicit selection; edit preloads the saved category; persistence remains atomic through `save_recipe_snapshot(...)`.

Home keeps a general Recipe discovery section visible at all times for planning/inspiration and exposes category filters. A separate `Na teraz` section is device-local time-aware: Śniadanie 06:00–11:59, Obiad 12:00–17:59, Kolacja 18:00–22:59; from 23:00–05:59 the time-aware section is hidden. Przekąski and Ciasta stay available in General but are never time-promoted. The unfiltered preview avoids duplication with `Na teraz` when alternatives exist, while manual filters remain complete.

Home uses a lightweight Recipe projection and opens the canonical RecipesPage detail through AppShell. V4.3.1 presents `Mogę ugotować` as a separate time-aware Home discovery section; general category filters remain planning controls rather than cookability toggles.
