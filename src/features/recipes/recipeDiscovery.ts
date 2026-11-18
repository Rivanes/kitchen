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
  cookableLimit?: number
  generalLimit?: number
}) {
  const nowLimit = input.nowLimit ?? 3
  const cookableLimit = input.cookableLimit ?? 3
  const generalLimit = input.generalLimit ?? 6
  const ordered = [...input.recipes].sort(compareUpdatedDesc)
  const readyRecipes = ordered.filter((recipe) => recipe.cookable === true)
  // Both automatic lanes require confirmed physical sufficiency. "Na teraz"
  // takes the ready recipes for the current meal; "Mogę ugotować" contains
  // ready alternatives from other categories, without repeating those cards.
  const currentMealReady = input.currentMealCategory
    ? readyRecipes.filter((recipe) => recipe.categoryCode === input.currentMealCategory)
    : []
  const now = currentMealReady.slice(0, nowLimit)
  const currentMealReadyIds = new Set(currentMealReady.map((recipe) => recipe.id))
  const cookable = readyRecipes
    .filter((recipe) => !currentMealReadyIds.has(recipe.id))
    .slice(0, cookableLimit)

  const general = filterRecipesByCategory(ordered, input.generalFilter)
  if (input.generalFilter !== 'all') {
    // A deliberate category selection is planning, not a restricted preview.
    return { now, cookable, general }
  }

  const highlightedIds = new Set([...cookable, ...now].map((recipe) => recipe.id))
  return {
    now,
    cookable,
    general: general.filter((recipe) => !highlightedIds.has(recipe.id)).slice(0, generalLimit),
  }
}
