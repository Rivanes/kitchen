# H7.3C — Admin Invitations and Retention Contract

Status: **SOURCE PREPARED, LIVE SQL/EDGE/GITHUB/E2E NOT YET CONFIRMED**.

- Admin route: `https://rivanes.github.io/kitchen/admin`; direct refresh on GitHub Pages via `public/404.html` route fallback. Only active `admin` from `kitchen_my_access` may see it; Edge always rechecks JWT and active admin in private SQL.
- Admin sees only `issued`/nonexpired invitations, refreshed server-side. After issue, Copy works on any device/browser after relogin. Raw token is encrypted AES-256-GCM with `KITCHEN_INVITE_ENCRYPTION_KEY` only in Edge Secrets; database has ciphertext and nonce plus SHA-256 hash, never plaintext URL.
- Previously issued H7.3 hashes do not have decryptable URLs; they may be revoked but cannot be recovered.
- On complete registration, `h73_activate_member` atomically inserts member (5 location trigger) and DELETES invitation row. `h73_revoke_invite` deletes only `issued` invitations. Failed claims are removed, expired issued rows removed by list/issue and `pg_cron` every 5 minutes. In-flight claimed/sent rows are hidden and kept up to 30 minutes after expiry for crash/grace recovery.
- Link expires immediately at `expires_at`: only `h73_claim_invite` with `state='issued' AND expires_at>now()` grants a claim; delayed physical deletion cannot reopen it. Opening the link never consumes it.
- Direct API `anon/authenticated` grants forbidden for h73c_* RPC; private table RLS. Member does not have admin route and cannot list, revoke or issue invitations through Edge.
- No SMTP or public signUp. Server creates email/password Auth with `email_confirm:true` — unverified ownership, **test-only**. Existing H7.1C cross-owner negative API/Storage still OPEN.
- No repeated H7.1/H7.3 migrations, never run `ALL_IN_ONE.sql` on existing test database. Only H7.3C incremental migration once.
- Test: precheck, migration, corrected postcheck 8/8; Edge update with secret; GitHub deploy; issue, copy after reload, revoke, successful signup, replay denial, expiry, member access denied, H6.4 Cron preserved.

## CI boundary regression (2026-11-17)

- GitHub Actions checkout contains **REPO only**, not `../OUTSIDE_REPO`. `scripts/test-h7-3-invites.mjs` and `scripts/test-h7-3c-admin.mjs` must not read SQL migration paths outside repo.
- Local `typescript` must be resolved from project `devDependencies` installed by `npm ci`, never a global NVM installation path.
- SQL migration, pre/postcheck, and clean-install parity remain separate in `OUTSIDE_REPO/QA/H7_3_SQL_CONTRACT_CHECK.mjs` and `H7_3C_SQL_CONTRACT_CHECK.mjs`, not deployable GitHub source.
- Live H7.3C SQL 8/8 PASS, Secrets present; latest GitHub build screenshot showed ENOENT, so commit QA/Pages PASS is still required.
