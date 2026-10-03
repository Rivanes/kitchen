# Inventory Expiry Center Contract — V1.6.2

## Start
- Start exposes one direct `Terminy ważności` action.
- The action summarizes urgent, upcoming and missing expiry information without duplicating Inventory navigation.
- Missing declared expiry dates are counted explicitly.

## Expiry Center
- Every stock lot is represented, including lots with no declared expiry date.
- Filters: `Wszystkie`, `Z terminem`, `Bez terminu`.
- `Bez terminu` means `expiry_date IS NULL`, even when an opened-use-by date exists.
- Clicking a row opens the normal Inventory edit flow so the user can fill/correct expiry data.

## Color thresholds
Effective expiry uses the earlier of:
- declared `expiry_date`
- `opened_use_by_date`

Status colors:
- <= 3 days, today, overdue: red / critical
- 4–10 days: orange / warning
- > 10 days: green / good
- no effective date: neutral `Nie podano`

Date-only calculations must remain timezone-safe.
