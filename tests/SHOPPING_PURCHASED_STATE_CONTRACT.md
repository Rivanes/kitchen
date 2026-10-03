# Shopping Purchased State Contract — V2.5

## State authority
- `shopping_items.is_purchased` and `shopping_items.purchased_at` remain the database source of truth.
- Bought transition updates both fields together.
- Restore transition updates both fields together.
- The database coherence constraint remains unchanged.
- No separate completion table or second shopping-state system is introduced.

## Presentation
- Shopping read model returns active and purchased rows from the same `shopping_items` authority.
- Active rows remain editable.
- Purchased rows move into a dedicated `Kupione` section and are not edited as active rows.
- Purchased rows are ordered newest purchased first.
- Start/Home active Shopping count remains active-only.
- When no active rows remain but purchased rows exist, the UI says `Wszystko kupione` rather than treating the whole list as empty.

## Interaction
- Active row has an explicit approximately 44–48px bought toggle.
- Marking bought does not delete the row.
- Purchased row can be restored to active state.
- Restore is fail-closed when the same Product/custom identity + unit already exists on the active list; it must not create duplicate active rows.
- Purchased state mutations are owner-scoped and guarded by expected current state.

## Future V2.6
- Purchased rows remain available for Purchased -> Inventory transfer.
- V2.5 does not create Inventory lots and does not recreate Product identity.

## Database
No SQL/schema/RLS/Auth migration is required. V2.2 already introduced the purchased-state columns, constraint, RLS and indexes.
