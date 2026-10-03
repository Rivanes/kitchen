# Inventory Expiry Contract — V1.6 / V1.6.2

## Declared expiry
- `expiry_date` remains optional and date-only (`YYYY-MM-DD`).
- Date-only values use explicit calendar/UTC arithmetic, never ambiguous `new Date(value)` parsing.
- Create and edit persist expiry.
- Lots with different declared expiry dates remain separate.

## Effective expiry
V1.6.2 introduces opened-product semantics.
The effective deadline is the earlier non-null value of:
- declared `expiry_date`
- opened `opened_use_by_date`

## Status thresholds
- overdue through <=3 days: critical / red
- 4–10 days: warning / orange
- >10 days: good / green
- no effective date: neutral / `Nie podano`

## Expiry Center
- Start exposes direct access to all expiry records.
- Missing declared expiry remains visible and filterable as `Bez terminu`.
- The user can edit a row directly to complete/correct expiry metadata.

## Merge
SMART create-merge requires same Product + Location + Unit + Declared Expiry + After-open rule and only merges into an unopened lot.
