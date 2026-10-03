import { supabase } from '../../lib/supabase/client'
import { resolveOrCreateCanonicalProduct } from '../products/productCatalogMutations'
import { normalizeProductName } from '../products/productIdentity'

export type CreateShoppingItemInput = {
  ownerId: string
  name: string
  existingProductId: string | null
  quantity: number
  unitCode: string
}

export type UpdateShoppingItemInput = {
  ownerId: string
  itemId: string
  name: string
  existingProductId: string | null
  quantity: number
  unitCode: string
}

export type RemoveShoppingItemInput = {
  ownerId: string
  itemId: string
}


type ActiveShoppingItem = {
  id: string
  product_id: string | null
  custom_name: string | null
  quantity: number | string
  unit_code: string
}


function validateQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999999999.999) {
    throw new Error('Podaj prawidłową ilość większą od 0.')
  }
}

function normalizeStoredQuantity(value: number | string) {
  const quantity = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Zapisana ilość na liście jest nieprawidłowa.')
  }
  return quantity
}


async function loadActiveShoppingItems(ownerId: string): Promise<ActiveShoppingItem[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase
    .from('shopping_items')
    .select('id, product_id, custom_name, quantity, unit_code')
    .eq('owner_id', ownerId)
    .eq('is_purchased', false)

  if (result.error) {
    throw new Error(`Nie udało się sprawdzić listy zakupów: ${result.error.message}`)
  }

  return (result.data ?? []) as ActiveShoppingItem[]
}

function isSameIdentity(
  item: ActiveShoppingItem,
  productId: string,
  canonicalName: string,
) {
  if (item.product_id === productId) return true

  return item.product_id === null
    && item.custom_name !== null
    && normalizeProductName(item.custom_name) === normalizeProductName(canonicalName)
}

async function removeNewCanonicalProduct(ownerId: string, productId: string) {
  if (!supabase) return
  await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('owner_id', ownerId)
}

export async function createShoppingItem(input: CreateShoppingItemInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  validateQuantity(input.quantity)
  const product = await resolveOrCreateCanonicalProduct({
    ownerId: input.ownerId,
    name: input.name,
    existingProductId: input.existingProductId,
    defaultUnitCode: input.unitCode,
  })
  const activeItems = await loadActiveShoppingItems(input.ownerId)

  const mergeTarget = activeItems.find((item) =>
    item.unit_code === input.unitCode
    && isSameIdentity(item, product.id, product.name),
  )

  if (mergeTarget) {
    const nextQuantity = normalizeStoredQuantity(mergeTarget.quantity) + input.quantity
    if (!Number.isFinite(nextQuantity) || nextQuantity > 999999999.999) {
      if (product.created) await removeNewCanonicalProduct(input.ownerId, product.id)
      throw new Error('Łączna ilość na liście przekracza dozwolony zakres.')
    }

    const mergeResult = await supabase
      .from('shopping_items')
      .update({
        product_id: product.id,
        custom_name: null,
        quantity: nextQuantity,
      })
      .eq('id', mergeTarget.id)
      .eq('owner_id', input.ownerId)
      .eq('is_purchased', false)
      .select('id')
      .maybeSingle()

    if (mergeResult.error || !mergeResult.data) {
      if (product.created) await removeNewCanonicalProduct(input.ownerId, product.id)
      throw new Error(`Nie udało się połączyć wpisu na liście: ${mergeResult.error?.message ?? 'brak zapisu'}`)
    }

    return mergeResult.data.id as string
  }

  const insertResult = await supabase
    .from('shopping_items')
    .insert({
      owner_id: input.ownerId,
      product_id: product.id,
      custom_name: null,
      quantity: input.quantity,
      unit_code: input.unitCode,
      is_purchased: false,
      purchased_at: null,
    })
    .select('id')
    .single()

  if (insertResult.error) {
    if (product.created) await removeNewCanonicalProduct(input.ownerId, product.id)
    throw new Error(`Nie udało się dodać do listy: ${insertResult.error.message}`)
  }

  return insertResult.data.id as string
}

export async function updateShoppingItem(input: UpdateShoppingItemInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  validateQuantity(input.quantity)
  const product = await resolveOrCreateCanonicalProduct({
    ownerId: input.ownerId,
    name: input.name,
    existingProductId: input.existingProductId,
    defaultUnitCode: input.unitCode,
  })
  const activeItems = await loadActiveShoppingItems(input.ownerId)

  const conflict = activeItems.find((item) =>
    item.id !== input.itemId
    && item.unit_code === input.unitCode
    && isSameIdentity(item, product.id, product.name),
  )

  if (conflict) {
    if (product.created) await removeNewCanonicalProduct(input.ownerId, product.id)
    throw new Error('Taka rzecz jest już na liście w tej samej jednostce.')
  }

  const result = await supabase
    .from('shopping_items')
    .update({
      product_id: product.id,
      custom_name: null,
      quantity: input.quantity,
      unit_code: input.unitCode,
    })
    .eq('id', input.itemId)
    .eq('owner_id', input.ownerId)
    .eq('is_purchased', false)
    .select('id')
    .maybeSingle()

  if (result.error) {
    if (product.created) await removeNewCanonicalProduct(input.ownerId, product.id)
    throw new Error(`Nie udało się zapisać zmian: ${result.error.message}`)
  }

  if (!result.data) {
    if (product.created) await removeNewCanonicalProduct(input.ownerId, product.id)
    throw new Error('Nie znaleziono rzeczy do edycji.')
  }
}

export async function removeShoppingItem(input: RemoveShoppingItemInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', input.itemId)
    .eq('owner_id', input.ownerId)
    .eq('is_purchased', false)
    .select('id')
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się usunąć z listy: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie znaleziono rzeczy do usunięcia.')
  }
}
