# H3.1 — Cleaning UI parity with Food (corrective, no SQL)

## Permanent constraints
- Forms for rooms/tasks use the existing Food design primitives: `sheet-backdrop`, `inventory-sheet`, `sheet-header`, `form-field`, `sheet-actions`, `primary-button`/`secondary-button`.
- Blue accent is limited to `.cleaning-shell` / `.cleaning-editor-sheet` CSS. Food forms, services and state are not modified.
- Creating/renaming rooms and creating/editing tasks opens a scrollable sheet above the bottom navbar. Closing a sheet does not save.
- The task due date is a real `type="date"` control, not a fake custom calendar; a visible calendar icon is non-interactive so the underlying native control remains tappable. On Safari iOS verify opening native picker by tapping both the date and icon.
- Keep at least 48px touch targets and 16px inputs. Respect safe-area insets, soft keyboard and 320px viewport.
- H3 operations remain one-off. No recurrence, SQL migration, RPC, RLS or Voice changes.
- Required device QA: small iPhone portrait, browser toolbar and keyboard, form open/close, picker open/dismiss, save, error, no navbar overlap, return from edit, Food unchanged.
