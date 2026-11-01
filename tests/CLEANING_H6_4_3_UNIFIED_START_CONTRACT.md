# H6.4.3 — Unified Cleaning Shell + Start (source QA)

## Header authority
- `CleaningShell` is the only H1 owner. Page title is `Start`, `Pomieszczenia`, `Harmonogram` or selected room name; no double H1 / marketing subtitle.
- `Dom` and logout remain; Rooms overview `+`, room-back, rename and room options remain functional. Bottom navbar remains the only route selector.
- Selected room name is in the header, not repeated in the page. Long room names ellipsize on narrow screens.

## Dashboard authority
- Start calls owner-only `h64_list_cleaning_occurrences(todayWarsaw, todayWarsaw+7)` and `loadCleaningTasks` together. No client projection of recurring dates.
- `Nadchodzące` = first three distinct *occurrences*, strictly after today and no later than `today+7` (including possible repeats of a single task). Exclude archived rooms/tasks, completed occurrences, stale schedule revision / generation, and deduplicate identical task/date.
- `Do zrobienia` = first three open server task cursors due today or overdue, including older than seven-day history. No double counting of future occurrences as today's tasks.
- Both groups use `cleaningDueStatus(scheduledDueDate,todayWarsaw)` like Rooms and Schedule, showing `Na dziś` / `Jutro` / `Za N dni` / `Zaległe`. Frequency stays only in Rooms editing.
- Description is visible without opening room. Task opens its room; only checkbox completes current, server-actionable occurrence. Nonactionable future checkbox is disabled with accessible explanatory text.
- Start and Schedule share `useCleaningOccurrenceCompletion`: stable UUID retry with cycle generation, plan revision, due date and server H64 RPC. Rooms H4 completion RPC also uses the same anchored *current server cursor*, not future projection.
- Latest-only undo H6.3 remains. Calling `onChanged` must not unmount Start or lose its feedback/undo action. Refetch on mutations, resume and Warsaw date rollover; errors must not appear as false empty lists.

## Gates
- Source tests `scripts/test-cleaning-h6-ui.mjs`, `scripts/test-cleaning-h6-4-3.mjs`, H2/3/4/5/6.4.2 and H6.3. Full CI npm ci, TS7 semantic, Vite build and real phone + Supabase roles/cron in H6.4.4.
- No SQL change or production migration. `OUTSIDE_REPO/SQL/ALL_IN_ONE.sql` still reflects H6.4.1 SQL and must not be rerun on existing DB.
