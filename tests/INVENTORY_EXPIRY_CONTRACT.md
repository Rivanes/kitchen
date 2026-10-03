# Inventory Expiry Contract — V1.6

V1.6 activates the already-existing `inventory_items.expiry_date` field without changing the database schema.

## Data rules

- expiry is optional
- browser sends a date-only `YYYY-MM-DD` string or `null`
- date-only values are parsed with explicit calendar parts / UTC arithmetic, never ambiguous timezone parsing
- create and edit both persist expiry
- SMART create-merge may combine lots only when Product + Location + Unit + Expiry are identical
- different expiry dates always remain separate lots

## UX rules

- editor exposes optional `Termin ważności`
- location lists sort dated lots by nearest expiry first, undated lots last
- overdue / today / soon / later states are visually distinct but restrained
- Home activates `Do zużycia` only when an expiry needs attention
- attention means overdue or due within 7 calendar days
- no notifications or background reminders are introduced in V1.6

## SMART density cleanup

- Home shows one natural product-count summary, not Product/Position/Location database counters
- Zapasy overview does not repeat large Product/Position counters
- everyday UI does not use the technical word `pozycja`
- when multiple stock lots for one Product must be distinguished, the natural term `partia` may be used

## Security

Expiry is only another field on the existing owner-scoped `inventory_items` table.
Supabase Auth, owner authority and RLS remain the authorization boundary.
