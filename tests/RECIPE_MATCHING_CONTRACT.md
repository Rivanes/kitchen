# Recipe Matching Contract — V4.3

V4.3 answers one question only: whether current **physical Kitchen resources** are sufficient for a Recipe requirement. Matching is read-only and is never Shopping authority.

## Canonical states
- `sufficient` → `Wystarczy`
- `partial` → `Częściowo`
- `missing` → `Brak`
- `unresolved` → `Nieustalone`

`Mogę ugotować` is true only for Recipe-level `sufficient`. A Recipe with zero ingredients is `unresolved`, never vacuously cookable.

## One pure authority
`src/features/recipes/recipeMatching.ts` is the single pure matching authority. It contains no Supabase calls, React state, Shopping writes or Inventory writes. Home and RecipesPage consume this same authority.

## Quantitative requirements
- Direct Recipe quantities use the V4.1 Measurement Conversion authority and `measurement_units.to_base_factor`.
- Recipe container requirements use the immutable Recipe package snapshot, never the current Product package default.
- Inventory direct lots use their physical unit.
- Inventory container lots use the immutable Inventory-lot package snapshot, never the current Product package default.
- Compatible Recipe requirements are aggregated by canonical Product + effective direct family before comparison. Duplicate rows in different Recipe sections therefore cannot independently reuse the same stock.

For one Product/family group:
1. resolved compatible stock already covers the requirement → `sufficient`;
2. otherwise unresolved/non-comparable physical stock exists → `unresolved`;
3. otherwise some compatible stock exists → `partial`;
4. otherwise → `missing`.

Non-comparable physical stock is not treated as zero. Example: Recipe Passata in count units while physical Passata exists only in mass → `Nieustalone`.

## Product roles
- Food (`recipeEligible=true`, quantity tracking) uses quantitative matching.
- Spice (`recipeEligible=true`, presence tracking) uses only `Mam / Brak`; Recipe numeric amount does not determine stock sufficiency.
- Household (`recipeEligible=false`) is excluded from Recipe matching. Corrupt legacy Household Recipe input fails closed as `unresolved`.

## Servings
List and Home use stored Recipe servings. Detail recomputes matching from the selected servings preview using the existing servings authority. Package content per one package never scales; only the number of Recipe packages scales.

## Shopping boundary
Active Shopping is secondary procurement context only. It never promotes `missing`, `partial` or `unresolved` physical stock to `sufficient`. Existing explicit Recipe → Shopping actions remain allowed. V5.1 may consume matcher `requiredBaseQuantity/availableBaseQuantity` in a separate pure purchase-planning authority, but V4.3 itself still does not calculate purchase packaging or write Shopping. V5.2 owns the future write-side upgrade.

## Discovery/UI
`Mogę ugotować` is a Home availability section (not a general filter) for Recipe-level `sufficient` items outside the current meal category. `Na teraz` follows with `sufficient` recipes from the current meal window and never promotes non-cookable Recipes. The default general preview contains distinct planning alternatives, including Recipes that need shopping. An explicit category filter pauses both promoted lanes and shows the **complete** chosen category; RecipesPage keeps category/search discovery without a cookability toggle. Empty automatic Home sections remain hidden. Recipe list, detail and Home display the same canonical match state for the same physical context.
