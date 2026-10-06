# Recipe Category Contract — V4.2

- Canonical codes: `breakfast`, `lunch`, `dinner`, `snack`, `cake`.
- Labels: Śniadanie, Obiad, Kolacja, Przekąska, Ciasto.
- `recipes.category_code` is `NOT NULL` and SQL-check constrained to the five canonical codes.
- `save_recipe_snapshot(...)` is the sole Recipe write authority and saves category atomically with the Recipe snapshot.
- No follow-up direct `recipes.update(category_code)` is permitted.
- Create mode has no implicit/preselected category. The user must choose one.
- Edit mode preloads the stored category and may change it in the same atomic save.
- Historical production mapping confirmed by the user before migration:
  - `bc08a593-9bf2-4baf-b0a3-2cd03e142bbd` — Kawa z mlekiem → `breakfast`;
  - `f6f8ed06-82f2-489b-8d4d-93b3b46d033c` — Lasagne → `lunch`.
- Category is independent of Recipe sections, Product role, serving count, package-content snapshots, time of day and V4.3 cookability.
