# H6.4.2 — Cleaning Schedule UI contract

- Source: `public.h64_list_cleaning_occurrences(date,date)`, owner-guarded; max 42-day range, `from >= Warsaw today - 7`. Never generate recurrence dates from client.
- `cleaning_tasks` is a read-only metadata/backlog source; latest retained completion events are one owner-scoped, read-only query for safe undo eligibility. No direct browser mutations.
- Actionable occurrence only: guarded `h64_complete_cleaning_occurrence(task, generation, UUID, due, revision)`. Projected future rows may appear checked-disabled until their current cursor is available. Reuse UUID on ambiguous retry of the *same* occurrence.
- Checked occurrence can be unchecked only when event matches task's latest `last_completed_at` AND scheduled due date; H6.3 RPC remains the undo authority. Older rows cannot undo a newer event.
- Calendar has compact title, Day/Week, date picker, today, arrows and horizontal swipe. Swipe must not hijack native vertical scrolling, Safari left/right edge navigation, or direct controls. `prefers-reduced-motion` respected.
- Navigation history floor = Warsaw today - 7 inclusive; past dates disabled in the week strip and date picker, no stale pre-floor querying. Never delete open overdue obligations.
- Cards only show checkbox, name, full notes, room name, relative due-status (today, tomorrow, days ahead, overdue or done), and small room chevron. Recurrence frequency and duplicate full dates are excluded.
- Week counts/group headings derive from occurrence rows, not from the number of parent tasks. Backlog is separately listed only for today/current week; avoid duplicates from grouped occurrences.
- Empty/loading/error/retry states, focus/foreground refresh, and explicit error for stale/unauthorized completion. Food/Voice unchanged.
- H6.4.3 Start integration is separate. `ALL_IN_ONE.sql` is current from H6.4.1; do NOT reapply it or the H6.4.1 migration during this UI-only stage.
