import {
  productResourceRoleFromSemantics,
  type ProductResourceRole,
  type ProductResourceSemantics,
} from '../products/productResourceSemantics'

export type InventoryCreateIntent = {
  targetRole: ProductResourceRole
  selectedProductRole: ProductResourceRole | null
  roleMismatch: boolean
}

export function resolveInventoryCreateIntent(
  targetRole: ProductResourceRole,
  selectedProduct: ProductResourceSemantics | null,
): InventoryCreateIntent {
  const selectedProductRole = selectedProduct
    ? productResourceRoleFromSemantics(selectedProduct)
    : null

  return {
    targetRole,
    selectedProductRole,
    roleMismatch: selectedProductRole !== null && selectedProductRole !== targetRole,
  }
}
