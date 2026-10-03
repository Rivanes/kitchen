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

type ProductIdentity = {
  id: string
  name: string
  default_unit_code: string
}

type MergeableInventoryLot = {
  id: string
  quantity: number | string
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

  const mergeableLot = await findMergeableInventoryLot(
    input.ownerId,
    productId,
    input.storageLocationId,
    input.unitCode,
  )

  if (mergeableLot) {
    const currentQuantity = typeof mergeableLot.quantity === 'number'
      ? mergeableLot.quantity
      : Number(mergeableLot.quantity)
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
