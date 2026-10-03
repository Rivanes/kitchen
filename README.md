# Kitchen

Private single-user mobile-first PWA for home inventory, shopping and recipes.

## Current production track

- V0.1.2 Foundation/Auth/CI/Deploy — PASS/CLOSED
- V0.2 Database Security — PASS/CLOSED
- V0.3 Mobile-First UI Foundation — PASS/CLOSED
- V1.1 Inventory Data Foundation — PASS/CLOSED
- V1.2 Inventory List / Read Model — PASS/CLOSED
- V1.3 Inventory Add / Edit — production smoke in progress
- V1.3.1 TypeScript narrowing corrective — applied
- V1.3.2 SMART Browse / Home Density corrective — ready for GitHub QA

V1.3 adds owner-scoped Inventory creation and stock-lot editing while preserving the canonical Product model and database RLS.

V1.3.2 improves scale without adding schema scope: Inventory is organized as location accordions, large inventories gain contextual product search, and Start becomes a richer SMART dashboard with compact previews of future contextual features rather than duplicate module navigation.

## Stack

React + TypeScript + Vite + PWA + Supabase + GitHub Pages.

## Security

The public boundary is Login. Authenticated sessions must additionally pass the backend Kitchen owner authority through `public.is_kitchen_owner()` before AppShell renders. Inventory mutations remain protected by owner-scoped RLS.
