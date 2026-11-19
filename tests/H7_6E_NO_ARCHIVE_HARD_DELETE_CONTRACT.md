# Kitchen H7.6E — no archive; controlled hard delete

- **Current authority (supersedes historical H2/H3 archive clauses):** no user-facing archive, restore, hidden/archived section or client archived state in any module.
- Rooms are deleted by explicit confirmation through `public.h76_delete_cleaning_room(uuid)` (authenticated active member, own `owner_id` only); the browser never executes direct DELETE on tables.
- Server RPC atomically deletes `cleaning_task_completions` → `cleaning_tasks` → `cleaning_rooms`, with owner guards and parent FOR UPDATE lock. Foreign/missing room returns false without exposing other owners.
- Task deletion retains `h63_delete_cleaning_task`; "Zrobione" represents completed one-off tasks, **not** archiving. The 7-day schedule navigation and overdue/undo semantics remain unchanged.
- The deprecated `is_archived` database columns remain temporarily for old H3/H4/H64 functions; constraints permanently pin them to false, the H3 archive RPC is dropped. Column removal requires a separate dependency/backup migration.
- No SQL in GitHub: migration, readonly preflight and postcheck are in UPDATED_SQL / OUTSIDE_REPO only. REPO tests are SQL-independent.
- A full release requires deploy of SQL, then GitHub source, owner A/B/anon negative RPC checks, live room deletion on a dedicated QA room, and revalidation of tasks, completion history, Start and Schedule. Never delete testers' existing data without scope.

Gate: `node scripts/test-h7-6e-archive-removal.mjs` + project verifier + typecheck + Vite/PWA build.

