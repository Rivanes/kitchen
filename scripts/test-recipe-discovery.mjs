import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  RECIPE_CATEGORIES,
  assertRecipeCategoryCode,
  recipeCategoryLabel,
} from '../src/features/recipes/recipeCategories.ts'
import {
  buildHomeRecipeSuggestions,
  filterRecipesByCategory,
  resolveCurrentMealCategory,
} from '../src/features/recipes/recipeDiscovery.ts'

assert.deepEqual(RECIPE_CATEGORIES.map((category) => category.code), [
  'breakfast', 'lunch', 'dinner', 'snack', 'cake',
])
assert.equal(recipeCategoryLabel('breakfast'), 'Śniadanie')
assert.equal(recipeCategoryLabel('lunch'), 'Obiad')
assert.equal(recipeCategoryLabel('dinner'), 'Kolacja')
assert.equal(recipeCategoryLabel('snack'), 'Przekąska')
assert.equal(recipeCategoryLabel('cake'), 'Ciasto')
assert.equal(assertRecipeCategoryCode('cake'), 'cake')
assert.throws(() => assertRecipeCategoryCode('general'), /kategorię/i)

const hourCases = [
  [0, null], [5, null], [6, 'breakfast'], [11, 'breakfast'],
  [12, 'lunch'], [17, 'lunch'], [18, 'dinner'], [22, 'dinner'], [23, null],
]
for (const [hour, expected] of hourCases) {
  assert.equal(resolveCurrentMealCategory(hour), expected, `unexpected category at ${hour}:00`)
}
assert.throws(() => resolveCurrentMealCategory(-1))
assert.throws(() => resolveCurrentMealCategory(24))

const recipes = [
  { id: 'breakfast-a', categoryCode: 'breakfast', updatedAt: '2026-10-06T10:00:00Z', cookable: true },
  { id: 'breakfast-b', categoryCode: 'breakfast', updatedAt: '2026-10-06T09:00:00Z', cookable: false },
  { id: 'lunch-a', categoryCode: 'lunch', updatedAt: '2026-10-06T08:00:00Z', cookable: true },
  { id: 'dinner-a', categoryCode: 'dinner', updatedAt: '2026-10-06T07:00:00Z', cookable: true },
  { id: 'snack-a', categoryCode: 'snack', updatedAt: '2026-10-06T06:00:00Z', cookable: true },
  { id: 'cake-a', categoryCode: 'cake', updatedAt: '2026-10-06T05:00:00Z', cookable: true },
]

assert.deepEqual(filterRecipesByCategory(recipes, 'lunch').map((recipe) => recipe.id), ['lunch-a'])
assert.equal(filterRecipesByCategory(recipes, 'all').length, recipes.length)
const morning = buildHomeRecipeSuggestions({
  recipes,
  currentMealCategory: 'breakfast',
  generalFilter: 'all',
  nowLimit: 3,
  generalLimit: 4,
})
assert.deepEqual(morning.now.map((recipe) => recipe.id), ['breakfast-a', 'breakfast-b'])
assert.deepEqual(morning.cookableNow.map((recipe) => recipe.id), ['breakfast-a'], 'Mogę ugotować must be a separate current-meal section containing only sufficient Recipes')
assert.equal(morning.general.length, 4)
assert.ok(morning.general.some((recipe) => recipe.categoryCode === 'snack'))
assert.ok(morning.general.some((recipe) => recipe.categoryCode === 'cake'))
assert.ok(morning.general.every((recipe) => !morning.now.some((nowRecipe) => nowRecipe.id === recipe.id)), 'general preview should avoid duplicate Now recipes when alternatives exist')

const oneAlternative = buildHomeRecipeSuggestions({
  recipes: recipes.slice(0, 3),
  currentMealCategory: 'breakfast',
  generalFilter: 'all',
  generalLimit: 6,
})
assert.deepEqual(oneAlternative.general.map((recipe) => recipe.id), ['lunch-a'], 'one available alternative should be preferred over duplicating Na teraz in unfiltered General')

const filteredBreakfast = buildHomeRecipeSuggestions({
  recipes,
  currentMealCategory: 'breakfast',
  generalFilter: 'breakfast',
  generalLimit: 6,
})
assert.deepEqual(filteredBreakfast.general.map((recipe) => recipe.id), ['breakfast-a', 'breakfast-b'], 'manual category filter must never hide matching recipes because they also appear in Now')

const night = buildHomeRecipeSuggestions({
  recipes,
  currentMealCategory: null,
  generalFilter: 'all',
})
assert.equal(night.now.length, 0)
assert.equal(night.cookableNow.length, 0, 'time-aware Mogę ugotować section is hidden outside breakfast/lunch/dinner windows')
assert.equal(night.general.length, 6, 'general discovery must remain available at night')


const lunchDiscovery = buildHomeRecipeSuggestions({
  recipes,
  currentMealCategory: 'lunch',
  generalFilter: 'all',
})
assert.deepEqual(lunchDiscovery.cookableNow.map((recipe) => recipe.id), ['lunch-a'])

for (const promoted of ['snack', 'cake']) {
  assert.notEqual(resolveCurrentMealCategory(10), promoted)
  assert.notEqual(resolveCurrentMealCategory(14), promoted)
  assert.notEqual(resolveCurrentMealCategory(20), promoted)
}

const mutations = await readFile('src/features/recipes/recipeMutations.ts', 'utf8')
const editor = await readFile('src/features/recipes/RecipeEditor.tsx', 'utf8')
const recipesPage = await readFile('src/features/recipes/RecipesPage.tsx', 'utf8')
const home = await readFile('src/features/home/HomePage.tsx', 'utf8')
const shell = await readFile('src/components/AppShell.tsx', 'utf8')
const discoveryRead = await readFile('src/features/recipes/recipeDiscoveryReadModel.ts', 'utf8')

assert.match(mutations, /p_category_code/)
assert.match(editor, /Wybierz jedną kategorię/)
assert.match(recipesPage, /recipe-category-filters/)
assert.match(recipesPage, /openRecipeRequestToken/)
assert.match(home, /Na teraz/)
assert.match(home, /Inspiracje i planowanie/)
assert.match(home, /recipeCategoryFilter/)
assert.match(home, /home-recipes-cookable/)
assert.match(home, /mealOccasionLabel/)
assert.doesNotMatch(home, /recipeCookabilityFilter/)
assert.doesNotMatch(recipesPage, /recipe-cookable-filter/)
assert.match(home, /visibilitychange/)
assert.match(shell, /openRecipeFromHome/)
assert.match(discoveryRead, /category_code/)
assert.doesNotMatch(home, /loadRecipesReadModel/)

console.log('V4.3.1 Recipe discovery + separate cookable meal section tests: PASS')
