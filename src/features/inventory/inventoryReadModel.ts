import { supabase } from '../../lib/supabase/client'
import { loadMeasurementUnits } from '../measurements/measurementUnits'
import { loadOwnerProductCatalog } from '../products/productCatalogMutations'
import { readStoredQuantity } from '../quantity/quantity'
import { compareExpiryDates, getEffectiveExpiryDate } from './expiry'
import type {
  InventoryLocation,
  InventoryLocationGroup,
  InventoryLot,
  InventoryReadModel,
  StorageLocationKind,
} from './types'

type RawLocation = {
  id: string
  slug: string
  name: string
  kind: StorageLocationKind
  sort_order: number
}

type RawInventoryItem = {
  id: string
  product_id: string
  storage_location_id: string
  quantity: number | string
  unit_code: string
  expiry_date: string | null
  after_open_days: number | null
  opened_at: string | null
  opened_use_by_date: string | null
}

function assertNoQueryError(error: { message: string } | null, resource: string) {
  if (error) {
    throw new Error(`Inventory read failed for ${resource}: ${error.message}`)
  }
}

function toAfterOpenDays(value: number | null) {
  if (value === null) return null
  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error('Inventory read returned an invalid after-open shelf-life value.')
  }
  return value
}

export async function loadInventoryReadModel(ownerId: string): Promise<InventoryReadModel> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const [locationsResult, products, units, itemsResult] = await Promise.all([
    supabase
      .from('storage_locations')
      .select('id, slug, name, kind, sort_order')
      .eq('owner_id', ownerId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    loadOwnerProductCatalog(ownerId),
    loadMeasurementUnits(),
    supabase
      .from('inventory_items')
      .select('id, product_id, storage_location_id, quantity, unit_code, expiry_date, after_open_days, opened_at, opened_use_by_date')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true }),
  ])

  assertNoQueryError(locationsResult.error, 'storage_locations')
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
      quantity: readStoredQuantity(row.quantity, 'Inventory read returned an invalid stock quantity.'),
      unitCode: unit.code,
      unitSymbol: unit.symbol,
      expiryDate: row.expiry_date,
      afterOpenDays: toAfterOpenDays(row.after_open_days),
      openedAt: row.opened_at,
      openedUseByDate: row.opened_use_by_date,
    }
  })

  lots.sort((a, b) => {
    const byExpiry = compareExpiryDates(
      getEffectiveExpiryDate(a.expiryDate, a.openedUseByDate),
      getEffectiveExpiryDate(b.expiryDate, b.openedUseByDate),
    )
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
