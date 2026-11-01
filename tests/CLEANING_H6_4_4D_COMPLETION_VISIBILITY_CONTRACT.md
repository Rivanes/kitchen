# H6.4.4D — Harmonogram completion visibility corrective

- A completion is assigned to the **actual Warsaw calendar day of completion**, not the old due date (H6.4.3C invariant).
- When completing any overdue task from a historical day, the selected agenda moves to **today**, and the 7-day strip moves only when today is outside the visible strip.
- After **every successful completion or undo**, invalidate the calendar day cache and pending pre-mutation fetches. A forced reload is mandatory even when the selected date and window remain unchanged. Do not trust old `tasks`, `occurrences`, or `recentCompletions` snapshots.
- The server `h64_list_cleaning_occurrences` remains the single authoritative schedule projection; no new recurrence logic, local completion states or mutations to the SQL schema.
- Completed cards use native checked checkbox and `Zrobione` status; within the chosen day unfinished cards are first and completed cards last. Latest-only undo is triggered by unchecking the checked card, not by a redundant green success banner.
- Success and undo are announced via visually hidden `role=status` for screen readers. Real errors remain visible.
- Check runtime on iPhone: 31.10 overdue → completion 01.11 → view auto-selects 01.11 → done card last and checked → tap checkbox Undo → due/backlog state restored. Check ordinary today completion and repeated loads/re-open. No new SQL migration required.
- New regression: `scripts/test-cleaning-schedule-h6-4-4d.mjs` is part of `scripts/verify-project.mjs`; historical source assertions are adjusted to the new undo signature, not skipped.
