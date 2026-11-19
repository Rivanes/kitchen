# H3 Cleaning Tasks — Source / user contract

**Current override H7.6E:** original H3 archive/restore is retired. Current owner-only task hard delete uses H6.3 RPC; completed one-offs remain in Zrobione, and all tasks/completions are deleted when their room is deliberately deleted.

- Owner-only task creation, editing, explicit hard delete and one-off completion within an H2 room.
- One-off local date defaults to current date in `Europe/Warsaw`; H4 will own recurrence and countdown.
- H3 completion is one-way (checked and retained). Undo is not implemented; requires a separate audited RPC and history policy later.
- Every completion uses a persistent per-attempt `operation_id`, expected `cycle_generation`, server row lock, and unique event `(task_id,cycle_generation)`. Retry with same operation UUID is idempotent.
- `cleaning_task_completions` is append-only to authenticated clients, RLS SELECT only. RPCs SECURITY DEFINER require auth.uid and `public.is_kitchen_owner()` and explicitly scope owner/room; direct authenticated table writes denied.
- `is_archived` columns are dormant compatibility only, constrained false after H7.6E. Room deletion removes room, tasks and completions atomically; ordinary task completion/history is not an archive.
- Full calendar and recurring schedule belong to H4/H5 and are not represented as live features in H3.
- All SQL lives in `OUTSIDE_REPO/SQL/H3_TASKS` and `ALL_IN_ONE.sql`, never `REPO/tests` or `UPDATED_FILES`.
- Gate: SQL precheck/migrate/postcheck, owner/anon/nonowner API security, idempotency and concurrency test, GitHub QA/Pages on same commit and real phone smoke before PASS/CLOSED.
