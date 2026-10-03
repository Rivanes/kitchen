import { supabase } from '../../lib/supabase/client'
import type { ShoppingItem, ShoppingProduct, ShoppingReadModel, ShoppingUnit } from './types'

type RawShoppingItem = {
  id: string
  product_id: string | null
  custom_name: string | null
  quantity: number | string
  unit_code: string
  created_at: string
}

type RawProduct = {
  id: string
  name: string
  default_unit_code: string
}

type RawUnit = {
  code: string
  label_pl: string
  symbol: string
  family: string
  sort_order: number
}

function assertNoQueryError(error: { message: string } | null, resource: string) {
  if (error) {
    throw new Error(`Shopping read failed for ${resource}: ${error.message}`)
  }
}

function toFiniteQuantity(value: number | string) {
  const quantity = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Shopping read returned an invalid quantity.')
  }
  return quantity
}

export async function loadShoppingReadModel(ownerId: string): Promise<ShoppingReadModel> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const [itemsResult, productsResult, unitsResult] = await Promise.all([
    supabase
      .from('shopping_items')
      .select('id, product_id, custom_name, quantity, unit_code, created_at')
      .eq('owner_id', ownerId)
      .eq('is_purchased', false)
      .order('created_at', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, default_unit_code')
      .eq('owner_id', ownerId)
      .order('name', { ascending: true }),
    supabase
      .from('measurement_units')
      .select('code, label_pl, symbol, family, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  assertNoQueryError(itemsResult.error, 'shopping_items')
  assertNoQueryError(productsResult.error, 'products')
  assertNoQueryError(unitsResult.error, 'measurement_units')

  const products: ShoppingProduct[] = ((productsResult.data ?? []) as RawProduct[]).map((row) => ({
    id: row.id,
    name: row.name,
    defaultUnitCode: row.default_unit_code,
  }))

  const units: ShoppingUnit[] = ((unitsResult.data ?? []) as RawUnit[]).map((row) => ({
    code: row.code,
    labelPl: row.label_pl,
    symbol: row.symbol,
    family: row.family,
    sortOrder: row.sort_order,
  }))

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
      quantity: toFiniteQuantity(row.quantity),
      unitCode: unit.code,
      unitSymbol: unit.symbol,
      createdAt: row.created_at,
    }
  })

  return { items, products, units }
}

export async function loadActiveShoppingCount(ownerId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

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
