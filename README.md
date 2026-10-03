# Kitchen

Private single-user mobile-first PWA for home inventory, shopping and recipes.

## Current production track

- V0.1.2 Foundation/Auth/CI/Deploy — PASS/CLOSED
- V0.2 Database Security — PASS/CLOSED
- V0.3 Mobile-First UI Foundation — PASS/CLOSED
- V1.1 Inventory Data Foundation — PASS/CLOSED
- V1.2 Inventory List / Read Model — PASS/CLOSED
- V1.3 Inventory Add / Edit — implemented, QA/deploy/smoke pending

V1.3 adds owner-scoped Inventory creation and stock-lot editing while preserving the canonical Product model and database RLS. It also applies the SMART UI rule: bottom navigation owns module navigation; Start stays contextual and does not duplicate module cards.

## Stack

React + TypeScript + Vite + PWA + Supabase + GitHub Pages.

## Security

The public boundary is Login. Authenticated sessions must additionally pass the backend Kitchen owner authority through `public.is_kitchen_owner()` before AppShell renders. Inventory mutations remain protected by owner-scoped RLS.
