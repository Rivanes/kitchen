export const QUANTITY_DECIMAL_PLACES = 3
export const QUANTITY_SCALE = 1000
export const MAX_QUANTITY = 999999999.999
export const QUANTITY_INPUT_ERROR = 'Podaj ilość większą od 0, maksymalnie do 3 miejsc po przecinku.'

const quantityInputPattern = /^\d{1,9}(?:[.,]\d{1,3})?$/
const precisionTolerance = 1e-7

function hasSupportedPrecision(value: number) {
  const scaled = value * QUANTITY_SCALE
  return Math.abs(scaled - Math.round(scaled)) <= precisionTolerance
}

export function normalizeQuantityPrecision(value: number) {
  return Math.round(value * QUANTITY_SCALE) / QUANTITY_SCALE
}

export function parseQuantityInput(value: string): number | null {
  const trimmed = value.trim()
  if (!quantityInputPattern.test(trimmed)) return null

  const parsed = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_QUANTITY) return null
  if (!hasSupportedPrecision(parsed)) return null
  return normalizeQuantityPrecision(parsed)
}

export function assertValidQuantity(value: number, message = QUANTITY_INPUT_ERROR) {
  if (
    !Number.isFinite(value)
    || value <= 0
    || value > MAX_QUANTITY
    || !hasSupportedPrecision(value)
  ) {
    throw new Error(message)
  }
  return normalizeQuantityPrecision(value)
}

export function readStoredQuantity(value: number | string, message: string) {
  const quantity = typeof value === 'number' ? value : Number(value)
  if (
    !Number.isFinite(quantity)
    || quantity <= 0
    || quantity > MAX_QUANTITY
    || !hasSupportedPrecision(quantity)
  ) {
    throw new Error(message)
  }
  return normalizeQuantityPrecision(quantity)
}

export function addQuantities(left: number, right: number, overflowMessage: string) {
  const safeLeft = assertValidQuantity(left)
  const safeRight = assertValidQuantity(right)
  const total = normalizeQuantityPrecision(safeLeft + safeRight)

  if (!Number.isFinite(total) || total > MAX_QUANTITY) {
    throw new Error(overflowMessage)
  }

  return total
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: QUANTITY_DECIMAL_PLACES,
  }).format(value)
}
