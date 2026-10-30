# Kitchen H2 — Cleaning Rooms regression contract

- H1 hub to H2 shell passes the authenticated owner ID from OwnerGate; voice remains disabled.
- `cleaning_rooms` separate from Inventory `storage_locations`; per-owner RLS with `public.is_kitchen_owner()` and no DELETE grant.
- Active room names unique by owner with case-insensitive normalized names. Archive retains ID for future H3 task foreign keys; restore can fail if active name already used.
- User can create, list, rename, archive, restore and retry after read failures. Saving disables conflicting actions and clearly shows DB errors.
- SQL exact migration source archived in `tests/H2_ROOM_MIGRATION_REFERENCE.sql`; actual deployment SQL lives only under `OUTSIDE_REPO/SQL/H2_ROOMS`.
- PRECHECK `to_regclass('public.cleaning_rooms')` must be null before running initial migration; POSTCHECK result `H2 STRUCTURAL POSTCHECK PASS` and manual owner API / anon API checks follow.
- No tasks, recurrence, schedule data or full calendar yet; H3–H5 reserved.
- No schema mutation from `ALL_IN_ONE.sql` on an existing production project. Do not execute H2 migration twice.
