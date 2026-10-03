# Kitchen

Private single-user kitchen inventory, recipes and shopping list PWA.

## Current baseline

V0.3 — Mobile-First UI Foundation.

Included:
- React + TypeScript + Vite
- installable PWA baseline under `/kitchen/`
- Supabase browser client
- email/password login wall
- no public sign-up UI
- single-owner `OwnerGate` backed by `public.is_kitchen_owner()`
- light, phone-first design foundation
- touch-first inputs, buttons and bottom navigation
- responsive desktop extension of the mobile layout
- GitHub Actions QA on every push to `main`
- GitHub Pages deployment workflow

V0.3 changes presentation only. The V0.2 security model remains authoritative and no Inventory/Shopping/Recipe database tables are introduced yet.

## Normal workflow

The project is intended to be maintained without requiring command-line Git usage.

1. Execute controlled SQL changes through Supabase SQL Editor only when a stage includes SQL.
2. Upload changed repository files through the GitHub web interface.
3. Commit changes to `main`.
4. Open the **Actions** tab.
5. `Kitchen QA` performs project verification, dependency installation, TypeScript checking and production build automatically.
6. Deploy through the existing GitHub Pages workflow only after QA passes.
7. Perform the stage production smoke before marking it PASS.

## Product UX direction

Kitchen is mobile-first. Light mode is the default product direction: white/off-white surfaces, calm green accents, comfortable touch targets and a friendly domestic feel. Desktop is an adaptive extension, not the primary layout. Optional dark mode remains a later enhancement.

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
