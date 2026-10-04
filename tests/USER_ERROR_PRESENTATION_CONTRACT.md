# User Error Presentation Contract — V2.7

## Goal

Kitchen UI is Polish and must not expose raw Supabase/Postgres implementation details to the household user.

## One shared presentation authority

All user-facing mutation surfaces use:
`src/lib/userError.ts -> toUserErrorMessage(error, fallback)`

Do not add screen-specific parsing of backend messages.

## Rules

- application-owned validation/business messages remain visible as written
- wrapped mutation failures shaped like:
  `Nie udało się <akcja>: <backend detail>`
  are shown only as:
  `Nie udało się <akcja>.`
- the backend suffix must not be rendered in the UI
- each caller still provides a natural Polish fallback
- this helper is presentation-only; it does not change DB/RPC behavior

## Covered V2 surfaces

- Inventory add/edit/remove
- Inventory consume / consume all
- Product rename from Inventory
- Shopping add/edit/remove
- Shopping quick purchase / restore
- purchased quantity correction
- Shopping -> Inventory transfer errors surfaced through InventoryEditor
