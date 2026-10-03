# Inventory V1 Closeout Contract — V1.7

V1.7 is a polish/corrective stage, not a new Inventory feature family.

## Browse scalability

- `Zapasy` remains an overview/entry surface for separate storage-location pages.
- At 8+ stock lots the overview exposes one cross-location search field.
- Cross-location search matches product names and storage-location names.
- Search filters the location entry cards rather than flattening all Inventory into one permanent list.
- Location detail search remains contextual at 8+ lots in that location.

## Expiry Center

- canonical title is `Terminy ważności`.
- filters remain `Wszystkie / Z terminem / Bez terminu`.
- zero-valued urgency chips are not rendered.
- when there is no critical/warning/missing state, one calm `Wszystko w porządku` state is shown.
- at 10+ lots, Expiry Center exposes product/location search.
- missing declared dates remain visible as `Nie podano`.

## Opened-product calendar

The authoritative consume RPC must assign `opened_at` using the explicit Kitchen household calendar, Europe/Warsaw, rather than the implicit database/session timezone.

## Preserved V1 invariants

- Auth + OwnerGate remain mandatory.
- owner_id + RLS remain authoritative.
- locations stay separate pages.
- add/edit/consume/remove/expiry/opened-product flows remain available.
- quantity zero is never persisted.
- package-content normalization is intentionally deferred until before Recipe Matching.
