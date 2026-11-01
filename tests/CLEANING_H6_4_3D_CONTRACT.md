# Cleaning H6.4.3D → H6.4.3F — current Start/Calendar coherence contract

## Current enforced behavior (H6.4.3F)

- `public.h64_list_cleaning_occurrences(date,date)` is the **only** recurrence projection authority; it is owner-guarded and limited by the seven-day history window.
- Each task has **one executable cursor** (`is_actionable=true`), including an overdue one. Future projected occurrences are **visible in Harmonogram but not actionable** (`is_actionable=false`).
- Start **Do zrobienia** shows the open cursor due today or overdue, including obligations older than history retention. Start **Nadchodzące** shows only executable future cursors; blocked projected dates must NEVER be surfaced there as "Jutro"/"Za N dni" to complete.
- For daily tasks (every_days/1), the calendar projects every next day even if the previous cursor is overdue. For longer cycles, future calendar dates are **tentative** until a delayed completion rebases the schedule.
- Latest completion appears under its actual `completed_local_date`; strict latest-only undo restores previous cursor and schedule anchor. The SQL production gate and iPhone smoke are required for final PASS.
- Regression on 2026-11-01: task due 2026-10-31 is overdue and actionable once. Its daily 2026-11-01 and 2026-11-02 previews remain visible in Harmonogram but do not populate Start's actionable Upcoming.

## Historical behavior superseded

H6.4.3D's `H64_11` migration suppressed **all** future projections when `next_due_date < today`. That accidentally emptied the calendar and broke daily recurrence previews. Historical `H64_11` is retained for migration provenance, but `H64_14_FORECAST_WITH_BACKLOG_MIGRATION.sql` replaces the RPC and `ALL_IN_ONE.sql` matches the latest function. Never reintroduce that old filter in the current engine.
