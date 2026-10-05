export function isHouseholdLowStock(quantity: number, minimumStockQuantity: number | null) {
  return minimumStockQuantity !== null && quantity <= minimumStockQuantity
}
