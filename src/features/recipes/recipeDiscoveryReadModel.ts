import { supabase } from '../../lib/supabase/client'
import { assertRecipeCategoryCode, type RecipeCategoryCode } from './recipeCategories'
import { createRecipeCoverSignedUrl } from './recipeCoverStorage'

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

export async function loadRecipeDiscoveryReadModel(ownerId: string): Promise<RecipeDiscoveryReadModel> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('recipes')
    .select('id, name, category_code, servings, cover_image_path, cover_focus_x, cover_focus_y, updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (result.error) {
    throw new Error(`Recipe discovery read failed: ${result.error.message}`)
  }

  const rawRecipes = (result.data ?? []) as RawRecipeDiscovery[]
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
    })),
  }
}
