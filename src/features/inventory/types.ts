export type MeasurementUnit = {
  code: string
  labelPl: string
  symbol: string
  family: string
  sortOrder: number
}

export type InventoryProduct = {
  id: string
  name: string
  defaultUnitCode: string
}

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
