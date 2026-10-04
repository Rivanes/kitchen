import { supabase } from '../../lib/supabase/client'
import { loadMeasurementUnits } from '../measurements/measurementUnits'
import { loadOwnerProductCatalog } from '../products/productCatalogMutations'
import { readStoredQuantity } from '../quantity/quantity'
import { createRecipeCoverSignedUrl } from './recipeCoverStorage'
import type { RecipeIngredientRead, RecipeReadItem, RecipesReadModel } from './types'

type RawRecipe = {
  id: string
  name: string
  servings: number
  instructions: string | null
  cover_image_path: string | null
  updated_at: string
}

type RawRecipeIngredient = {
  id: string
  recipe_id: string
  product_id: string
  quantity: number | string
  unit_code: string
  sort_order: number
  note: string | null
  created_at: string
}

function assertNoQueryError(error: { message: string } | null, resource: string) {
  if (error) {
    throw new Error(`Recipes read failed for ${resource}: ${error.message}`)
  }
}

function compareIngredients(a: RecipeIngredientRead & { createdAt: string }, b: RecipeIngredientRead & { createdAt: string }) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder

  const timeDelta = Date.parse(a.createdAt) - Date.parse(b.createdAt)
  if (timeDelta !== 0) return timeDelta

  return a.id.localeCompare(b.id)
}

export async function loadRecipesReadModel(ownerId: string): Promise<RecipesReadModel> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const recipesResult = await supabase
    .from('recipes')
    .select('id, name, servings, instructions, cover_image_path, updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  assertNoQueryError(recipesResult.error, 'recipes')

  const rawRecipes = (recipesResult.data ?? []) as RawRecipe[]
  if (rawRecipes.length === 0) return { recipes: [] }

  const [ingredientsResult, products, units] = await Promise.all([
    supabase
      .from('recipe_ingredients')
      .select('id, recipe_id, product_id, quantity, unit_code, sort_order, note, created_at')
      .eq('owner_id', ownerId),
    loadOwnerProductCatalog(ownerId),
    loadMeasurementUnits(),
  ])

  assertNoQueryError(ingredientsResult.error, 'recipe_ingredients')

  const recipeIds = new Set(rawRecipes.map((recipe) => recipe.id))
  const productById = new Map(products.map((product) => [product.id, product]))
  const unitByCode = new Map(units.map((unit) => [unit.code, unit]))
  const ingredientsByRecipe = new Map<string, Array<RecipeIngredientRead & { createdAt: string }>>()

  for (const row of (ingredientsResult.data ?? []) as RawRecipeIngredient[]) {
    if (!recipeIds.has(row.recipe_id)) {
      throw new Error('Recipes read returned an ingredient for an unresolved Recipe.')
    }

    const product = productById.get(row.product_id)
    if (!product) {
      throw new Error('Recipes read returned an ingredient with an unresolved canonical Product.')
    }

    const unit = unitByCode.get(row.unit_code)
    if (!unit) {
      throw new Error('Recipes read returned an ingredient with an unresolved Measurement Unit.')
    }

    const ingredient: RecipeIngredientRead & { createdAt: string } = {
      id: row.id,
      productId: row.product_id,
      productName: product.name,
      quantity: readStoredQuantity(row.quantity, 'Recipes read returned an invalid ingredient quantity.'),
      unitCode: unit.code,
      unitSymbol: unit.symbol,
      sortOrder: row.sort_order,
      note: row.note?.trim() || null,
      createdAt: row.created_at,
    }

    const recipeIngredients = ingredientsByRecipe.get(row.recipe_id) ?? []
    recipeIngredients.push(ingredient)
    ingredientsByRecipe.set(row.recipe_id, recipeIngredients)
  }

  for (const ingredients of ingredientsByRecipe.values()) {
    ingredients.sort(compareIngredients)
  }

  const coverUrls = new Map<string, string | null>()
  await Promise.all(rawRecipes.map(async (recipe) => {
    if (!recipe.cover_image_path) return
    const signedUrl = await createRecipeCoverSignedUrl(recipe.cover_image_path)
    coverUrls.set(recipe.id, signedUrl)
  }))

  const recipes: RecipeReadItem[] = rawRecipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name.trim(),
    servings: recipe.servings,
    instructions: recipe.instructions?.trim() || null,
    coverImagePath: recipe.cover_image_path,
    coverImageUrl: coverUrls.get(recipe.id) ?? null,
    updatedAt: recipe.updated_at,
    ingredients: (ingredientsByRecipe.get(recipe.id) ?? []).map(({ createdAt: _createdAt, ...ingredient }) => ingredient),
  }))

  return { recipes }
}
