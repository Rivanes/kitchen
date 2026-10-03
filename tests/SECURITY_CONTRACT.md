# Kitchen security contract

V0.1 invariants:

1. No sign-up route or sign-up form exists in the frontend.
2. Unauthenticated visitors render only the login surface.
3. Authenticated sessions render the application shell.
4. Session persistence and token refresh are delegated to Supabase Auth.
5. No secret/service-role key may be present in client code or repository files.
6. Public sign-up must be disabled in Supabase Dashboard before production smoke.
7. Every future user-data table must use RLS and `auth.uid()` ownership checks.
