# V4.1 — Measurement Conversion Contract

- Shared Measurement Unit authority exposes database `family` and `to_base_factor` as runtime `toBaseFactor`.
- Conversion is pure: it performs no Supabase read/write and owns no Product, Inventory, Recipe or Shopping mutation.
- Only units in the same direct family (`count`, `mass`, `volume`) may convert to one another.
- `to_base_factor` is the only arithmetic authority; hard-coded `kg * 1000` / `l * 1000` branches are forbidden.
- Direct conversion of container units (`package`, `jar`, `bottle`, `can`, `sachet`) is forbidden. Container meaning must first resolve through its package-content snapshot.
- Unknown units, invalid/non-positive factors and incompatible families fail closed with an explicit conversion error.
- Zero is valid for read-model availability conversion; negative and non-finite values are invalid.
