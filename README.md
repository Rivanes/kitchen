# Kitchen

Private single-user mobile-first PWA for home inventory, shopping and recipes.

## Current production track

- V0.1.2 Foundation/Auth/CI/Deploy — PASS/CLOSED
- V0.2 Database Security — PASS/CLOSED
- V0.3 Mobile-First UI Foundation — PASS/CLOSED
- V1.1 Inventory Data Foundation — PASS/CLOSED
- V1.2 Inventory List / Read Model — PASS/CLOSED
- V1.3 Inventory Add / Edit — PASS/CLOSED
- V1.4 Inventory Consume / Remove — READY FOR QA

V1.4 adds explicit stock depletion. Partial consumption reduces a lot, exact depletion removes the lot instead of persisting quantity zero, and explicit removal deletes only the stock lot while keeping the canonical Product reusable.

The current storage-location accordion remains an interim browse layout. The agreed future direction is separate Lodówka / Zamrażarka / Szafka-spiżarnia pages.

## Stack

React + TypeScript + Vite + PWA + Supabase + GitHub Pages.

## Security

The public boundary is Login. Authenticated sessions must additionally pass the backend Kitchen owner authority through `public.is_kitchen_owner()` before AppShell renders. Inventory reads and mutations remain protected by owner-scoped RLS.
