import { supabase } from '../../lib/supabase/client'
import {
  cleanupCreatedCanonicalProduct,
  resolveOrCreateCanonicalProduct,
} from '../products/productCatalogMutations'
import { loadMeasurementUnits } from '../measurements/measurementUnits'
import { resolveRecipePackageContent } from '../measurements/packageSemantics'
import { assertValidQuantity } from '../quantity/quantity'
import {
  cleanupUnreferencedRecipeCover,
  flushRecipeImageCleanupQueue,
  uploadRecipeCover,
} from './recipeCoverStorage'
import { parseOptionalRecipeDuration } from './recipeDuration'
import type { ProcessedRecipeImage } from './recipeImageProcessor'
import { validateRecipeSections } from './recipeSections'

export type RecipeCoverChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'replace'; image: ProcessedRecipeImage }

export type RecipeSectionDraftInput = {
  id: string
  name: string
  isPrimary: boolean
}

export type RecipeIngredientDraftInput = {
  id: string
  productId: string | null
  productName: string
  quantity: number
  unitCode: string
  packageContentValue: number | null
  packageContentUnitCode: string | null
  sectionId: string
  note: string
}

export type SaveRecipeSnapshotInput = {
  ownerId: string
  mode: 'create' | 'update'
  recipeId: string | null
  name: string
  servings: number
  prepTimeMinutes: string
  cookTimeMinutes: string
  instructions: string
  coverFocusX: number
  coverFocusY: number
  cover: RecipeCoverChange
  sections: RecipeSectionDraftInput[]
  ingredients: RecipeIngredientDraftInput[]
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

function cleanOptional(value: string, maxLength: number, label: string) {
  const clean = value.trim().replace(/\s+/g, ' ')
  if (!clean) return null
  if (clean.length > maxLength) {
    throw new Error(`${label} może mieć maksymalnie ${maxLength} znaków.`)
  }
  return clean
}

async function cleanupNewProducts(ownerId: string, productIds: string[]) {
  for (const productId of [...productIds].reverse()) {
    await cleanupCreatedCanonicalProduct(ownerId, productId)
  }
}

async function cleanupFailedCover(ownerId: string, coverPath: string | null) {
  if (!coverPath) return
  await cleanupUnreferencedRecipeCover(ownerId, coverPath)
}

export async function saveRecipeSnapshot(input: SaveRecipeSnapshotInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const recipeId = input.mode === 'create'
    ? (input.recipeId ?? crypto.randomUUID())
    : input.recipeId

  if (!recipeId) throw new Error('Brakuje identyfikatora przepisu.')

  const cleanedSections = validateRecipeSections(input.sections)
  const sectionIds = new Set(cleanedSections.map((section) => section.id))
  const createdProductIds: string[] = []
  let uploadedCoverPath: string | null = null

  try {
    const units = await loadMeasurementUnits()
    const resolvedIngredients = [] as Array<{
      id: string
      product_id: string
      quantity: number
      unit_code: string
      package_content_value: number | null
      package_content_unit: string | null
      section_id: string
      note: string | null
    }>

    const seenIngredientIds = new Set<string>()
    for (const ingredient of input.ingredients) {
      if (seenIngredientIds.has(ingredient.id)) {
        throw new Error('Lista składników zawiera zduplikowaną pozycję.')
      }
      seenIngredientIds.add(ingredient.id)

      if (!sectionIds.has(ingredient.sectionId)) {
        throw new Error('Każdy składnik musi należeć do sekcji tego przepisu.')
      }

      const quantity = assertValidQuantity(ingredient.quantity)
      if (!ingredient.unitCode) throw new Error('Wybierz jednostkę składnika.')

      const product = await resolveOrCreateCanonicalProduct({
        ownerId: input.ownerId,
        name: ingredient.productName,
        existingProductId: ingredient.productId,
        defaultUnitCode: ingredient.unitCode,
      })

      if (!product.recipeEligible) {
        if (product.created) createdProductIds.push(product.id)
        throw new Error(`Produkt „${product.name}” jest oznaczony jako Domowe i nie może być składnikiem przepisu.`)
      }

      if (product.created) createdProductIds.push(product.id)

      const hasPackageContentValue = ingredient.packageContentValue !== null
      const hasPackageContentUnit = Boolean(ingredient.packageContentUnitCode)
      if (hasPackageContentValue !== hasPackageContentUnit) {
        throw new Error('Uzupełnij wartość i jednostkę zawartości opakowania albo wyczyść oba pola.')
      }

      const packageContent = resolveRecipePackageContent({
        rowUnitCode: ingredient.unitCode,
        units,
        explicitContent: hasPackageContentValue && ingredient.packageContentUnitCode
          ? { value: ingredient.packageContentValue!, unitCode: ingredient.packageContentUnitCode }
          : null,
        productDefault: product,
        productDefaultUnitCode: product.defaultUnitCode,
      })

      resolvedIngredients.push({
        id: ingredient.id,
        product_id: product.id,
        quantity,
        unit_code: ingredient.unitCode,
        package_content_value: packageContent?.value ?? null,
        package_content_unit: packageContent?.unitCode ?? null,
        section_id: ingredient.sectionId,
        note: cleanOptional(ingredient.note, 240, 'Notatka'),
      })
    }

    if (input.cover.kind === 'replace') {
      uploadedCoverPath = await uploadRecipeCover({
        ownerId: input.ownerId,
        recipeId,
        image: input.cover.image,
      })
    }

    const result = await supabase.rpc('save_recipe_snapshot', {
      p_owner_id: input.ownerId,
      p_recipe_id: recipeId,
      p_mode: input.mode,
      p_name: cleanRecipeName(input.name),
      p_servings: validateRecipeServings(input.servings),
      p_prep_time_minutes: parseOptionalRecipeDuration(input.prepTimeMinutes, 'Czas przygotowania'),
      p_cook_time_minutes: parseOptionalRecipeDuration(input.cookTimeMinutes, 'Czas gotowania / pieczenia'),
      p_instructions: cleanRecipeInstructions(input.instructions),
      p_cover_action: input.cover.kind,
      p_cover_image_path: input.cover.kind === 'replace' ? uploadedCoverPath : null,
      p_cover_focus_x: clampFocus(input.coverFocusX),
      p_cover_focus_y: clampFocus(input.coverFocusY),
      p_sections: cleanedSections.map((section) => ({
        id: section.id,
        name: section.name,
        is_primary: section.isPrimary,
      })),
      p_ingredients: resolvedIngredients,
    })

    if (result.error) {
      throw new Error(`Nie udało się zapisać przepisu: ${result.error.message}`)
    }

    void flushRecipeImageCleanupQueue(input.ownerId)
    return recipeId
  } catch (error) {
    let cleanupFailed = false

    try {
      await cleanupFailedCover(input.ownerId, uploadedCoverPath)
    } catch {
      cleanupFailed = true
    }

    await cleanupNewProducts(input.ownerId, createdProductIds)

    if (cleanupFailed) {
      throw new Error('Nie udało się zapisać przepisu ani zabezpieczyć sprzątania nowego zdjęcia. Odśwież stronę i spróbuj ponownie.')
    }

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

  void flushRecipeImageCleanupQueue(input.ownerId)
}
