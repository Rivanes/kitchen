# Shared Product Identity + Autocomplete Contract — V2.3.2

Inventory and Shopping use one Product identity system.

- same Polish case-insensitive normalization
- same exact matching
- same max-5 suggestions
- same reusable autocomplete UI
- same owner-scoped canonical Product resolver/creator

Unknown name in either Inventory or Shopping creates one canonical Product.
Shopping stores its product_id immediately, so later Shopping -> Inventory reuses the same UUID.

Legacy shopping custom_name rows remain readable and can be promoted when edited/merged.

No SQL/schema/RLS/Auth delta.
