import type { RecipeCategoryCode } from './recipeCategories'

export type RecipeCategoryFilter = 'all' | RecipeCategoryCode

export type RecipeDiscoveryCandidate = {
  id: string
  categoryCode: RecipeCategoryCode
  updatedAt: string
  cookable?: boolean
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
  cookableNowLimit?: number
  generalLimit?: number
}) {
  const nowLimit = input.nowLimit ?? 3
  const cookableNowLimit = input.cookableNowLimit ?? 3
  const generalLimit = input.generalLimit ?? 6
  const ordered = [...input.recipes].sort(compareUpdatedDesc)
  const currentMealRecipes = input.currentMealCategory
    ? ordered.filter((recipe) => recipe.categoryCode === input.currentMealCategory)
    : []
  const cookableNow = currentMealRecipes
    .filter((recipe) => recipe.cookable === true)
    .slice(0, cookableNowLimit)
  // The Home screen is a set of prioritized previews, not three copies of one
  // catalogue: available meals come first, then other meal-time ideas.
  const cookableIds = new Set(currentMealRecipes.filter((recipe) => recipe.cookable === true).map((recipe) => recipe.id))
  const now = currentMealRecipes
    .filter((recipe) => !cookableIds.has(recipe.id))
    .slice(0, nowLimit)

  const general = filterRecipesByCategory(ordered, input.generalFilter)
  if (input.generalFilter !== 'all') {
    return { now, cookableNow, general: general.slice(0, generalLimit) }
  }

  const highlightedIds = new Set([...cookableNow, ...now].map((recipe) => recipe.id))
  return {
    now,
    cookableNow,
    general: general.filter((recipe) => !highlightedIds.has(recipe.id)).slice(0, generalLimit),
  }
}
