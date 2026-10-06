export const RECIPE_CATEGORIES = [
  { code: 'breakfast', label: 'Śniadanie' },
  { code: 'lunch', label: 'Obiad' },
  { code: 'dinner', label: 'Kolacja' },
  { code: 'snack', label: 'Przekąska' },
  { code: 'cake', label: 'Ciasto' },
] as const

export type RecipeCategoryCode = (typeof RECIPE_CATEGORIES)[number]['code']

const categoryCodes = new Set<string>(RECIPE_CATEGORIES.map((category) => category.code))

export function isRecipeCategoryCode(value: unknown): value is RecipeCategoryCode {
  return typeof value === 'string' && categoryCodes.has(value)
}

export function assertRecipeCategoryCode(value: unknown): RecipeCategoryCode {
  if (!isRecipeCategoryCode(value)) {
    throw new Error('Wybierz kategorię przepisu.')
  }
  return value
}

export function recipeCategoryLabel(code: RecipeCategoryCode) {
  return RECIPE_CATEGORIES.find((category) => category.code === code)?.label ?? code
}
