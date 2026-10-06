import type { InventoryLot } from './types'

const QUICK_UNIT_FAMILIES = new Set(['count', 'package', 'jar', 'bottle', 'can', 'sachet'])

export function isQuickAdjustableUnitFamily(family: string) {
  return QUICK_UNIT_FAMILIES.has(family)
}

export function isQuickAdjustableInventoryLot(lot: InventoryLot) {
  return lot.recipeEligible
    && lot.inventoryTrackingMode === 'quantity'
    && isQuickAdjustableUnitFamily(lot.unitFamily)
    && Number.isInteger(lot.quantity)
    && lot.quantity > 0
}

export function canQuickIncrementInventoryLot(lot: InventoryLot) {
  return isQuickAdjustableInventoryLot(lot) && lot.openedAt === null
}
