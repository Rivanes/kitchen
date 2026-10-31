# H5 — history of Cleaning Schedule (superseded by H6.4.2)

H5 introduced single-`next_due_date` Day/Week navigation and a shared H4 completion RPC.
H6.4.1 replaced the SQL business authority with anchored occurrence projection.
H6.4.2 replaced the H5-only calendar reader and compacted its UI.

**Retained H5 invariants:** Warsaw civil date, Monday-start week, DST-safe arithmetic,
owner/RLS access, archived-room filtering, and no direct browser table writes.

**Superseded (do NOT reintroduce):** one visible recurrence per task, no future projection,
showing frequency on calendar cards, and one-date-only H5 tests.

Current behavioral and source test: `scripts/test-cleaning-schedule-h6-4-2.mjs`.
Legacy civil-date test remains `scripts/test-cleaning-schedule-h5.mjs`.
