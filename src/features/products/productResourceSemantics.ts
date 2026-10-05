export type InventoryTrackingMode = 'quantity' | 'presence'
export type ProductResourceRole = 'food' | 'spice' | 'household'

export type ProductResourceSemantics = {
  recipeEligible: boolean
  inventoryTrackingMode: InventoryTrackingMode
}

export const PRODUCT_RESOURCE_ROLES: readonly ProductResourceRole[] = ['food', 'spice', 'household']

export function semanticsForProductResourceRole(role: ProductResourceRole): ProductResourceSemantics {
  if (role === 'spice') {
    return { recipeEligible: true, inventoryTrackingMode: 'presence' }
  }
  if (role === 'household') {
    return { recipeEligible: false, inventoryTrackingMode: 'quantity' }
  }
  return { recipeEligible: true, inventoryTrackingMode: 'quantity' }
}

export function productResourceRoleFromSemantics(
  semantics: ProductResourceSemantics,
): ProductResourceRole {
  if (semantics.inventoryTrackingMode === 'presence') return 'spice'
  return semantics.recipeEligible ? 'food' : 'household'
}

export function productResourceRoleLabel(role: ProductResourceRole) {
  if (role === 'spice') return 'Przyprawa'
  if (role === 'household') return 'Domowe'
  return 'Spożywcze'
}

export function isExpiryTrackedProduct(semantics: ProductResourceSemantics) {
  return semantics.recipeEligible && semantics.inventoryTrackingMode === 'quantity'
}

export function roleForInventoryLocationKind(kind: string): ProductResourceRole {
  if (kind === 'spices') return 'spice'
  if (kind === 'household') return 'household'
  return 'food'
}

export function locationKindMatchesProductRole(kind: string, role: ProductResourceRole) {
  if (role === 'spice') return kind === 'spices'
  if (role === 'household') return kind === 'household'
  return kind !== 'spices' && kind !== 'household'
}
