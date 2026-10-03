import { supabase } from '../../lib/supabase/client'
import { loadMeasurementUnits } from '../measurements/measurementUnits'
import { loadOwnerProductCatalog } from '../products/productCatalogMutations'
import { readStoredQuantity } from '../quantity/quantity'
import type { ShoppingItem, ShoppingReadModel } from './types'

type RawShoppingItem = {
  id: string
  product_id: string | null
  custom_name: string | null
  quantity: number | string
  unit_code: string
  created_at: string
}

function assertNoQueryError(error: { message: string } | null, resource: string) {
  if (error) {
    throw new Error(`Shopping read failed for ${resource}: ${error.message}`)
  }
}

export async function loadShoppingReadModel(ownerId: string): Promise<ShoppingReadModel> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const [itemsResult, products, units] = await Promise.all([
    supabase
      .from('shopping_items')
      .select('id, product_id, custom_name, quantity, unit_code, created_at')
      .eq('owner_id', ownerId)
      .eq('is_purchased', false)
      .order('created_at', { ascending: true }),
    loadOwnerProductCatalog(ownerId),
    loadMeasurementUnits(),
  ])

  assertNoQueryError(itemsResult.error, 'shopping_items')

  const productById = new Map(products.map((product) => [product.id, product]))
  const unitByCode = new Map(units.map((unit) => [unit.code, unit]))

  const items: ShoppingItem[] = ((itemsResult.data ?? []) as RawShoppingItem[]).map((row) => {
    const unit = unitByCode.get(row.unit_code)
    if (!unit) {
      throw new Error('Shopping read returned an item with an unresolved unit.')
    }

    const product = row.product_id ? productById.get(row.product_id) : null
    const customName = row.custom_name?.trim() ?? ''

    if ((row.product_id && !product) || (!row.product_id && !customName)) {
      throw new Error('Shopping read returned an item with an unresolved identity.')
    }

    return {
      id: row.id,
      productId: row.product_id,
      name: product?.name ?? customName,
      quantity: readStoredQuantity(row.quantity, 'Shopping read returned an invalid quantity.'),
      unitCode: unit.code,
      unitSymbol: unit.symbol,
      createdAt: row.created_at,
    }
  })

  return { items, products, units }
}

export async function loadActiveShoppingCount(ownerId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('shopping_items')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_purchased', false)

  if (result.error) {
    throw new Error(`Shopping count failed: ${result.error.message}`)
  }

  return result.count ?? 0
}
