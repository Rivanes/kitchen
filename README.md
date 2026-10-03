# Kitchen

Private single-user kitchen inventory, recipes and shopping list PWA.

## Current baseline

V0.2 — Database Security Foundation.

Included:
- React + TypeScript + Vite
- installable PWA baseline
- Supabase browser client
- email/password login wall
- no public sign-up UI
- single-owner `OwnerGate` backed by `public.is_kitchen_owner()`
- GitHub Actions QA on every push to `main`
- GitHub Pages deployment workflow

The V0.2 SQL authority is delivered outside the repository package and creates a backend-only owner registry in Supabase. Application data tables are still intentionally deferred until V1 Inventory.

## Normal workflow

The project is intended to be maintained without requiring command-line Git usage.

1. Execute controlled SQL changes through Supabase SQL Editor when a stage includes SQL.
2. Upload changed repository files through the GitHub web interface.
3. Commit changes to `main`.
4. Open the **Actions** tab.
5. `Kitchen QA` performs project verification, dependency installation, TypeScript checking and production build automatically.
6. Deploy through the existing GitHub Pages workflow only after QA passes.
7. Perform the stage production smoke before marking it PASS.

## Product UX direction

Kitchen is mobile-first. The current dark Foundation skin is temporary technical UI only. Before V1, V0.3 will replace it with a light, white/off-white, friendly touch-first design system. Optional dark mode may be added later; it is not the default design direction.

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
