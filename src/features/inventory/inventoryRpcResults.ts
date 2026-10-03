/**
 * Shared runtime decoder for Inventory RPCs that return an inventory item id.
 *
 * The project intentionally uses an ungenerated Supabase client type. In that
 * configuration custom RPC row payloads are inferred as `{}` by TypeScript.
 * Treat the network payload as unknown and validate the field once here rather
 * than asserting the same shape independently in Inventory and Shopping.
 */
export function requireInventoryItemId(payload: unknown, errorMessage: string): string {
  if (
    typeof payload !== 'object'
    || payload === null
    || !('inventory_item_id' in payload)
    || typeof payload.inventory_item_id !== 'string'
    || payload.inventory_item_id.length === 0
  ) {
    throw new Error(errorMessage)
  }

  return payload.inventory_item_id
}
