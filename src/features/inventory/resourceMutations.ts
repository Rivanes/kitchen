import { supabase } from '../../lib/supabase/client'
import { readStoredQuantity } from '../quantity/quantity'

type SpicePresenceRpcRow = {
  present: boolean
  shopping_item_id: string | null
  shopping_created: boolean
}

type HouseholdAdjustRpcRow = {
  current_quantity: number | string
  shopping_item_id: string | null
  shopping_created: boolean
}

export type SpicePresenceResult = {
  present: boolean
  shoppingItemId: string | null
  shoppingCreated: boolean
}

export type HouseholdAdjustResult = {
  currentQuantity: number
  shoppingItemId: string | null
  shoppingCreated: boolean
}

export async function setSpicePresence(ownerId: string, productId: string, present: boolean): Promise<SpicePresenceResult> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .rpc('set_spice_presence', {
      p_owner_id: ownerId,
      p_product_id: productId,
      p_present: present,
    })
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się zmienić stanu przyprawy: ${result.error.message}`)
  }
  if (!result.data) throw new Error('Nie udało się potwierdzić stanu przyprawy.')

  const row = result.data as SpicePresenceRpcRow
  return {
    present: row.present,
    shoppingItemId: row.shopping_item_id,
    shoppingCreated: row.shopping_created,
  }
}

export async function adjustHouseholdStock(ownerId: string, productId: string, delta: -1 | 1): Promise<HouseholdAdjustResult> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .rpc('adjust_household_stock', {
      p_owner_id: ownerId,
      p_product_id: productId,
      p_delta: delta,
    })
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się zmienić stanu Domowe: ${result.error.message}`)
  }
  if (!result.data) throw new Error('Nie udało się potwierdzić stanu Domowe.')

  const row = result.data as HouseholdAdjustRpcRow
  return {
    currentQuantity: readStoredQuantity(row.current_quantity, 'Baza zwróciła nieprawidłowy stan Domowe.'),
    shoppingItemId: row.shopping_item_id,
    shoppingCreated: row.shopping_created,
  }
}
