# Inventory Location Pages Contract — V1.5

V1.5 replaces the interim accordion-only Inventory browse with separate page/view states.

Required behavior:

- `Zapasy` is the overview / entry surface.
- Every owner storage location is shown as a navigation card on the overview.
- `Lodówka`, `Zamrażarka`, `Szafka / spiżarnia` (and future owner locations) open as separate detail views.
- A location detail view shows only stock assigned to that location.
- Location detail has an explicit back action to `Zapasy`.
- Pressing the active bottom-nav `Zapasy` item while inside a location returns to overview.
- Add from a location detail preselects that location in the existing add flow.
- Editing may still move a lot to another location.
- Search appears contextually for large location inventories rather than permanently.
- Existing V1.3/V1.4 add/edit/consume/remove behavior remains available from location detail.
- Storage-location CRUD is not introduced in V1.5; existing location rows remain read-only from the browser.
- No SQL/schema change is required for V1.5.
