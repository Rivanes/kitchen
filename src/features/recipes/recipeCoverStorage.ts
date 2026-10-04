import { supabase } from '../../lib/supabase/client'
import type { ProcessedRecipeImage } from './recipeImageProcessor'

export const RECIPE_IMAGE_BUCKET = 'recipe-images'
const SIGNED_URL_SECONDS = 60 * 60

type CleanupRow = {
  id: string
  storage_path: string
}

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


async function isRecipeCoverReferenced(ownerId: string, path: string) {
  if (!supabase) return false

  const result = await supabase
    .from('recipes')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('cover_image_path', path)
    .limit(1)

  if (result.error) {
    throw new Error(`Nie udało się sprawdzić użycia zdjęcia: ${result.error.message}`)
  }

  return (result.data ?? []).length > 0
}

export async function queueRecipeCoverCleanup(ownerId: string, path: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('recipe_image_cleanup_queue')
    .upsert(
      { owner_id: ownerId, storage_path: path },
      { onConflict: 'owner_id,storage_path', ignoreDuplicates: true },
    )

  if (result.error) {
    throw new Error(`Nie udało się zabezpieczyć sprzątania zdjęcia: ${result.error.message}`)
  }
}

export async function cleanupUnreferencedRecipeCover(ownerId: string, path: string | null) {
  if (!path || !supabase) return

  if (await isRecipeCoverReferenced(ownerId, path)) return

  try {
    await removeRecipeCover(path)
    return
  } catch {
    await queueRecipeCoverCleanup(ownerId, path)
  }
}

export async function flushRecipeImageCleanupQueue(ownerId: string) {
  if (!supabase) return

  const result = await supabase
    .from('recipe_image_cleanup_queue')
    .select('id, storage_path')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(25)

  if (result.error) return

  for (const row of (result.data ?? []) as CleanupRow[]) {
    try {
      if (await isRecipeCoverReferenced(ownerId, row.storage_path)) {
        const staleQueueResult = await supabase
          .from('recipe_image_cleanup_queue')
          .delete()
          .eq('id', row.id)
          .eq('owner_id', ownerId)
        if (staleQueueResult.error) return
        continue
      }

      await removeRecipeCover(row.storage_path)
      const deleteResult = await supabase
        .from('recipe_image_cleanup_queue')
        .delete()
        .eq('id', row.id)
        .eq('owner_id', ownerId)

      if (deleteResult.error) return
    } catch {
      // Maintenance is retried on a later Recipe visit. It never blocks Recipe reading.
      return
    }
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
