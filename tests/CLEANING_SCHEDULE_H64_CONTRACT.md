## H6.4.3C amendment — rolling completion / actual-day history

- With the original planned due 2026-10-31, completing on 2026-11-01 displays a checked card on **2026-11-01** (not 2026-10-31); original scheduledDueDate remains stable for H64 RPC identity and latest-only undo.
- The same weekly recurrence shifts to **2026-11-08**, **2026-11-15**, etc. The two-week recurrence shifts to **2026-11-15**, not 2026-11-14.
- Before first execution, future projection still starts from the created due date and is visible without performing it.
- Server `schedule_anchor_date` rolls on execution, revision bumps; undo restores the snapshotted previous anchor and invalidates cached revisions. No false historical done flags for missed occurrences.
- Start future previews and Harmonogram use the same H64 owner-scoped occurrence RPC; no second recurrence engine.
- Retention stays seven days and cron stays enabled; no need to re-run H64_2.
- Check on real phone, in live owner RPC and role/security tests before final PASS.

# H6.4.2 Corrective — Harmonogram (single selected day)

- Calendar schedule is an **execution surface**, not another room/task editor. `CleaningShell` shows **one** H1 for Harmonogram in the existing top header. H6.4.3 will unify the other Cleaning headers, without duplicating this H1.
- Exactly one selected date and a seven-day strip, with seven tappable date buttons; no Day/Week toggle, native date picker, or room filter. One compact **Dzisiaj** button resets to Warsaw today. Arrows move one week; previous navigation is restricted by Warsaw today - 7 inclusive. A selected day heading shows *only its occurrence count*; overdue backlog has a separate count and is shown only on today.
- Drag may start **on the date buttons**, including disabled historical dates (`aria-disabled`, not HTML `disabled`). Pointer events track movement continuously with a translateX transform on the strip; lock horizontal intent and capture pointer only when movement is unambiguously horizontal. On release: one change of week or animate return to 0; suppress the synthetic button click after a drag. Do not attach horizontal gestures to task list (native vertical scrolling), other controls or iOS edge gestures. `touch-action: pan-y`, `prefers-reduced-motion` and 44px+ tap targets must remain.
- Server `h64_list_cleaning_occurrences(date,date)` remains the **only** recurrence projection authority; `cleaning_tasks` is read-only metadata / old-overdue cursor source. No client-side future cycle generation.
- Only actionable occurrence can complete with `h64_complete_cleaning_occurrence(task,generation,UUID,due,revision)`; keep retry UUID tied to same exact cursor. Future nonactionable checkbox is disabled with accessible explanation. No client direct writes.
- Checked latest occurrence can be unchecked only when scheduled due date and `last_completed_at` match the latest active completion event; undo remains via H6.3 RPC. Older history snapshots cannot undo newer cycles.
- Cards show checkbox, title, **full notes**, room, relative due status and small room chevron — never frequency or repeated full due date. No standalone room-open button rows.
- Real calendar-history floor is Warsaw today minus 7 inclusive; do not drop old unresolved overdue task records. `pg_cron` physical retention configured by H6.4.1; no SQL changes in this UI stage.
- Loading, errors, retry and focus refresh are preserved. Start/Nadchodzące server occurrence parity and unified other headers are H6.4.3. Phone/CI/regressions remain H6.4.4; source tests are not substitute for iPhone Safari drag QA.
- Never rerun H64_2_MIGRATION.sql or SQL/ALL_IN_ONE.sql on production. Voice/AI frozen and Food untouched.

## H6.4.3F future forecast contract

- An overdue recurring task does **not** erase future calendar dates; server-generated forecast rows remain `is_actionable=false`.
- An overdue weekly/monthly/every-N-days projection is **tentative**: after actual late completion the cycle is rebased, and the projections refresh.
- Every-day recurrence (`every_days/1`) always forecasts each next calendar day.
- The overdue executable cursor is kept separately; Start never lists blocked future forecasts as actionable "Nadchodzące".
- No client-side date generation; retained history remains seven days; no change to SQL permissions.
