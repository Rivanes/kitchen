import { formatQuantity, normalizeQuantityPrecision } from '../quantity/quantity'

export const RECIPE_SERVINGS_MIN = 1
export const RECIPE_SERVINGS_MAX = 999

export function clampRecipeServings(value: number) {
  if (!Number.isFinite(value)) return RECIPE_SERVINGS_MIN
  return Math.min(
    RECIPE_SERVINGS_MAX,
    Math.max(RECIPE_SERVINGS_MIN, Math.round(value)),
  )
}

export function assertRecipeServings(value: number) {
  if (
    !Number.isInteger(value)
    || value < RECIPE_SERVINGS_MIN
    || value > RECIPE_SERVINGS_MAX
  ) {
    throw new Error('Liczba porcji musi być pełną liczbą od 1 do 999.')
  }

  return value
}

export function scaleRecipeIngredientQuantity(input: {
  baseQuantity: number
  baseServings: number
  targetServings: number
}) {
  const baseServings = assertRecipeServings(input.baseServings)
  const targetServings = assertRecipeServings(input.targetServings)

  if (!Number.isFinite(input.baseQuantity) || input.baseQuantity <= 0) {
    throw new Error('Nieprawidłowa bazowa ilość składnika.')
  }

  if (baseServings === targetServings) {
    return {
      exact: input.baseQuantity,
      rounded: input.baseQuantity,
    }
  }

  const exact = input.baseQuantity * targetServings / baseServings
  if (!Number.isFinite(exact) || exact <= 0) {
    throw new Error('Nie udało się przeliczyć ilości składnika.')
  }

  return {
    exact,
    rounded: normalizeQuantityPrecision(exact),
  }
}

export function formatScaledRecipeQuantity(input: {
  baseQuantity: number
  baseServings: number
  targetServings: number
}) {
  const scaled = scaleRecipeIngredientQuantity(input)

  if (scaled.rounded <= 0 && scaled.exact > 0) {
    return '<0,001'
  }

  return formatQuantity(scaled.rounded)
}
