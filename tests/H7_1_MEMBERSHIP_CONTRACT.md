# Kitchen H7.1 — Multi-User Foundation contract

**Candidate only.** Source-level tests do not establish the SQL runtime security or permit a production rollout.

- Private `private.kitchen_members`: caller UUID, role ADMIN/member, ACTIVE/suspended status. Existing administrator UUID and `owner_id` values unchanged.
- `public.is_kitchen_member()` is a security INVOKER helper; private membership lookup is a `SECURITY DEFINER` helper in a non-exposed schema. Browser can only query `public.kitchen_my_access()` for its own row.
- All owner-scoped RLS policies must preserve `owner_id = auth.uid()` and the ACTIVE member guard, including Storage policies. Other users' data is never visible to ADMIN by default.
- Public/signup is disabled. No invitation URL, `signUp`, secret key or membership creation in browser during H7.1.
- `MembershipGate` is keyed by `user.id` and uses a fail-closed `checking` state. It renders Food/Cleaning only on verified active membership. Switch A→B clears old modules and state.
- Initial account seed creates five own system `storage_locations` in one SQL transaction; H7.2 will test this flow using a second account in staging, not create accounts in production.
- SQL cutover is atomic (BEGIN/COMMIT); migration requires verified live baseline, staging and backup. Do not execute from an old or unverified snapshot.
- `ALL_IN_ONE.sql` is for clean install only. No production user setup via this file.

## H7.1B — Legacy RPC security corrective

- `archiveCleaningTask()` is removed from browser code after a repo-wide caller audit: it had no callers. Historic H3 SQL remains for compatibility but its `authenticated` EXECUTE is revoked in the H7.1 cutover.
- `h4_complete_cleaning_task` remains **installed** and callable internally by `h64_complete_cleaning_occurrence` (SECURITY DEFINER); browser `authenticated` EXECUTE is revoked.
- Only `h64_complete_cleaning_occurrence` is the browser completion authority; H4 task create/update, H63 delete/undo remain legitimately callable.
- Both legacy direct grants must be false in the H7.1 postcheck. SQL staging A/B, anon and Storage runtime QA remain mandatory; static source tests alone do not authorize production cutover.
