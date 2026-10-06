import type { MeasurementUnit as SharedMeasurementUnit } from '../measurements/measurementUnits'
import type { ProductIdentityOption } from '../products/productIdentity'

export type MeasurementUnit = SharedMeasurementUnit
export type InventoryProduct = ProductIdentityOption

export type StorageLocationKind = 'fridge' | 'freezer' | 'pantry' | 'spices' | 'household' | 'custom'

export type InventoryLocation = {
  id: string
  slug: string
  name: string
  kind: StorageLocationKind
  sortOrder: number
}


export type InventoryCreateSeed = {
  productId: string
  productName: string
  quantity: number
  unitCode: string
}

export type InventoryLot = {
  id: string
  productId: string
  productName: string
  storageLocationId: string
  quantity: number
  unitCode: string
  unitSymbol: string
  unitFamily: string
  packageContentValue: number | null
  packageContentUnitCode: string | null
  packageContentUnitSymbol: string | null
  recipeEligible: boolean
  inventoryTrackingMode: 'quantity' | 'presence'
  expiryDate: string | null
  afterOpenDays: number | null
  openedAt: string | null
  openedUseByDate: string | null
}

export type InventoryResource = {
  product: InventoryProduct
  quantity: number
  unitCode: string
  unitSymbol: string
  present: boolean
}

export type InventoryLocationGroup = {
  location: InventoryLocation
  lots: InventoryLot[]
  resources: InventoryResource[]
}

export type InventoryReadModel = {
  locations: InventoryLocation[]
  products: InventoryProduct[]
  units: MeasurementUnit[]
  groups: InventoryLocationGroup[]
  totalLots: number
  totalDisplayItems: number
  stockedProducts: number
  resourceProducts: number
  occupiedLocations: number
}
