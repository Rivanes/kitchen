import { supabase } from '../../lib/supabase/client'
import {
  removeRecipeCoverBestEffort,
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
}

export type CreateRecipeInput = RecipeWriteInput & {
  cover: Extract<RecipeCoverChange, { kind: 'replace' }> | { kind: 'remove' }
}

export type UpdateRecipeInput = RecipeWriteInput & {
  recipeId: string
  currentCoverPath: string | null
  cover: RecipeCoverChange
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
    await removeRecipeCoverBestEffort(uploadedCoverPath)
    throw error
  }
}

export async function updateRecipe(input: UpdateRecipeInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  let nextCoverPath = input.currentCoverPath
  let uploadedReplacementPath: string | null = null

  if (input.cover.kind === 'replace') {
    uploadedReplacementPath = await uploadRecipeCover({
      ownerId: input.ownerId,
      recipeId: input.recipeId,
      image: input.cover.image,
    })
    nextCoverPath = uploadedReplacementPath
  } else if (input.cover.kind === 'remove') {
    nextCoverPath = null
  }

  const result = await supabase
    .from('recipes')
    .update({
      ...recipePayload(input),
      ...(input.cover.kind === 'keep' ? {} : { cover_image_path: nextCoverPath }),
    })
    .eq('id', input.recipeId)
    .eq('owner_id', input.ownerId)
    .select('id')
    .maybeSingle()

  if (result.error) {
    await removeRecipeCoverBestEffort(uploadedReplacementPath)
    throw new Error(`Nie udało się zapisać przepisu: ${result.error.message}`)
  }

  if (!result.data) {
    await removeRecipeCoverBestEffort(uploadedReplacementPath)
    throw new Error('Nie znaleziono przepisu do zapisania.')
  }

  if (
    input.cover.kind !== 'keep'
    && input.currentCoverPath
    && input.currentCoverPath !== nextCoverPath
  ) {
    await removeRecipeCoverBestEffort(input.currentCoverPath)
  }

  return input.recipeId
}

export async function deleteRecipe(input: {
  ownerId: string
  recipeId: string
  coverImagePath: string | null
}) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('recipes')
    .delete()
    .eq('id', input.recipeId)
    .eq('owner_id', input.ownerId)
    .select('id')
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się usunąć przepisu: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie znaleziono przepisu do usunięcia.')
  }

  await removeRecipeCoverBestEffort(input.coverImagePath)
}
