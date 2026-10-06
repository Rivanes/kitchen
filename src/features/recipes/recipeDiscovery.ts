import type { RecipeCategoryCode } from './recipeCategories'

export type RecipeCategoryFilter = 'all' | RecipeCategoryCode

export type RecipeDiscoveryCandidate = {
  id: string
  categoryCode: RecipeCategoryCode
  updatedAt: string
}

export function resolveCurrentMealCategory(localHour: number): RecipeCategoryCode | null {
  if (!Number.isInteger(localHour) || localHour < 0 || localHour > 23) {
    throw new Error('Local hour must be an integer from 0 to 23.')
  }

  if (localHour >= 6 && localHour < 12) return 'breakfast'
  if (localHour >= 12 && localHour < 18) return 'lunch'
  if (localHour >= 18 && localHour < 23) return 'dinner'
  return null
}

export function filterRecipesByCategory<T extends { categoryCode: RecipeCategoryCode }>(
  recipes: readonly T[],
  filter: RecipeCategoryFilter,
): T[] {
  if (filter === 'all') return [...recipes]
  return recipes.filter((recipe) => recipe.categoryCode === filter)
}

function compareUpdatedDesc(a: RecipeDiscoveryCandidate, b: RecipeDiscoveryCandidate) {
  const delta = Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  if (delta !== 0) return delta
  return a.id.localeCompare(b.id)
}

export function buildHomeRecipeSuggestions<T extends RecipeDiscoveryCandidate>(input: {
  recipes: readonly T[]
  currentMealCategory: RecipeCategoryCode | null
  generalFilter: RecipeCategoryFilter
  nowLimit?: number
  generalLimit?: number
}) {
  const nowLimit = input.nowLimit ?? 3
  const generalLimit = input.generalLimit ?? 6
  const ordered = [...input.recipes].sort(compareUpdatedDesc)
  const now = input.currentMealCategory
    ? ordered.filter((recipe) => recipe.categoryCode === input.currentMealCategory).slice(0, nowLimit)
    : []

  const filteredGeneral = filterRecipesByCategory(ordered, input.generalFilter)
  if (input.generalFilter !== 'all' || now.length === 0) {
    return { now, general: filteredGeneral.slice(0, generalLimit) }
  }

  const nowIds = new Set(now.map((recipe) => recipe.id))
  const alternatives = filteredGeneral.filter((recipe) => !nowIds.has(recipe.id))

  if (alternatives.length > 0) {
    return { now, general: alternatives.slice(0, generalLimit) }
  }

  return { now, general: filteredGeneral.slice(0, generalLimit) }
}
