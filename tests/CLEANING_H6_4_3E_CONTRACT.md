# H6.4.3E definition-only Rooms contract

1. Room task cards contain title, notes, recurrence and edit chevron; no completion checkbox or relative due status.
2. `CleaningTaskBoard` never calls completion/undo. Room edits affect server definition through H4 create/update RPC and hard delete via H6.3 owner-guarded RPC with network-ambiguous outcome reconciliation.
3. For one-off, date label "Termin wykonania"; for new recurring "Pierwszy termin"; for edit recurring "Następny termin". Recurrence definition remains in Rooms, not Schedule cards.
4. Active definitions sorted by Polish title then UUID; `next_due_date` does not influence catalog order. Archived and completed one-off records accessible read-only + delete.
5. Start and Harmonogram own execution/undo and keep independent H64 occurrence controls; no cross-screen completion regression.
6. Scope is UI/source-only: canonical ALL_IN_ONE, RLS, Cron and production SQL untouched.

Contract gate: `node scripts/test-cleaning-h6-4-3e.mjs`; also previous H3/H4/H6/H6.3/H6.4.3 tests must remain active in verifier.
