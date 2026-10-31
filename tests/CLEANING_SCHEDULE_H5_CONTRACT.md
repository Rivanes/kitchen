# H5 — Harmonogram Porządki contract

- **One authority:** all data comes from `loadCleaningTasks(ownerId)` (H4 owner-scoped RLS), and checkboxes call `completeCleaningTask(task.id, expectedGeneration, operationId)` (H4 atomic RPC). Never write directly to tasks/completions from schedule.
- **Only current next due:** recurring tasks appear once, at persisted `next_due_date`. Do not fabricate future occurrences or infer history from current state. One-off completed items may remain visible on their original due day.
- **Filter:** only active tasks in active rooms; archive excluded; room filter never leaks archived room. Unknown room IDs filter to none in pure projection.
- **Day/week dates:** civil dates with Monday-start; Europe/Warsaw today, DST-safe UTC noon calculations; accessible date input, previous/next/today. Week display has no repeated overdue task in the backlog panel.
- **Overdue:** only incomplete tasks strictly older than today; current week keeps that week's overdue items in date group and includes *older* backlog separately. Today day view shows all backlog separately.
- **Completion:** disable duplicate taps; keep operation UUID after ambiguous failure; never resubmit a new cycle on retry after an external refresh. UI receives authoritative updated row and refreshes on reentry/focus.
- **UI:** shared H3.1 cleaning-blue styling, cards, checkbox and Food-derived input vocabulary, bottom navbar unobstructed, focus and 320px widths.
- **State:** empty/loading/error/retry/feedback; active room -> room task detail; completed oneoff shown checked/disabled; no fake future dates.
- **No SQL** for H5; H2–H4 data/RLS remains unchanged; Voice AI stays frozen.
- **Test:** `node --experimental-strip-types scripts/test-cleaning-schedule-h5.mjs` and `node scripts/verify-project.mjs`; GitHub QA + Pages same commit; production iPhone acceptance before H5 CLOSED.
