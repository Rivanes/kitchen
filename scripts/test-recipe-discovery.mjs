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
assert.deepEqual(morning.now.map((recipe) => recipe.id), ['breakfast-a'], 'Na teraz contains only current-meal Recipes with sufficient physical ingredients')
assert.deepEqual(morning.cookable.map((recipe) => recipe.id), ['lunch-a', 'dinner-a', 'snack-a'], 'Mogę ugotować contains ready alternatives outside the current meal window')
assert.deepEqual(morning.general.map((recipe) => recipe.id), ['breakfast-b', 'cake-a'], 'unavailable current-meal Recipes remain available for planning, not Na teraz')
assert.ok(morning.general.every((recipe) => ![...morning.now, ...morning.cookable].some((highlight) => highlight.id === recipe.id)), 'unfiltered general preview cannot repeat highlighted recipes')

const oneAlternative = buildHomeRecipeSuggestions({
  recipes: recipes.slice(0, 3),
  currentMealCategory: 'breakfast',
  generalFilter: 'all',
  generalLimit: 6,
})
assert.deepEqual(oneAlternative.cookable.map((recipe) => recipe.id), ['lunch-a'], 'a ready alternative should appear in Mogę ugotować')
assert.deepEqual(oneAlternative.general.map((recipe) => recipe.id), ['breakfast-b'], 'a missing current-meal Recipe is displayed only in general planning')

const onlyMissing = buildHomeRecipeSuggestions({
  recipes: [recipes[1]], currentMealCategory: 'breakfast', generalFilter: 'all',
})
assert.equal(onlyMissing.now.length, 0, 'a Recipe requiring shopping must never appear in Na teraz')
assert.equal(onlyMissing.cookable.length, 0)
assert.deepEqual(onlyMissing.general.map((recipe) => recipe.id), ['breakfast-b'], 'a single missing Recipe remains available in planning')

const onlySufficient = buildHomeRecipeSuggestions({
  recipes: [recipes[0]], currentMealCategory: 'breakfast', generalFilter: 'all',
})
assert.deepEqual(onlySufficient.now.map((recipe) => recipe.id), ['breakfast-a'])
assert.equal(onlySufficient.cookable.length, 0)
assert.equal(onlySufficient.general.length, 0, 'a single available recipe is presented only once')

const empty = buildHomeRecipeSuggestions({ recipes: [], currentMealCategory: 'breakfast', generalFilter: 'all' })
assert.deepEqual(empty, { now: [], cookable: [], general: [] }, 'empty account never fabricates suggestions')

const filteredBreakfast = buildHomeRecipeSuggestions({
  recipes,
  currentMealCategory: 'breakfast',
  generalFilter: 'breakfast',
  generalLimit: 1,
})
assert.deepEqual(filteredBreakfast.general.map((recipe) => recipe.id), ['breakfast-a', 'breakfast-b'], 'manual category filter must never hide matching recipes because they also appear in Now')

const partialAndUnresolved = buildHomeRecipeSuggestions({
  recipes: [
    { id: 'partial', categoryCode: 'breakfast', updatedAt: '2026-10-06T12:00:00Z', cookable: false },
    { id: 'unresolved', categoryCode: 'breakfast', updatedAt: '2026-10-06T11:00:00Z' },
  ],
  currentMealCategory: 'breakfast', generalFilter: 'all',
})
assert.equal(partialAndUnresolved.now.length, 0, 'unknown or partial physical availability must never be promoted')
assert.deepEqual(partialAndUnresolved.general.map((recipe) => recipe.id), ['partial', 'unresolved'])

const night = buildHomeRecipeSuggestions({
  recipes,
  currentMealCategory: null,
  generalFilter: 'all',
})
assert.equal(night.now.length, 0)
assert.deepEqual(night.cookable.map((recipe) => recipe.id), ['breakfast-a', 'lunch-a', 'dinner-a'], 'other available Recipes may be cooked outside fixed meal-time windows')
assert.equal(night.general.length, 3, 'remaining planning Recipes are still available at night')


const lunchDiscovery = buildHomeRecipeSuggestions({
  recipes,
  currentMealCategory: 'lunch',
  generalFilter: 'all',
})
assert.deepEqual(lunchDiscovery.now.map((recipe) => recipe.id), ['lunch-a'])
assert.ok(lunchDiscovery.cookable.every((recipe) => recipe.cookable && recipe.categoryCode !== 'lunch'))

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
assert.match(home, /Przepisy/)
assert.match(home, /recipeCategoryFilter/)
assert.match(home, /home-recipes-cookable/)
assert.ok(home.indexOf('home-recipes-cookable"') < home.indexOf('home-recipes-now"'), 'Mogę ugotować is visually above Na teraz')
assert.match(home, /recipeSuggestions\.cookable\.length > 0/)
assert.match(home, /recipeSuggestions\.now\.length > 0/)
assert.match(home, /showGeneralRecipes && <section/)
assert.match(home, /!recipeFilterActive && recipeSuggestions/)
assert.doesNotMatch(home, /recipeCookabilityFilter/)
assert.doesNotMatch(recipesPage, /recipe-cookable-filter/)

assert.doesNotMatch(home, /recipe\.match\?\.state \?\? ['"]unresolved['"]/, 'Home must not synthesize Nieustalone while Inventory matching data is unavailable')
assert.match(home, /showMatch && recipe\.match/, 'Home badge component may render only confirmed matcher results')
assert.match(home, /showMatch=\{homeStatus\.status === ['"]ready['"]\}/, 'Home must not pass enabled badge state before Inventory is ready')
assert.doesNotMatch(home, /Brak przepisu z kompletem potwierdzonych składników/, 'hide empty automatic cookable suggestions')
assert.doesNotMatch(home, /nie masz wszystkich składników do żadnego przepisu/, 'Cookable empty state must not claim definite ingredient shortage')
assert.match(home, /visibilitychange/)
assert.match(shell, /openRecipeFromHome/)
assert.match(discoveryRead, /category_code/)
assert.doesNotMatch(home, /loadRecipesReadModel/)

console.log('V4.4 Recipe discovery + matching readiness polish tests: PASS')
