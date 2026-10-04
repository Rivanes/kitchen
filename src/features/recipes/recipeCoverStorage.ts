import { supabase } from '../../lib/supabase/client'
import type { ProcessedRecipeImage } from './recipeImageProcessor'

export const RECIPE_IMAGE_BUCKET = 'recipe-images'
const SIGNED_URL_SECONDS = 60 * 60

function assertUuidLike(value: string, label: string) {
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error(`Nieprawidłowy identyfikator: ${label}.`)
  }
}

function recipeCoverPath(ownerId: string, recipeId: string, extension: 'avif' | 'webp') {
  assertUuidLike(ownerId, 'owner')
  assertUuidLike(recipeId, 'recipe')
  return `${ownerId}/${recipeId}/cover-${crypto.randomUUID()}.${extension}`
}

export async function uploadRecipeCover(input: {
  ownerId: string
  recipeId: string
  image: ProcessedRecipeImage
}) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const path = recipeCoverPath(input.ownerId, input.recipeId, input.image.extension)
  const result = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .upload(path, input.image.blob, {
      contentType: input.image.mimeType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (result.error) {
    throw new Error(`Nie udało się zapisać zdjęcia przepisu: ${result.error.message}`)
  }

  return path
}

export async function removeRecipeCover(path: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .remove([path])

  if (result.error) {
    throw new Error(`Nie udało się usunąć zdjęcia przepisu: ${result.error.message}`)
  }
}

export async function removeRecipeCoverBestEffort(path: string | null) {
  if (!path || !supabase) return
  try {
    await removeRecipeCover(path)
  } catch {
    // Database state stays authoritative. A later Storage GC may remove a rare orphan.
  }
}

export async function createRecipeCoverSignedUrl(path: string | null) {
  if (!path || !supabase) return null

  const result = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)

  if (result.error || !result.data?.signedUrl) return null
  return result.data.signedUrl
}
