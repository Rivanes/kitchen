import type { MeasurementUnit } from '../measurements/measurementUnits'
import type { ProductIdentityOption } from '../products/productIdentity'

export type ShoppingUnit = MeasurementUnit
export type ShoppingProduct = ProductIdentityOption

export type ShoppingItem = {
  id: string
  productId: string | null
  name: string
  quantity: number
  unitCode: string
  unitSymbol: string
  isPurchased: boolean
  purchasedAt: string | null
  createdAt: string
}

export type ShoppingCatalogModel = {
  products: ShoppingProduct[]
  units: ShoppingUnit[]
}

export type ShoppingCreateSeed = {
  productId: string
  productName: string
  unitCode: string
  quantity?: number
}

export type ShoppingReadModel = ShoppingCatalogModel & {
  activeItems: ShoppingItem[]
  purchasedItems: ShoppingItem[]
}
