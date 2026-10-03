# Kitchen

Personal kitchen inventory, recipes and shopping list PWA.

## Current baseline

V0.1.2 — GitHub Web + CI Baseline.

Included:
- React + TypeScript + Vite
- installable PWA baseline
- Supabase browser client
- email/password login gate
- no public sign-up UI
- protected application shell
- GitHub Actions QA on every push to `main`
- GitHub Pages deployment workflow

## Normal workflow

The project is intended to be maintained without requiring command-line Git usage.

1. Upload changed repository files through the GitHub web interface.
2. Commit changes to `main`.
3. Open the **Actions** tab.
4. `Kitchen QA` performs project verification, dependency installation, TypeScript checking and the production build automatically.
5. Deployment runs when GitHub Pages and the two required repository variables are configured.

## Optional local setup

Local development is optional:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Never commit database passwords, secret/service-role keys, or `.env.local`.

## Security invariant

The application UI is not accessible without an authenticated Supabase session. Public sign-up must remain disabled in Supabase. Every future data table must have RLS enabled and user-scoped policies before production use.
