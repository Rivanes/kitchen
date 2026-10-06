import { supabase } from '../../lib/supabase/client'
import { readStoredQuantity } from '../quantity/quantity'
import { assertRecipeCategoryCode, type RecipeCategoryCode } from './recipeCategories'
import { createRecipeCoverSignedUrl } from './recipeCoverStorage'
import type { RecipeMatchingIngredientInput } from './recipeMatching'

export type RecipeDiscoveryItem = {
  id: string
  name: string
  categoryCode: RecipeCategoryCode
  servings: number
  coverImagePath: string | null
  coverImageUrl: string | null
  coverFocusX: number
  coverFocusY: number
  updatedAt: string
  matchingIngredients: RecipeMatchingIngredientInput[]
}

export type RecipeDiscoveryReadModel = {
  recipes: RecipeDiscoveryItem[]
}

type RawRecipeDiscovery = {
  id: string
  name: string
  category_code: string
  servings: number
  cover_image_path: string | null
  cover_focus_x: number | string
  cover_focus_y: number | string
  updated_at: string
}

type RawMatchingIngredient = {
  id: string
  recipe_id: string
  product_id: string
  quantity: number | string
  unit_code: string
  package_content_value: number | string | null
  package_content_unit: string | null
}

export async function loadRecipeDiscoveryReadModel(ownerId: string): Promise<RecipeDiscoveryReadModel> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const [recipesResult, ingredientsResult] = await Promise.all([
    supabase
      .from('recipes')
      .select('id, name, category_code, servings, cover_image_path, cover_focus_x, cover_focus_y, updated_at')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('recipe_ingredients')
      .select('id, recipe_id, product_id, quantity, unit_code, package_content_value, package_content_unit')
      .eq('owner_id', ownerId),
  ])

  if (recipesResult.error) throw new Error(`Recipe discovery read failed: ${recipesResult.error.message}`)
  if (ingredientsResult.error) throw new Error(`Recipe discovery ingredient read failed: ${ingredientsResult.error.message}`)

  const rawRecipes = (recipesResult.data ?? []) as RawRecipeDiscovery[]
  const recipeIds = new Set(rawRecipes.map((recipe) => recipe.id))
  const ingredientsByRecipe = new Map<string, RecipeMatchingIngredientInput[]>()

  for (const row of (ingredientsResult.data ?? []) as RawMatchingIngredient[]) {
    if (!recipeIds.has(row.recipe_id)) throw new Error('Recipe discovery returned an ingredient for an unresolved Recipe.')
    const packageContentValue = row.package_content_value === null
      ? null
      : readStoredQuantity(row.package_content_value, 'Recipe discovery returned an invalid package-content snapshot.')
    if ((packageContentValue === null) !== (row.package_content_unit === null)) {
      throw new Error('Recipe discovery returned an inconsistent package-content snapshot.')
    }
    const list = ingredientsByRecipe.get(row.recipe_id) ?? []
    list.push({
      id: row.id,
      productId: row.product_id,
      quantity: readStoredQuantity(row.quantity, 'Recipe discovery returned an invalid ingredient quantity.'),
      unitCode: row.unit_code,
      packageContentValue,
      packageContentUnitCode: row.package_content_unit,
    })
    ingredientsByRecipe.set(row.recipe_id, list)
  }

  const coverUrls = new Map<string, string | null>()
  await Promise.all(rawRecipes.map(async (recipe) => {
    if (!recipe.cover_image_path) return
    coverUrls.set(recipe.id, await createRecipeCoverSignedUrl(recipe.cover_image_path))
  }))

  return {
    recipes: rawRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name.trim(),
      categoryCode: assertRecipeCategoryCode(recipe.category_code),
      servings: recipe.servings,
      coverImagePath: recipe.cover_image_path,
      coverImageUrl: coverUrls.get(recipe.id) ?? null,
      coverFocusX: Number(recipe.cover_focus_x),
      coverFocusY: Number(recipe.cover_focus_y),
      updatedAt: recipe.updated_at,
      matchingIngredients: ingredientsByRecipe.get(recipe.id) ?? [],
    })),
  }
}
