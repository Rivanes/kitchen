# Kitchen H2 — Cleaning Rooms regression contract

**Current override H7.6E:** archive/restore from original H2 are retired. Rooms use owner-guarded hard-delete RPC with an irreversible-data confirmation; completed one-off tasks remain in Zrobione until explicitly deleted. Historical H2 migration is not to be rerun.

- H1 hub to H2 shell passes the authenticated owner ID from OwnerGate; voice remains disabled.
- `cleaning_rooms` separate from Inventory `storage_locations`; per-owner RLS with `public.is_kitchen_owner()` and no DELETE grant.
- Room names unique per owner with case-insensitive normalized names. Hard delete cascades through completion history and tasks by explicit owner-scoped RPC; it is not a soft delete.
- User can create, list, rename, delete with a confirmation and retry after read failures. Saving disables conflicting actions and clearly shows DB errors.
- Historical H2 deployment SQL lives only under `OUTSIDE_REPO/SQL/H2_ROOMS`; new H7.6E SQL is outside GitHub as well.
- PRECHECK `to_regclass('public.cleaning_rooms')` must be null before running initial migration; POSTCHECK result `H2 STRUCTURAL POSTCHECK PASS` and manual owner API / anon API checks follow.
- No tasks, recurrence, schedule data or full calendar yet; H3–H5 reserved.
- No schema mutation from `ALL_IN_ONE.sql` on an existing production project. Do not execute H2 migration twice.
