export type ShoppingUnit = {
  code: string
  labelPl: string
  symbol: string
  family: string
  sortOrder: number
}

export type ShoppingProduct = {
  id: string
  name: string
  defaultUnitCode: string
}

export type ShoppingItem = {
  id: string
  productId: string | null
  name: string
  quantity: number
  unitCode: string
  unitSymbol: string
  createdAt: string
}

export type ShoppingReadModel = {
  items: ShoppingItem[]
  products: ShoppingProduct[]
  units: ShoppingUnit[]
}
