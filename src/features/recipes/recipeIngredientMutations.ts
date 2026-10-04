import { supabase } from '../../lib/supabase/client'
import {
  cleanupCreatedCanonicalProduct,
  resolveOrCreateCanonicalProduct,
} from '../products/productCatalogMutations'
import { assertValidQuantity } from '../quantity/quantity'

export type RecipeIngredientWriteInput = {
  ownerId: string
  recipeId: string
  ingredientId: string | null
  productName: string
  selectedProductId: string | null
  quantity: number
  unitCode: string
  sectionLabel: string
  note: string
  sortOrder: number
}

function cleanOptional(value: string, maxLength: number, label: string) {
  const clean = value.trim().replace(/\s+/g, ' ')
  if (!clean) return null
  if (clean.length > maxLength) {
    throw new Error(`${label} może mieć maksymalnie ${maxLength} znaków.`)
  }
  return clean
}

export async function saveRecipeIngredient(input: RecipeIngredientWriteInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const quantity = assertValidQuantity(input.quantity)
  if (!input.unitCode) throw new Error('Wybierz jednostkę.')

  const resolvedProduct = await resolveOrCreateCanonicalProduct({
    ownerId: input.ownerId,
    name: input.productName,
    existingProductId: input.selectedProductId,
    defaultUnitCode: input.unitCode,
  })

  const payload = {
    owner_id: input.ownerId,
    recipe_id: input.recipeId,
    product_id: resolvedProduct.id,
    quantity,
    unit_code: input.unitCode,
    section_label: cleanOptional(input.sectionLabel, 80, 'Nazwa sekcji'),
    note: cleanOptional(input.note, 240, 'Notatka'),
    sort_order: Math.max(0, Math.floor(input.sortOrder)),
  }

  try {
    if (input.ingredientId) {
      const result = await supabase
        .from('recipe_ingredients')
        .update(payload)
        .eq('id', input.ingredientId)
        .eq('recipe_id', input.recipeId)
        .eq('owner_id', input.ownerId)
        .select('id')
        .maybeSingle()

      if (result.error) {
        throw new Error(`Nie udało się zapisać składnika: ${result.error.message}`)
      }
      if (!result.data) throw new Error('Nie znaleziono składnika do zapisania.')
      return { id: result.data.id as string, product: resolvedProduct }
    }

    const result = await supabase
      .from('recipe_ingredients')
      .insert(payload)
      .select('id')
      .single()

    if (result.error) {
      throw new Error(`Nie udało się dodać składnika: ${result.error.message}`)
    }

    return { id: result.data.id as string, product: resolvedProduct }
  } catch (error) {
    if (resolvedProduct.created) {
      await cleanupCreatedCanonicalProduct(input.ownerId, resolvedProduct.id)
    }
    throw error
  }
}

export async function deleteRecipeIngredient(input: {
  ownerId: string
  recipeId: string
  ingredientId: string
}) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('id', input.ingredientId)
    .eq('recipe_id', input.recipeId)
    .eq('owner_id', input.ownerId)
    .select('id')
    .maybeSingle()

  if (result.error) {
    throw new Error(`Nie udało się usunąć składnika: ${result.error.message}`)
  }
  if (!result.data) throw new Error('Nie znaleziono składnika do usunięcia.')
}

export async function reorderRecipeIngredients(input: {
  ownerId: string
  recipeId: string
  ingredientIds: string[]
}) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase.rpc('reorder_recipe_ingredients', {
    p_owner_id: input.ownerId,
    p_recipe_id: input.recipeId,
    p_ingredient_ids: input.ingredientIds,
  })

  if (result.error) {
    throw new Error(`Nie udało się zmienić kolejności składników: ${result.error.message}`)
  }
}
