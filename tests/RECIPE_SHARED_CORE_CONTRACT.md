# Recipe Shared Core Contract — current V3

Recipe ingredients reuse:
- canonical Product resolver/create authority
- shared Product autocomplete
- shared Quantity parser/validation/QuantityStepperInput
- shared Measurement Units

A missing Recipe ingredient creates the same canonical Product used by Inventory and Shopping.

Editing one Recipe ingredient changes Product identity; it must not globally rename the previously referenced Product.

Recipe ingredient presence resolves by canonical Product UUID only. Recipe code must not infer Inventory/Shopping presence by Product display name, fuzzy text, package text or legacy Shopping custom-name matching.

Recipe presence reads are owner-scoped and read-only. Recipe code must not own Inventory/Shopping mutation authority.

Presence means only `Inventory`, active `Shopping`, or `missing`; it must not claim quantity sufficiency before Package Semantics and later Recipe matching.

Recipe UI must not expose terms such as `canonical Product` or internal catalog architecture.
