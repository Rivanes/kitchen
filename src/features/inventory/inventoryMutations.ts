import { supabase } from '../../lib/supabase/client'

export type CreateInventoryLotInput = {
  ownerId: string
  productName: string
  existingProductId: string | null
  storageLocationId: string
  quantity: number
  unitCode: string
}

export type UpdateInventoryLotInput = {
  ownerId: string
  lotId: string
  storageLocationId: string
  quantity: number
  unitCode: string
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

type ProductIdentity = {
  id: string
  name: string
  default_unit_code: string
}

type MergeableInventoryLot = {
  id: string
  quantity: number | string
}

type CurrentInventoryLot = {
  id: string
  quantity: number | string
}

function normalizeStoredQuantity(value: number | string) {
  const quantity = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Zapisana ilość produktu jest nieprawidłowa.')
  }
  return quantity
}

function toMilliUnits(value: number) {
  return Math.round(value * 1000)
}

export function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')
}

async function findProductByName(ownerId: string, productName: string): Promise<ProductIdentity | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase
    .from('products')
    .select('id, name, default_unit_code')
    .eq('owner_id', ownerId)

  if (result.error) {
    throw new Error(`Nie udało się sprawdzić produktu: ${result.error.message}`)
  }

  const normalized = normalizeProductName(productName)
  return ((result.data ?? []) as ProductIdentity[]).find((product) => normalizeProductName(product.name) === normalized) ?? null
}

async function findMergeableInventoryLot(
  ownerId: string,
  productId: string,
  storageLocationId: string,
  unitCode: string,
): Promise<MergeableInventoryLot | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase
    .from('inventory_items')
    .select('id, quantity')
    .eq('owner_id', ownerId)
    .eq('product_id', productId)
    .eq('storage_location_id', storageLocationId)
    .eq('unit_code', unitCode)
    .is('expiry_date', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się sprawdzić istniejącego zapasu: ${result.error.message}`)
  }

  return (result.data as MergeableInventoryLot | null) ?? null
}

async function getCurrentInventoryLot(ownerId: string, lotId: string): Promise<CurrentInventoryLot> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase
    .from('inventory_items')
    .select('id, quantity')
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
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const productName = input.productName.trim().replace(/\s+/g, ' ')
  if (!productName) {
    throw new Error('Podaj nazwę produktu.')
  }

  let productId = input.existingProductId
  let createdProductId: string | null = null

  if (!productId) {
    const existing = await findProductByName(input.ownerId, productName)
    productId = existing?.id ?? null
  }

  if (!productId) {
    const productResult = await supabase
      .from('products')
      .insert({
        owner_id: input.ownerId,
        name: productName,
        default_unit_code: input.unitCode,
      })
      .select('id')
      .single()

    if (productResult.error) {
      if (productResult.error.code === '23505') {
        const existing = await findProductByName(input.ownerId, productName)
        if (!existing) {
          throw new Error('Produkt już istnieje, ale nie udało się go odczytać.')
        }
        productId = existing.id
      } else {
        throw new Error(`Nie udało się utworzyć produktu: ${productResult.error.message}`)
      }
    } else {
      productId = productResult.data.id
      createdProductId = productResult.data.id
    }
  }

  if (!productId) {
    throw new Error('Nie udało się ustalić produktu dla dodawanego zapasu.')
  }

  const mergeableLot = await findMergeableInventoryLot(
    input.ownerId,
    productId,
    input.storageLocationId,
    input.unitCode,
  )

  if (mergeableLot) {
    const currentQuantity = normalizeStoredQuantity(mergeableLot.quantity)
    const nextQuantity = currentQuantity + input.quantity

    if (!Number.isFinite(nextQuantity) || nextQuantity > 999999999.999) {
      throw new Error('Łączna ilość produktu przekracza dozwolony zakres.')
    }

    const mergeResult = await supabase
      .from('inventory_items')
      .update({ quantity: nextQuantity })
      .eq('id', mergeableLot.id)
      .eq('owner_id', input.ownerId)
      .select('id')
      .maybeSingle()

    if (mergeResult.error || !mergeResult.data) {
      throw new Error(`Nie udało się połączyć zapasu: ${mergeResult.error?.message ?? 'brak zapisu'}`)
    }

    return mergeResult.data.id
  }

  const itemResult = await supabase
    .from('inventory_items')
    .insert({
      owner_id: input.ownerId,
      product_id: productId,
      storage_location_id: input.storageLocationId,
      quantity: input.quantity,
      unit_code: input.unitCode,
      expiry_date: null,
    })
    .select('id')
    .single()

  if (itemResult.error) {
    if (createdProductId) {
      await supabase
        .from('products')
        .delete()
        .eq('id', createdProductId)
        .eq('owner_id', input.ownerId)
    }
    throw new Error(`Nie udało się dodać zapasu: ${itemResult.error.message}`)
  }

  return itemResult.data.id
}

export async function updateInventoryLot(input: UpdateInventoryLotInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase
    .from('inventory_items')
    .update({
      storage_location_id: input.storageLocationId,
      quantity: input.quantity,
      unit_code: input.unitCode,
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

export async function consumeInventoryLot(input: ConsumeInventoryLotInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Podaj ilość większą od 0.')
  }

  const currentLot = await getCurrentInventoryLot(input.ownerId, input.lotId)
  const currentQuantity = normalizeStoredQuantity(currentLot.quantity)
  const currentMilli = toMilliUnits(currentQuantity)
  const consumeMilli = toMilliUnits(input.quantity)

  if (consumeMilli <= 0) {
    throw new Error('Podaj ilość większą od 0.')
  }

  if (consumeMilli > currentMilli) {
    throw new Error('Nie możesz zużyć więcej niż masz w zapasach.')
  }

  if (consumeMilli === currentMilli) {
    const deleteResult = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', input.lotId)
      .eq('owner_id', input.ownerId)
      .select('id')
      .maybeSingle()

    if (deleteResult.error || !deleteResult.data) {
      throw new Error(`Nie udało się zużyć całego zapasu: ${deleteResult.error?.message ?? 'brak zapisu'}`)
    }

    return { depleted: true, remainingQuantity: 0 }
  }

  const remainingQuantity = (currentMilli - consumeMilli) / 1000
  const updateResult = await supabase
    .from('inventory_items')
    .update({ quantity: remainingQuantity })
    .eq('id', input.lotId)
    .eq('owner_id', input.ownerId)
    .select('id')
    .maybeSingle()

  if (updateResult.error || !updateResult.data) {
    throw new Error(`Nie udało się zaktualizować zapasu: ${updateResult.error?.message ?? 'brak zapisu'}`)
  }

  return { depleted: false, remainingQuantity }
}

export async function removeInventoryLot(input: RemoveInventoryLotInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

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

export async function consumeAllInventoryLot(input: RemoveInventoryLotInput) {
  await removeInventoryLot(input)
}
