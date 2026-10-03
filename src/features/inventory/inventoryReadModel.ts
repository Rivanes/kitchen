import { supabase } from '../../lib/supabase/client'
import { compareExpiryDates } from './expiry'
import type {
  InventoryLocation,
  InventoryLocationGroup,
  InventoryLot,
  InventoryProduct,
  InventoryReadModel,
  MeasurementUnit,
  StorageLocationKind,
} from './types'

type RawLocation = {
  id: string
  slug: string
  name: string
  kind: StorageLocationKind
  sort_order: number
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

type RawInventoryItem = {
  id: string
  product_id: string
  storage_location_id: string
  quantity: number | string
  unit_code: string
  expiry_date: string | null
}

function assertNoQueryError(error: { message: string } | null, resource: string) {
  if (error) {
    throw new Error(`Inventory read failed for ${resource}: ${error.message}`)
  }
}

function toFiniteQuantity(value: number | string) {
  const quantity = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Inventory read returned an invalid stock quantity.')
  }
  return quantity
}

export async function loadInventoryReadModel(ownerId: string): Promise<InventoryReadModel> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const [locationsResult, productsResult, unitsResult, itemsResult] = await Promise.all([
    supabase
      .from('storage_locations')
      .select('id, slug, name, kind, sort_order')
      .eq('owner_id', ownerId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, default_unit_code')
      .eq('owner_id', ownerId)
      .order('name', { ascending: true }),
    supabase
      .from('measurement_units')
      .select('code, label_pl, symbol, family, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('inventory_items')
      .select('id, product_id, storage_location_id, quantity, unit_code, expiry_date')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true }),
  ])

  assertNoQueryError(locationsResult.error, 'storage_locations')
  assertNoQueryError(productsResult.error, 'products')
  assertNoQueryError(unitsResult.error, 'measurement_units')
  assertNoQueryError(itemsResult.error, 'inventory_items')

  const locations: InventoryLocation[] = ((locationsResult.data ?? []) as RawLocation[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    sortOrder: row.sort_order,
  }))

  if (locations.length === 0) {
    throw new Error('Inventory read returned no owner storage locations.')
  }

  const products: InventoryProduct[] = ((productsResult.data ?? []) as RawProduct[]).map((row) => ({
    id: row.id,
    name: row.name,
    defaultUnitCode: row.default_unit_code,
  }))

  const units: MeasurementUnit[] = ((unitsResult.data ?? []) as RawUnit[]).map((row) => ({
    code: row.code,
    labelPl: row.label_pl,
    symbol: row.symbol,
    family: row.family,
    sortOrder: row.sort_order,
  }))

  const productById = new Map(products.map((product) => [product.id, product]))
  const locationById = new Map(locations.map((location) => [location.id, location]))
  const unitByCode = new Map(units.map((unit) => [unit.code, unit]))

  const lots: InventoryLot[] = ((itemsResult.data ?? []) as RawInventoryItem[]).map((row) => {
    const product = productById.get(row.product_id)
    const location = locationById.get(row.storage_location_id)
    const unit = unitByCode.get(row.unit_code)

    if (!product || !location || !unit) {
      throw new Error('Inventory read returned a stock lot with an unresolved reference.')
    }

    return {
      id: row.id,
      productId: product.id,
      productName: product.name,
      storageLocationId: location.id,
      quantity: toFiniteQuantity(row.quantity),
      unitCode: unit.code,
      unitSymbol: unit.symbol,
      expiryDate: row.expiry_date,
    }
  })

  lots.sort((a, b) => {
    const byExpiry = compareExpiryDates(a.expiryDate, b.expiryDate)
    if (byExpiry !== 0) return byExpiry
    return a.productName.localeCompare(b.productName, 'pl', { sensitivity: 'base' })
  })

  const groups: InventoryLocationGroup[] = locations.map((location) => ({
    location,
    lots: lots.filter((lot) => lot.storageLocationId === location.id),
  }))

  return {
    locations,
    products,
    units,
    groups,
    totalLots: lots.length,
    stockedProducts: new Set(lots.map((lot) => lot.productId)).size,
    occupiedLocations: groups.filter((group) => group.lots.length > 0).length,
  }
}
