import { supabase } from '../../lib/supabase/client'
import {
  cleanCanonicalProductName,
  cleanupCreatedCanonicalProduct,
  findOwnerProductByName,
  loadOwnerProductCatalog,
  resolveCanonicalProductForEdit,
  resolveOrCreateCanonicalProduct,
} from '../products/productCatalogMutations'
import { normalizeProductName } from '../products/productIdentity'
import {
  addQuantities,
  assertValidQuantity,
  readStoredQuantity,
} from '../quantity/quantity'

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
  currentProductId: string | null
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

async function loadActiveShoppingItems(ownerId: string): Promise<ActiveShoppingItem[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

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

export async function createShoppingItem(input: CreateShoppingItemInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  assertValidQuantity(input.quantity)
  const product = await resolveOrCreateCanonicalProduct({
    ownerId: input.ownerId,
    name: input.name,
    existingProductId: input.existingProductId,
    defaultUnitCode: input.unitCode,
  })

  try {
    const activeItems = await loadActiveShoppingItems(input.ownerId)
    const mergeTarget = activeItems.find((item) =>
      item.unit_code === input.unitCode
      && isSameIdentity(item, product.id, product.name),
    )

    if (mergeTarget) {
      const currentQuantity = readStoredQuantity(
        mergeTarget.quantity,
        'Zapisana ilość na liście jest nieprawidłowa.',
      )
      const nextQuantity = addQuantities(
        currentQuantity,
        input.quantity,
        'Łączna ilość na liście przekracza dozwolony zakres.',
      )

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
      throw new Error(`Nie udało się dodać do listy: ${insertResult.error.message}`)
    }

    return insertResult.data.id as string
  } catch (error) {
    if (product.created) {
      await cleanupCreatedCanonicalProduct(input.ownerId, product.id)
    }
    throw error
  }
}

export async function updateShoppingItem(input: UpdateShoppingItemInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  assertValidQuantity(input.quantity)
  const cleanName = cleanCanonicalProductName(input.name)
  const existingByName = await findOwnerProductByName(input.ownerId, cleanName)
  const activeItems = await loadActiveShoppingItems(input.ownerId)
  const preflightProductId = existingByName?.id ?? input.currentProductId

  const conflict = activeItems.find((item) => {
    if (item.id === input.itemId || item.unit_code !== input.unitCode) return false
    if (preflightProductId && item.product_id === preflightProductId) return true
    return item.product_id === null
      && item.custom_name !== null
      && normalizeProductName(item.custom_name) === normalizeProductName(cleanName)
  })

  if (conflict) {
    throw new Error('Taka rzecz jest już na liście w tej samej jednostce.')
  }

  const product = await resolveCanonicalProductForEdit({
    ownerId: input.ownerId,
    name: cleanName,
    currentProductId: input.currentProductId,
    selectedProductId: input.existingProductId,
    defaultUnitCode: input.unitCode,
  })

  try {
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
      throw new Error(`Nie udało się zapisać zmian: ${result.error.message}`)
    }

    if (!result.data) {
      throw new Error('Nie znaleziono rzeczy do edycji.')
    }
  } catch (error) {
    if (product.created) {
      await cleanupCreatedCanonicalProduct(input.ownerId, product.id)
    }
    throw error
  }
}

export async function removeShoppingItem(input: RemoveShoppingItemInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

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




export type PurchaseShoppingQuantityInput = {
  ownerId: string
  itemId: string
  quantity: number
}

export type RestoreShoppingPurchaseInput = {
  ownerId: string
  itemId: string
}

export async function purchaseShoppingQuantity(input: PurchaseShoppingQuantityInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  assertValidQuantity(input.quantity)

  const result = await supabase.rpc('purchase_shopping_item', {
    p_owner_id: input.ownerId,
    p_item_id: input.itemId,
    p_quantity: input.quantity,
  })

  if (result.error) {
    throw new Error(`Nie udało się zapisać kupionej ilości: ${result.error.message}`)
  }
}

export async function restoreShoppingPurchase(input: RestoreShoppingPurchaseInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase.rpc('restore_shopping_purchase', {
    p_owner_id: input.ownerId,
    p_item_id: input.itemId,
  })

  if (result.error) {
    throw new Error(`Nie udało się przywrócić rzeczy do listy: ${result.error.message}`)
  }
}


export type TransferPurchasedShoppingItemInput = {
  ownerId: string
  itemId: string
  storageLocationId: string
  expiryDate: string | null
  afterOpenDays: number | null
}

export async function transferPurchasedShoppingItemToInventory(input: TransferPurchasedShoppingItemInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .rpc('transfer_purchased_shopping_item_to_inventory', {
      p_owner_id: input.ownerId,
      p_shopping_item_id: input.itemId,
      p_storage_location_id: input.storageLocationId,
      p_expiry_date: input.expiryDate,
      p_after_open_days: input.afterOpenDays,
    })
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się przenieść zakupu do zapasów: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie udało się potwierdzić przeniesienia zakupu do zapasów.')
  }

  return result.data.inventory_item_id as string
}
