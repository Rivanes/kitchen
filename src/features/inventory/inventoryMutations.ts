import { supabase } from '../../lib/supabase/client'
import {
  cleanupCreatedCanonicalProduct,
  resolveOrCreateCanonicalProduct,
} from '../products/productCatalogMutations'
import {
  assertValidQuantity,
  readStoredQuantity,
} from '../quantity/quantity'
import { addDaysDateOnly } from './expiry'

export type CreateInventoryLotInput = {
  ownerId: string
  productName: string
  existingProductId: string | null
  storageLocationId: string
  quantity: number
  unitCode: string
  expiryDate: string | null
  afterOpenDays: number | null
}

export type UpdateInventoryLotInput = {
  ownerId: string
  lotId: string
  storageLocationId: string
  quantity: number
  unitCode: string
  expiryDate: string | null
  afterOpenDays: number | null
}

export type ConsumeInventoryLotInput = {
  ownerId: string
  lotId: string
  quantity: number
}

export type RemoveInventoryLotInput = {
  ownerId: string
  lotId: string
}

export type ConsumeInventoryResult = {
  depleted: boolean
  remainingQuantity: number
  openedAt: string | null
  openedUseByDate: string | null
}


type CurrentInventoryLot = {
  id: string
  quantity: number | string
  opened_at: string | null
}

type ConsumeRpcRow = {
  depleted: boolean
  remaining_quantity: number | string
  opened_at: string | null
  opened_use_by_date: string | null
}

function normalizeAfterOpenDays(value: number | null) {
  if (value === null) return null
  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error('Termin po otwarciu musi mieć od 1 do 3650 dni.')
  }
  return value
}

async function getCurrentInventoryLot(ownerId: string, lotId: string): Promise<CurrentInventoryLot> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('inventory_items')
    .select('id, quantity, opened_at')
    .eq('id', lotId)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się odczytać zapasu: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie znaleziono zapasu.')
  }

  return result.data as CurrentInventoryLot
}

export async function createInventoryLot(input: CreateInventoryLotInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  assertValidQuantity(input.quantity)
  const afterOpenDays = normalizeAfterOpenDays(input.afterOpenDays)
  const product = await resolveOrCreateCanonicalProduct({
    ownerId: input.ownerId,
    name: input.productName,
    existingProductId: input.existingProductId,
    defaultUnitCode: input.unitCode,
  })

  try {
    const result = await supabase
      .rpc('add_inventory_lot', {
        p_owner_id: input.ownerId,
        p_product_id: product.id,
        p_storage_location_id: input.storageLocationId,
        p_quantity: input.quantity,
        p_unit_code: input.unitCode,
        p_expiry_date: input.expiryDate,
        p_after_open_days: afterOpenDays,
      })
      .maybeSingle()

    if (result.error) {
      throw new Error(`Nie udało się dodać zapasu: ${result.error.message}`)
    }

    if (!result.data) {
      throw new Error('Nie udało się potwierdzić dodania zapasu.')
    }

    return result.data.inventory_item_id as string
  } catch (error) {
    if (product.created) {
      await cleanupCreatedCanonicalProduct(input.ownerId, product.id)
    }
    throw error
  }
}

export async function updateInventoryLot(input: UpdateInventoryLotInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  assertValidQuantity(input.quantity)
  const afterOpenDays = normalizeAfterOpenDays(input.afterOpenDays)
  const currentLot = await getCurrentInventoryLot(input.ownerId, input.lotId)
  const openedUseByDate = currentLot.opened_at && afterOpenDays
    ? addDaysDateOnly(currentLot.opened_at, afterOpenDays)
    : null

  if (currentLot.opened_at && afterOpenDays && !openedUseByDate) {
    throw new Error('Nie udało się przeliczyć terminu po otwarciu.')
  }

  const result = await supabase
    .from('inventory_items')
    .update({
      storage_location_id: input.storageLocationId,
      quantity: input.quantity,
      unit_code: input.unitCode,
      expiry_date: input.expiryDate,
      after_open_days: afterOpenDays,
      opened_use_by_date: openedUseByDate,
    })
    .eq('id', input.lotId)
    .eq('owner_id', input.ownerId)
    .select('id')
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się zapisać zmian: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie znaleziono zapasu do edycji.')
  }
}

export async function consumeInventoryLot(input: ConsumeInventoryLotInput): Promise<ConsumeInventoryResult> {
  if (!supabase) throw new Error('Supabase is not configured.')

  assertValidQuantity(input.quantity)

  const result = await supabase
    .rpc('consume_inventory_item', {
      p_item_id: input.lotId,
      p_quantity: input.quantity,
    })
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się zaktualizować zapasu: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie udało się potwierdzić zmiany zapasu.')
  }

  const row = result.data as ConsumeRpcRow
  const remainingQuantity = typeof row.remaining_quantity === 'number'
    ? row.remaining_quantity
    : Number(row.remaining_quantity)

  if (!Number.isFinite(remainingQuantity) || remainingQuantity < 0) {
    throw new Error('Baza zwróciła nieprawidłową ilość po zużyciu.')
  }

  return {
    depleted: row.depleted,
    remainingQuantity,
    openedAt: row.opened_at,
    openedUseByDate: row.opened_use_by_date,
  }
}

export async function consumeAllInventoryLot(input: RemoveInventoryLotInput) {
  const currentLot = await getCurrentInventoryLot(input.ownerId, input.lotId)
  const quantity = readStoredQuantity(
    currentLot.quantity,
    'Zapisana ilość produktu jest nieprawidłowa.',
  )

  return consumeInventoryLot({
    ownerId: input.ownerId,
    lotId: input.lotId,
    quantity,
  })
}

export async function removeInventoryLot(input: RemoveInventoryLotInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', input.lotId)
    .eq('owner_id', input.ownerId)
    .select('id')
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się usunąć zapasu: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie znaleziono zapasu do usunięcia.')
  }
}
