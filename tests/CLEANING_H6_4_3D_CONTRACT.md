# Cleaning H6.4.3D — reconciliation contract

- SOURCE AUTHORITY: `h64_list_cleaning_occurrences(date,date)` owns recurrence projections, with 7-day completed-history boundary.
- A pending **overdue** task has exactly one open cursor; no future forecast until it is completed (next cycle is based on completion day). Server filters `future_ordinal` by `t.next_due_date >= v_today`.
- Start **Do zrobienia** includes the open cursor. Start **Nadchodzące** includes the next **actionable** future cursor only, not blocked projections. Server returns `is_actionable=true` on cursor; this field is not inferred from date alone.
- Harmonogram shows pending overdue in Zaległe; a projected date from an overdue task must never show 'Na dziś' with 'Najpierw wcześniejszy termin'.
- On completion today (Europe/Warsaw), the completed occurrence appears today; next cadence shifts by duration from completion as implemented in H64_7. Undo latest restores prior cursor/anchor.
- Calendar retains future projections for tasks not overdue, including tasks newly created with future first due. No fake duplicates in Start.
- Explicit regression: as of 2026-11-01 task due 2026-10-31 'Puścić odkurzacz' is overdue; not Na dziś as blocked 1 Nov or Jutro as blocked 2 Nov.
- SQL runtime, owner/nonowner auth, GitHub TypeScript/Vite, iPhone test pending.
