import { supabase } from '../../lib/supabase/client'
import {
  cleanupUnreferencedRecipeCover,
  flushRecipeImageCleanupQueue,
  uploadRecipeCover,
} from './recipeCoverStorage'
import type { ProcessedRecipeImage } from './recipeImageProcessor'

export type RecipeCoverChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'replace'; image: ProcessedRecipeImage }

export type RecipeWriteInput = {
  ownerId: string
  name: string
  servings: number
  instructions: string
  coverFocusX: number
  coverFocusY: number
}

export type CreateRecipeInput = RecipeWriteInput & {
  cover: Extract<RecipeCoverChange, { kind: 'replace' }> | { kind: 'remove' }
}

export type UpdateRecipeInput = RecipeWriteInput & {
  recipeId: string
  currentCoverPath: string | null
  cover: RecipeCoverChange
}

function clampFocus(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, Math.round(value * 10000) / 10000))
}

export function cleanRecipeName(value: string) {
  const clean = value.trim().replace(/\s+/g, ' ')
  if (!clean || clean.length > 160) {
    throw new Error('Podaj nazwę przepisu do 160 znaków.')
  }
  return clean
}

export function cleanRecipeInstructions(value: string) {
  const clean = value.trim()
  return clean || null
}

export function validateRecipeServings(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 999) {
    throw new Error('Liczba porcji musi być pełną liczbą od 1 do 999.')
  }
  return value
}

function recipePayload(input: RecipeWriteInput) {
  return {
    owner_id: input.ownerId,
    name: cleanRecipeName(input.name),
    servings: validateRecipeServings(input.servings),
    instructions: cleanRecipeInstructions(input.instructions),
    cover_focus_x: clampFocus(input.coverFocusX),
    cover_focus_y: clampFocus(input.coverFocusY),
  }
}

export async function createRecipe(input: CreateRecipeInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const recipeId = crypto.randomUUID()
  let uploadedCoverPath: string | null = null

  try {
    if (input.cover.kind === 'replace') {
      uploadedCoverPath = await uploadRecipeCover({
        ownerId: input.ownerId,
        recipeId,
        image: input.cover.image,
      })
    }

    const result = await supabase
      .from('recipes')
      .insert({
        id: recipeId,
        ...recipePayload(input),
        cover_image_path: uploadedCoverPath,
      })
      .select('id')
      .single()

    if (result.error) {
      throw new Error(`Nie udało się utworzyć przepisu: ${result.error.message}`)
    }

    return result.data.id as string
  } catch (error) {
    await cleanupUnreferencedRecipeCover(input.ownerId, uploadedCoverPath)
    throw error
  }
}

export async function updateRecipe(input: UpdateRecipeInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  let uploadedReplacementPath: string | null = null

  try {
    if (input.cover.kind === 'replace') {
      uploadedReplacementPath = await uploadRecipeCover({
        ownerId: input.ownerId,
        recipeId: input.recipeId,
        image: input.cover.image,
      })
    }

    const payload = recipePayload(input)
    const result = await supabase.rpc('update_recipe_with_cover_cleanup', {
      p_owner_id: input.ownerId,
      p_recipe_id: input.recipeId,
      p_name: payload.name,
      p_servings: payload.servings,
      p_instructions: payload.instructions,
      p_cover_action: input.cover.kind,
      p_cover_image_path: input.cover.kind === 'replace' ? uploadedReplacementPath : null,
      p_cover_focus_x: payload.cover_focus_x,
      p_cover_focus_y: payload.cover_focus_y,
    })

    if (result.error) {
      throw new Error(`Nie udało się zapisać przepisu: ${result.error.message}`)
    }

    await flushRecipeImageCleanupQueue(input.ownerId)
    return input.recipeId
  } catch (error) {
    await cleanupUnreferencedRecipeCover(input.ownerId, uploadedReplacementPath)
    throw error
  }
}

export async function deleteRecipe(input: {
  ownerId: string
  recipeId: string
}) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase.rpc('delete_recipe_with_cover_cleanup', {
    p_owner_id: input.ownerId,
    p_recipe_id: input.recipeId,
  })

  if (result.error) {
    throw new Error(`Nie udało się usunąć przepisu: ${result.error.message}`)
  }

  await flushRecipeImageCleanupQueue(input.ownerId)
}
