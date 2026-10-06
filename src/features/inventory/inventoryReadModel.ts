import { supabase } from '../../lib/supabase/client'
import { loadMeasurementUnits } from '../measurements/measurementUnits'
import { loadOwnerProductCatalog } from '../products/productCatalogMutations'
import { readStoredQuantity, sumQuantities } from '../quantity/quantity'
import { compareExpiryDates, getEffectiveExpiryDate } from './expiry'
import type {
  InventoryLocation,
  InventoryLocationGroup,
  InventoryLot,
  InventoryResource,
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
  package_content_value: number | string | null
  package_content_unit: string | null
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
      .select('id, product_id, storage_location_id, quantity, unit_code, package_content_value, package_content_unit, expiry_date, after_open_days, opened_at, opened_use_by_date')
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
    const packageContentUnit = row.package_content_unit ? unitByCode.get(row.package_content_unit) : null

    if (!product || !location || !unit || (row.package_content_unit && !packageContentUnit)) {
      throw new Error('Inventory read returned a stock lot with an unresolved reference.')
    }

    const packageContentValue = row.package_content_value === null
      ? null
      : readStoredQuantity(row.package_content_value, 'Inventory read returned an invalid package-content quantity.')
    if ((packageContentValue === null) !== (row.package_content_unit === null)) {
      throw new Error('Inventory read returned incoherent package-content semantics.')
    }

    return {
      id: row.id,
      productId: product.id,
      productName: product.name,
      storageLocationId: location.id,
      quantity: readStoredQuantity(row.quantity, 'Inventory read returned an invalid stock quantity.'),
      unitCode: unit.code,
      unitSymbol: unit.symbol,
      unitFamily: unit.family,
      packageContentValue,
      packageContentUnitCode: row.package_content_unit,
      packageContentUnitSymbol: packageContentUnit?.symbol ?? null,
      recipeEligible: product.recipeEligible,
      inventoryTrackingMode: product.inventoryTrackingMode,
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

  const lotsByProduct = new Map<string, InventoryLot[]>()
  for (const lot of lots) {
    const productLots = lotsByProduct.get(lot.productId) ?? []
    productLots.push(lot)
    lotsByProduct.set(lot.productId, productLots)
  }

  function buildResource(product: (typeof products)[number]): InventoryResource {
    const productLots = lotsByProduct.get(product.id) ?? []
    const roleIsSpice = product.inventoryTrackingMode === 'presence'
    const roleIsHousehold = product.recipeEligible === false && product.inventoryTrackingMode === 'quantity'
    if (!roleIsSpice && !roleIsHousehold) {
      throw new Error('Inventory resource projection received a standard-food Product.')
    }

    const unit = unitByCode.get(product.defaultUnitCode)
    if (!unit) throw new Error('Inventory resource Product has an unresolved default unit.')

    if (roleIsSpice) {
      return {
        product,
        quantity: productLots.length > 0 ? 1 : 0,
        unitCode: product.defaultUnitCode,
        unitSymbol: unit.symbol,
        present: productLots.length > 0,
      }
    }

    const quantity = sumQuantities(
      productLots.map((lot) => {
        if (lot.unitCode !== product.defaultUnitCode) {
          throw new Error('Household Inventory must use the Product default tracking unit.')
        }
        return lot.quantity
      }),
      'Łączny stan Domowe przekracza dozwolony zakres.',
    )

    return {
      product,
      quantity,
      unitCode: product.defaultUnitCode,
      unitSymbol: unit.symbol,
      present: quantity > 0,
    }
  }

  const spiceResources = products
    .filter((product) => product.recipeEligible && product.inventoryTrackingMode === 'presence')
    .map(buildResource)
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'pl', { sensitivity: 'base' }))
  const householdResources = products
    .filter((product) => !product.recipeEligible && product.inventoryTrackingMode === 'quantity')
    .map(buildResource)
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'pl', { sensitivity: 'base' }))

  const groups: InventoryLocationGroup[] = locations.map((location) => ({
    location,
    lots: lots.filter((lot) => lot.storageLocationId === location.id),
    resources: location.kind === 'spices'
      ? spiceResources
      : location.kind === 'household'
        ? householdResources
        : [],
  }))

  const totalDisplayItems = groups.reduce((total, group) => (
    total + (group.resources.length > 0 ? group.resources.length : group.lots.length)
  ), 0)

  const resourceProductIds = new Set(lots.map((lot) => lot.productId))
  for (const resource of spiceResources) resourceProductIds.add(resource.product.id)
  for (const resource of householdResources) resourceProductIds.add(resource.product.id)

  return {
    locations,
    products,
    units,
    groups,
    totalLots: lots.length,
    totalDisplayItems,
    stockedProducts: new Set(lots.map((lot) => lot.productId)).size,
    resourceProducts: resourceProductIds.size,
    occupiedLocations: groups.filter((group) => group.lots.length > 0 || group.resources.length > 0).length,
  }
}
