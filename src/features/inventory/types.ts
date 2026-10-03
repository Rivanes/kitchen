import type { MeasurementUnit as SharedMeasurementUnit } from '../measurements/measurementUnits'
import type { ProductIdentityOption } from '../products/productIdentity'

export type MeasurementUnit = SharedMeasurementUnit
export type InventoryProduct = ProductIdentityOption

export type StorageLocationKind = 'fridge' | 'freezer' | 'pantry' | 'custom'

export type InventoryLocation = {
  id: string
  slug: string
  name: string
  kind: StorageLocationKind
  sortOrder: number
}

export type InventoryLot = {
  id: string
  productId: string
  productName: string
  storageLocationId: string
  quantity: number
  unitCode: string
  unitSymbol: string
  expiryDate: string | null
  afterOpenDays: number | null
  openedAt: string | null
  openedUseByDate: string | null
}

export type InventoryLocationGroup = {
  location: InventoryLocation
  lots: InventoryLot[]
}

export type InventoryReadModel = {
  locations: InventoryLocation[]
  products: InventoryProduct[]
  units: MeasurementUnit[]
  groups: InventoryLocationGroup[]
  totalLots: number
  stockedProducts: number
  occupiedLocations: number
}
