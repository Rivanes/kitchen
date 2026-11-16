# H7.3 — Invite-only Registration contract

- Public `signUp` remains disabled at Supabase Auth. Kitchen frontend never calls `signUp`; invitation links only.
- Admin controls may be shown only after caller-only `kitchen_my_access()` reports `admin/active`; the Edge Function independently authenticates JWT and DB membership.
- Each 256-bit random invitation token is returned to the admin only once. The database stores SHA-256 `token_hash` only. TTL 24 hours, one atomic `issued -> claimed` transition on actual email submit; opening/previewing the URL does not consume it.
- Edge Function is deployed with `verify_jwt=false` **only because public claim needs to work**; all privileged actions validate an Auth user JWT in the function, with RPC EXECUTE grants limited to `service_role`.
- Claim invokes native server-side Supabase `inviteUserByEmail` with a trusted hardcoded-from-secret redirect. No password is stored in Kitchen data or submitted to the claim endpoint. Native Auth email verifies ownership.
- On returning from the email invite, the recipient sets a password with `auth.updateUser`. Activation checks verified Auth email, same invited Auth UUID/email and an actual Auth password before atomically creating `member/active` (the existing H7.2 trigger creates five locations).
- Invalid/reused/revoked/expired link and repeated/parallel claims fail closed; `failed` invite cannot be reused; operational reissue is a new invitation.
- Admin cannot access private owner records of another user. No invitation token, email/password, or service-role key in logs, localStorage, source repository, or client bundle.
- H7.3 cannot be released externally until SQL pre/postcheck, Edge deploy, SMTP/redirect/Auth settings, A/B/RLS/RPC/Storage negative security QA and real email invite flow PASS on the designated test database.
