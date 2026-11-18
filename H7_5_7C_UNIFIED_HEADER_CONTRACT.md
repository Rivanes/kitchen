# H7.5.7C — Unified Header System

One Kitchen product, two domain palettes, one navigational header.

- `src/components/ModulePageHeader.tsx` alone renders the module-level visible H1, brand mark and `Dom` / logout actions. `AppShell` (Food) and `CleaningShell` (Cleaning) pass only current title, palette, handlers and title ID.
- All Food overview titles (`Twoja kuchnia`, `Zapasy`, `Zakupy`, `Przepisy`, `Terminy ważności`) are owned by `AppShell`, not repeated as page-level H1. Cleaning retains its dynamic `Start / Pomieszczenia / Harmonogram / room name` title in `CleaningShell` and the same shared header.
- Header title typography, gap, action sizing and responsive truncation use the same CSS classes. Food/cleaning only change the accent palette and mark. Bottom navigation remains module-specific.
- Screen tools belong to the content they operate on: Inventory search/add, Shopping active-list add, Recipe category filter/add, Cleaning Rooms labelled add. The Cleaning Schedule calendar remains untouched. No empty plus-only header row.
- Shopping uses one `Dodaj` action in each state: next to `Do kupienia` for active rows, or in the relevant empty state; no duplicate bottom footer.
- Refresh glyphs do not occupy the main headers. Each Food list loads on entry, revalidates after mutations and on foreground resume via `useForegroundRefresh`, with `Spróbuj ponownie` retained in failure states. Active editors/mutations must not be interrupted on resume.
- One visible H1 does **not** mean removing useful named sections, relevant counts, selected-item headings, meaningful empty states or add/edit actions.
- Scope excludes changing Supabase/RLS/SQL, recipe matching, task schedules, persistence, auth and startup animation.

Source contract: `scripts/test-h7-5-7c-unified-header.mjs` (part of `npm run check`). Mobile production smoke still required after GitHub deployment.
