# Kitchen security contract

V0.2 invariants:

1. No sign-up route or sign-up form exists in the frontend.
2. Unauthenticated visitors render only the login surface.
3. Public sign-up and anonymous sign-in remain disabled in Supabase Dashboard.
4. The intended production state contains exactly one owner Auth account.
5. Authentication alone is not sufficient to enter the application shell: every authenticated session must pass `OwnerGate`.
6. `OwnerGate` fails closed and grants access only when `public.is_kitchen_owner()` returns `true`.
7. The owner registry is backend-only in `private.kitchen_owner`; it is not a public application table and receives no direct `anon` or `authenticated` table privileges.
8. No secret/service-role/database-password value may be present in client code or repository files.
9. Every future owner-data table must contain explicit `owner_id`, have RLS enabled before use, and restrict all CRUD operations to both `auth.uid()` ownership and the Kitchen owner authority.
10. Hiding UI is never treated as authorization; database RLS remains authoritative for future data.
