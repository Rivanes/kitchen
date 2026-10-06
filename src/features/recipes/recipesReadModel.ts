import { supabase } from '../../lib/supabase/client'
import { isContainerMeasurementUnit, isDirectMeasurementUnit } from '../measurements/packageSemantics'
import { readStoredQuantity } from '../quantity/quantity'
import { loadInventoryReadModel } from '../inventory/inventoryReadModel'
import { assertRecipeCategoryCode } from './recipeCategories'
import { createRecipeCoverSignedUrl } from './recipeCoverStorage'
import { readStoredRecipeDuration } from './recipeDuration'
import type {
  RecipeIngredientPresence,
  RecipeIngredientRead,
  RecipeReadItem,
  RecipeSectionRead,
  RecipesReadModel,
} from './types'

type RawRecipe = {
  id: string
  name: string
  category_code: string
  servings: number
  prep_time_minutes: number | string | null
  cook_time_minutes: number | string | null
  instructions: string | null
  cover_image_path: string | null
  cover_focus_x: number | string
  cover_focus_y: number | string
  updated_at: string
}

type RawRecipeSection = {
  id: string
  recipe_id: string
  name: string
  sort_order: number
  is_primary: boolean
  created_at: string
}

type RawRecipeIngredient = {
  id: string
  recipe_id: string
  product_id: string
  quantity: number | string
  unit_code: string
  package_content_value: number | string | null
  package_content_unit: string | null
  sort_order: number
  section_id: string
  note: string | null
  created_at: string
}

type RawShoppingPresence = {
  product_id: string | null
}

function assertNoQueryError(error: { message: string } | null, resource: string) {
  if (error) {
    throw new Error(`Recipes read failed for ${resource}: ${error.message}`)
  }
}

function compareSections(a: RecipeSectionRead & { createdAt: string }, b: RecipeSectionRead & { createdAt: string }) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder

  const timeDelta = Date.parse(a.createdAt) - Date.parse(b.createdAt)
  if (timeDelta !== 0) return timeDelta

  return a.id.localeCompare(b.id)
}

function compareIngredients(a: RecipeIngredientRead & { createdAt: string }, b: RecipeIngredientRead & { createdAt: string }) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder

  const timeDelta = Date.parse(a.createdAt) - Date.parse(b.createdAt)
  if (timeDelta !== 0) return timeDelta

  return a.id.localeCompare(b.id)
}

function resolveIngredientPresence(
  productId: string,
  inventoryProductIds: Set<string>,
  activeShoppingProductIds: Set<string>,
): RecipeIngredientPresence {
  if (inventoryProductIds.has(productId)) return 'inventory'
  if (activeShoppingProductIds.has(productId)) return 'shopping'
  return 'missing'
}

export async function loadRecipesReadModel(ownerId: string): Promise<RecipesReadModel> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const recipesResult = await supabase
    .from('recipes')
    .select('id, name, category_code, servings, prep_time_minutes, cook_time_minutes, instructions, cover_image_path, cover_focus_x, cover_focus_y, updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  assertNoQueryError(recipesResult.error, 'recipes')

  const rawRecipes = (recipesResult.data ?? []) as RawRecipe[]
  if (rawRecipes.length === 0) return { recipes: [], inventory: await loadInventoryReadModel(ownerId) }

  const [sectionsResult, ingredientsResult, inventoryModel, shoppingPresenceResult] = await Promise.all([
    supabase
      .from('recipe_sections')
      .select('id, recipe_id, name, sort_order, is_primary, created_at')
      .eq('owner_id', ownerId),
    supabase
      .from('recipe_ingredients')
      .select('id, recipe_id, product_id, quantity, unit_code, package_content_value, package_content_unit, sort_order, section_id, note, created_at')
      .eq('owner_id', ownerId),
    loadInventoryReadModel(ownerId),
    supabase
      .from('shopping_items')
      .select('product_id')
      .eq('owner_id', ownerId)
      .eq('is_purchased', false),
  ])

  assertNoQueryError(sectionsResult.error, 'recipe_sections')
  assertNoQueryError(ingredientsResult.error, 'recipe_ingredients')
  assertNoQueryError(shoppingPresenceResult.error, 'shopping_items presence')

  const recipeIds = new Set(rawRecipes.map((recipe) => recipe.id))
  const products = inventoryModel.products
  const units = inventoryModel.units
  const productById = new Map(products.map((product) => [product.id, product]))
  const unitByCode = new Map(units.map((unit) => [unit.code, unit]))
  const inventoryProductIds = new Set<string>()
  for (const group of inventoryModel.groups) {
    for (const lot of group.lots) inventoryProductIds.add(lot.productId)
    for (const resource of group.resources) {
      if (group.location.kind === 'spices' && resource.present) inventoryProductIds.add(resource.product.id)
    }
  }
  const activeShoppingProductIds = new Set(
    ((shoppingPresenceResult.data ?? []) as RawShoppingPresence[])
      .map((row) => row.product_id)
      .filter((productId): productId is string => Boolean(productId)),
  )

  const sectionsByRecipe = new Map<string, Array<RecipeSectionRead & { createdAt: string }>>()
  const sectionById = new Map<string, { recipeId: string; section: RecipeSectionRead }>()

  for (const row of (sectionsResult.data ?? []) as RawRecipeSection[]) {
    if (!recipeIds.has(row.recipe_id)) {
      throw new Error('Recipes read returned a section for an unresolved Recipe.')
    }

    const section: RecipeSectionRead & { createdAt: string } = {
      id: row.id,
      name: row.name.trim(),
      sortOrder: row.sort_order,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    }

    const recipeSections = sectionsByRecipe.get(row.recipe_id) ?? []
    recipeSections.push(section)
    sectionsByRecipe.set(row.recipe_id, recipeSections)
    sectionById.set(row.id, { recipeId: row.recipe_id, section })
  }

  for (const recipe of rawRecipes) {
    const sections = sectionsByRecipe.get(recipe.id) ?? []
    sections.sort(compareSections)

    if (sections.length === 0) {
      throw new Error('Recipes read returned a Recipe without its mandatory primary section.')
    }

    const primarySections = sections.filter((section) => section.isPrimary)
    if (primarySections.length !== 1 || !sections[0].isPrimary || sections[0].sortOrder !== 0) {
      throw new Error('Recipes read returned an invalid Recipe section structure.')
    }
  }

  const ingredientsByRecipe = new Map<string, Array<RecipeIngredientRead & { createdAt: string }>>()

  for (const row of (ingredientsResult.data ?? []) as RawRecipeIngredient[]) {
    if (!recipeIds.has(row.recipe_id)) {
      throw new Error('Recipes read returned an ingredient for an unresolved Recipe.')
    }

    const sectionEntry = sectionById.get(row.section_id)
    if (!sectionEntry || sectionEntry.recipeId !== row.recipe_id) {
      throw new Error('Recipes read returned an ingredient with an unresolved Recipe section.')
    }

    const product = productById.get(row.product_id)
    if (!product) {
      throw new Error('Recipes read returned an ingredient with an unresolved canonical Product.')
    }

    const unit = unitByCode.get(row.unit_code)
    if (!unit) {
      throw new Error('Recipes read returned an ingredient with an unresolved Measurement Unit.')
    }

    const packageContentValue = row.package_content_value === null
      ? null
      : readStoredQuantity(row.package_content_value, 'Recipes read returned an invalid package-content snapshot.')

    if ((packageContentValue === null) !== (row.package_content_unit === null)) {
      throw new Error('Recipes read returned an inconsistent package-content snapshot.')
    }

    if (isDirectMeasurementUnit(unit)) {
      if (packageContentValue !== null) {
        throw new Error('Recipes read returned package content for a direct ingredient unit.')
      }
    } else if (isContainerMeasurementUnit(unit)) {
      if (packageContentValue === null || !row.package_content_unit) {
        throw new Error('Recipes read returned an unresolved container ingredient.')
      }
      const contentUnit = unitByCode.get(row.package_content_unit)
      if (!isDirectMeasurementUnit(contentUnit)) {
        throw new Error('Recipes read returned an invalid package-content unit.')
      }
    } else {
      throw new Error('Recipes read returned an unsupported Measurement Unit family.')
    }

    const ingredient: RecipeIngredientRead & { createdAt: string } = {
      id: row.id,
      productId: row.product_id,
      productName: product.name,
      quantity: readStoredQuantity(row.quantity, 'Recipes read returned an invalid ingredient quantity.'),
      unitCode: unit.code,
      unitSymbol: unit.symbol,
      packageContentValue,
      packageContentUnitCode: row.package_content_unit,
      sortOrder: row.sort_order,
      sectionId: row.section_id,
      note: row.note?.trim() || null,
      presence: resolveIngredientPresence(row.product_id, inventoryProductIds, activeShoppingProductIds),
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
    categoryCode: assertRecipeCategoryCode(recipe.category_code),
    servings: recipe.servings,
    prepTimeMinutes: readStoredRecipeDuration(recipe.prep_time_minutes, 'Czas przygotowania'),
    cookTimeMinutes: readStoredRecipeDuration(recipe.cook_time_minutes, 'Czas gotowania / pieczenia'),
    instructions: recipe.instructions?.trim() || null,
    coverImagePath: recipe.cover_image_path,
    coverImageUrl: coverUrls.get(recipe.id) ?? null,
    coverFocusX: Number(recipe.cover_focus_x),
    coverFocusY: Number(recipe.cover_focus_y),
    updatedAt: recipe.updated_at,
    sections: (sectionsByRecipe.get(recipe.id) ?? []).map(({ createdAt: _createdAt, ...section }) => section),
    ingredients: (ingredientsByRecipe.get(recipe.id) ?? []).map(({ createdAt: _createdAt, ...ingredient }) => ingredient),
  }))

  return { recipes, inventory: inventoryModel }
}
