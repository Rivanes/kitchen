import { supabase } from '../../lib/supabase/client'
import { normalizeProductName } from '../products/productIdentity'
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

export type RenameProductInput = {
  ownerId: string
  productId: string
  nextName: string
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
  opened_at: string | null
}

type ConsumeRpcRow = {
  depleted: boolean
  remaining_quantity: number | string
  opened_at: string | null
  opened_use_by_date: string | null
}

function normalizeStoredQuantity(value: number | string) {
  const quantity = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Zapisana ilość produktu jest nieprawidłowa.')
  }
  return quantity
}

function normalizeAfterOpenDays(value: number | null) {
  if (value === null) return null
  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error('Termin po otwarciu musi mieć od 1 do 3650 dni.')
  }
  return value
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

export async function renameProduct(input: RenameProductInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const cleanName = input.nextName.trim().replace(/\s+/g, ' ')
  if (!cleanName || cleanName.length > 120) {
    throw new Error('Podaj nazwę produktu do 120 znaków.')
  }

  const existing = await findProductByName(input.ownerId, cleanName)
  if (existing && existing.id !== input.productId) {
    throw new Error('Taki produkt już istnieje. Wybierz inną nazwę.')
  }

  if (existing && existing.id === input.productId && existing.name === cleanName) {
    return existing.name
  }

  const result = await supabase
    .from('products')
    .update({ name: cleanName })
    .eq('id', input.productId)
    .eq('owner_id', input.ownerId)
    .select('id, name')
    .maybeSingle()

  if (result.error) {
    if (result.error.code === '23505') {
      throw new Error('Taki produkt już istnieje. Wybierz inną nazwę.')
    }
    throw new Error(`Nie udało się zmienić nazwy produktu: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie znaleziono produktu do zmiany nazwy.')
  }

  return result.data.name as string
}

async function findMergeableInventoryLot(
  ownerId: string,
  productId: string,
  storageLocationId: string,
  unitCode: string,
  expiryDate: string | null,
  afterOpenDays: number | null,
): Promise<MergeableInventoryLot | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  let query = supabase
    .from('inventory_items')
    .select('id, quantity')
    .eq('owner_id', ownerId)
    .eq('product_id', productId)
    .eq('storage_location_id', storageLocationId)
    .eq('unit_code', unitCode)
    .is('opened_at', null)

  query = expiryDate ? query.eq('expiry_date', expiryDate) : query.is('expiry_date', null)
  query = afterOpenDays === null
    ? query.is('after_open_days', null)
    : query.eq('after_open_days', afterOpenDays)

  const result = await query
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
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const productName = input.productName.trim().replace(/\s+/g, ' ')
  if (!productName) {
    throw new Error('Podaj nazwę produktu.')
  }

  const afterOpenDays = normalizeAfterOpenDays(input.afterOpenDays)
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
    input.expiryDate,
    afterOpenDays,
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
      expiry_date: input.expiryDate,
      after_open_days: afterOpenDays,
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

export async function consumeInventoryLot(input: ConsumeInventoryLotInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Podaj ilość większą od 0.')
  }

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
