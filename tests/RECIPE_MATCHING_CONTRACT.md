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
Active Shopping is secondary procurement context only. It never promotes `missing`, `partial` or `unresolved` physical stock to `sufficient`. Existing explicit Recipe → Shopping actions remain allowed, but V4.3 does not calculate or write partial shortages; that remains V5.

## Discovery/UI
Category and `Mogę ugotować` are independent predicates and can be combined. `Na teraz` remains complete and time-aware; the general Home Recipe stream may be filtered to `Mogę ugotować`. Recipe list, detail and Home display the same canonical match state for the same physical context.
