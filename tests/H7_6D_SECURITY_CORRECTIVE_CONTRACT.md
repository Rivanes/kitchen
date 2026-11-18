# H7.6D Security Corrective — focused invariants

## MembershipGate

- Existing `key={session.user.id}` and `kitchen_my_access` remain the single authorization gate for Food + Cleaning.
- Check at first mount, on visible/focus/pageshow/online, and every 5 minutes while visible.
- Rechecks are serialized; a foreground event during an in-flight request queues one fresh check.
- Until the server confirms an active membership, previously loaded private UI stays hidden. The HomeHubShell subtree is **kept mounted during successful revalidation** so an in-progress form isn't lost.
- `suspended`/`denied`/network failure unmount HomeHubShell and fail closed; role is cleared. Unmount also clears old private React state on revocation.
- `visibilitychange`, `focus`, `pageshow`, `online` and periodic timer must be removed on unmount/account switch. No new auth authority or client-side bypass.

## SQL

- `rls_auto_enable()` is an existing Postgres-owned EVENT TRIGGER helper (`ensure_rls`) in public schema; it is **not** a client API.
- H7.6D.1 revokes only EXECUTE on that exact function from PUBLIC, anon, authenticated and service_role. Preserve function, event trigger, owner, RLS behavior, all data and other RPC grants.
- Execute only after read-only preflight and a verified backup; postcheck six booleans all true. Do not run historical migrations again.
- **No `.sql` file may be present in GitHub/`REPO`/`UPDATED_FILES`.** The three H7.6D.1 scripts are maintained exclusively in `UPDATED_SQL` and `OUTSIDE_REPO/SQL`. A package-only SQL parity test lives under `OUTSIDE_REPO/QA` and is intentionally not called by GitHub CI, which checks out `REPO` alone.

## Deferred release gates

- Existing Kitchen invitation flow uses `email_confirm: true` but does not verify mailbox ownership. This is **P1 OPEN**, requires a working Supabase Auth email delivery + verified-email onboarding design before exposing registration to untrusted users. Do not silently change the live flow while three testers are active.
- Real HTTP JWT A/B, suspension in open iOS/Android PWA, email ownership, invites compensation/race, and backup→restore remain OPEN until tested.
