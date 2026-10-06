import { toBaseMeasurementQuantity } from '../measurements/measurementConversion.ts'
import type { MeasurementUnit } from '../measurements/measurementUnits.ts'
import { isContainerMeasurementUnit, isDirectMeasurementUnit } from '../measurements/packageSemantics.ts'
import type { ProductIdentityOption } from '../products/productIdentity.ts'
import { scaleRecipeIngredientQuantity } from './recipeServings.ts'

export type RecipeMatchState = 'sufficient' | 'partial' | 'missing' | 'unresolved'

export type RecipeMatchingIngredientInput = {
  id: string
  productId: string
  quantity: number
  unitCode: string
  packageContentValue: number | null
  packageContentUnitCode: string | null
}

export type RecipeMatchingRecipeInput = {
  id: string
  baseServings: number
  targetServings?: number
  ingredients: readonly RecipeMatchingIngredientInput[]
}

export type RecipeMatchingInventoryLotInput = {
  productId: string
  quantity: number
  unitCode: string
  packageContentValue: number | null
  packageContentUnitCode: string | null
}

export type RecipeRequirementGroupResult = {
  key: string
  productId: string
  family: string | null
  ingredientIds: string[]
  state: RecipeMatchState
  requiredBaseQuantity: number | null
  availableBaseQuantity: number | null
  hasUnresolvedPhysicalStock: boolean
}

export type RecipeMatchResult = {
  recipeId: string
  state: RecipeMatchState
  cookable: boolean
  ingredientStates: Record<string, RecipeMatchState>
  groups: RecipeRequirementGroupResult[]
}

type QuantitativeRequirementGroup = {
  key: string
  kind: 'quantity'
  productId: string
  family: string
  ingredientIds: string[]
  requiredBaseQuantity: number
}

type SpiceRequirementGroup = {
  key: string
  kind: 'spice'
  productId: string
  ingredientIds: string[]
}

type UnresolvedRequirementGroup = {
  key: string
  kind: 'unresolved'
  productId: string
  ingredientIds: string[]
}

type RequirementGroup = QuantitativeRequirementGroup | SpiceRequirementGroup | UnresolvedRequirementGroup

type InventoryProductProjection = {
  totalsByFamily: Map<string, number>
  hasUnresolvedPhysicalStock: boolean
  hasAnyPhysicalStock: boolean
}

const COMPARISON_ABSOLUTE_TOLERANCE = 1e-9
const COMPARISON_RELATIVE_TOLERANCE = 1e-12

function comparisonTolerance(required: number) {
  return Math.max(COMPARISON_ABSOLUTE_TOLERANCE, Math.abs(required) * COMPARISON_RELATIVE_TOLERANCE)
}

function addBaseQuantity(current: number, next: number) {
  const total = current + next
  if (!Number.isFinite(total) || total < 0) {
    throw new Error('Recipe matching quantity is outside the supported range.')
  }
  return total
}

function directBaseQuantity(value: number, unitCode: string, units: readonly MeasurementUnit[]) {
  return toBaseMeasurementQuantity(value, unitCode, units)
}

function resolveEffectiveRecipeRequirement(input: {
  ingredient: RecipeMatchingIngredientInput
  baseServings: number
  targetServings: number
  unitByCode: Map<string, MeasurementUnit>
  units: readonly MeasurementUnit[]
}) {
  const rowUnit = input.unitByCode.get(input.ingredient.unitCode)
  if (!rowUnit) return null

  const scaled = scaleRecipeIngredientQuantity({
    baseQuantity: input.ingredient.quantity,
    baseServings: input.baseServings,
    targetServings: input.targetServings,
  }).exact

  if (isDirectMeasurementUnit(rowUnit)) {
    if (input.ingredient.packageContentValue !== null || input.ingredient.packageContentUnitCode !== null) return null
    return {
      family: rowUnit.family,
      baseQuantity: directBaseQuantity(scaled, rowUnit.code, input.units),
    }
  }

  if (!isContainerMeasurementUnit(rowUnit)) return null
  if (input.ingredient.packageContentValue === null || !input.ingredient.packageContentUnitCode) return null

  const contentUnit = input.unitByCode.get(input.ingredient.packageContentUnitCode)
  if (!contentUnit || !isDirectMeasurementUnit(contentUnit)) return null

  return {
    family: contentUnit.family,
    baseQuantity: directBaseQuantity(
      scaled * input.ingredient.packageContentValue,
      contentUnit.code,
      input.units,
    ),
  }
}

function projectInventoryLots(input: {
  lots: readonly RecipeMatchingInventoryLotInput[]
  units: readonly MeasurementUnit[]
}) {
  const unitByCode = new Map(input.units.map((unit) => [unit.code, unit]))
  const byProduct = new Map<string, InventoryProductProjection>()

  for (const lot of input.lots) {
    const current = byProduct.get(lot.productId) ?? {
      totalsByFamily: new Map<string, number>(),
      hasUnresolvedPhysicalStock: false,
      hasAnyPhysicalStock: false,
    }
    current.hasAnyPhysicalStock = true

    const rowUnit = unitByCode.get(lot.unitCode)
    if (!rowUnit) {
      current.hasUnresolvedPhysicalStock = true
      byProduct.set(lot.productId, current)
      continue
    }

    let family: string | null = null
    let baseQuantity: number | null = null

    try {
      if (isDirectMeasurementUnit(rowUnit)) {
        if (lot.packageContentValue !== null || lot.packageContentUnitCode !== null) {
          current.hasUnresolvedPhysicalStock = true
          byProduct.set(lot.productId, current)
          continue
        }
        family = rowUnit.family
        baseQuantity = directBaseQuantity(lot.quantity, rowUnit.code, input.units)
      } else if (isContainerMeasurementUnit(rowUnit)) {
        if (lot.packageContentValue === null || !lot.packageContentUnitCode) {
          current.hasUnresolvedPhysicalStock = true
          byProduct.set(lot.productId, current)
          continue
        }
        const contentUnit = unitByCode.get(lot.packageContentUnitCode)
        if (!contentUnit || !isDirectMeasurementUnit(contentUnit)) {
          current.hasUnresolvedPhysicalStock = true
          byProduct.set(lot.productId, current)
          continue
        }
        family = contentUnit.family
        baseQuantity = directBaseQuantity(lot.quantity * lot.packageContentValue, contentUnit.code, input.units)
      } else {
        current.hasUnresolvedPhysicalStock = true
        byProduct.set(lot.productId, current)
        continue
      }
    } catch {
      current.hasUnresolvedPhysicalStock = true
      byProduct.set(lot.productId, current)
      continue
    }

    current.totalsByFamily.set(
      family,
      addBaseQuantity(current.totalsByFamily.get(family) ?? 0, baseQuantity),
    )
    byProduct.set(lot.productId, current)
  }

  return byProduct
}

function buildRequirementGroups(input: {
  recipe: RecipeMatchingRecipeInput
  products: readonly ProductIdentityOption[]
  units: readonly MeasurementUnit[]
}) {
  const productById = new Map(input.products.map((product) => [product.id, product]))
  const unitByCode = new Map(input.units.map((unit) => [unit.code, unit]))
  const targetServings = input.recipe.targetServings ?? input.recipe.baseServings
  const groups = new Map<string, RequirementGroup>()

  for (const ingredient of input.recipe.ingredients) {
    const product = productById.get(ingredient.productId)
    if (!product || !product.recipeEligible) {
      groups.set(`unresolved:${ingredient.id}`, {
        key: `unresolved:${ingredient.id}`,
        kind: 'unresolved',
        productId: ingredient.productId,
        ingredientIds: [ingredient.id],
      })
      continue
    }

    if (product.inventoryTrackingMode === 'presence') {
      const key = `spice:${product.id}`
      const current = groups.get(key)
      if (current?.kind === 'spice') current.ingredientIds.push(ingredient.id)
      else groups.set(key, { key, kind: 'spice', productId: product.id, ingredientIds: [ingredient.id] })
      continue
    }

    let effective: { family: string; baseQuantity: number } | null = null
    try {
      effective = resolveEffectiveRecipeRequirement({
        ingredient,
        baseServings: input.recipe.baseServings,
        targetServings,
        unitByCode,
        units: input.units,
      })
    } catch {
      effective = null
    }

    if (!effective) {
      groups.set(`unresolved:${ingredient.id}`, {
        key: `unresolved:${ingredient.id}`,
        kind: 'unresolved',
        productId: ingredient.productId,
        ingredientIds: [ingredient.id],
      })
      continue
    }

    const key = `quantity:${product.id}:${effective.family}`
    const current = groups.get(key)
    if (current?.kind === 'quantity') {
      current.ingredientIds.push(ingredient.id)
      current.requiredBaseQuantity = addBaseQuantity(current.requiredBaseQuantity, effective.baseQuantity)
    } else {
      groups.set(key, {
        key,
        kind: 'quantity',
        productId: product.id,
        family: effective.family,
        ingredientIds: [ingredient.id],
        requiredBaseQuantity: effective.baseQuantity,
      })
    }
  }

  return Array.from(groups.values())
}

function resolveRecipeState(groupStates: readonly RecipeMatchState[]): RecipeMatchState {
  if (groupStates.length === 0) return 'unresolved'
  if (groupStates.every((state) => state === 'sufficient')) return 'sufficient'
  if (groupStates.some((state) => state === 'missing')) return 'missing'
  if (groupStates.some((state) => state === 'partial')) return 'partial'
  return 'unresolved'
}

export function matchRecipe(input: {
  recipe: RecipeMatchingRecipeInput
  products: readonly ProductIdentityOption[]
  units: readonly MeasurementUnit[]
  inventoryLots: readonly RecipeMatchingInventoryLotInput[]
}): RecipeMatchResult {
  const productById = new Map(input.products.map((product) => [product.id, product]))
  const inventoryByProduct = projectInventoryLots({ lots: input.inventoryLots, units: input.units })
  const groups = buildRequirementGroups({ recipe: input.recipe, products: input.products, units: input.units })
  const groupResults: RecipeRequirementGroupResult[] = []
  const ingredientStates: Record<string, RecipeMatchState> = {}

  for (const group of groups) {
    let result: RecipeRequirementGroupResult

    if (group.kind === 'unresolved') {
      result = {
        key: group.key,
        productId: group.productId,
        family: null,
        ingredientIds: [...group.ingredientIds],
        state: 'unresolved',
        requiredBaseQuantity: null,
        availableBaseQuantity: null,
        hasUnresolvedPhysicalStock: true,
      }
    } else if (group.kind === 'spice') {
      const product = productById.get(group.productId)
      const inventory = inventoryByProduct.get(group.productId)
      const state: RecipeMatchState = product?.recipeEligible && product.inventoryTrackingMode === 'presence' && inventory?.hasAnyPhysicalStock
        ? 'sufficient'
        : 'missing'
      result = {
        key: group.key,
        productId: group.productId,
        family: null,
        ingredientIds: [...group.ingredientIds],
        state,
        requiredBaseQuantity: null,
        availableBaseQuantity: null,
        hasUnresolvedPhysicalStock: false,
      }
    } else {
      const inventory = inventoryByProduct.get(group.productId)
      const available = inventory?.totalsByFamily.get(group.family) ?? 0
      const hasOtherResolvedFamily = Boolean(inventory && Array.from(inventory.totalsByFamily.entries()).some(
        ([family, quantity]) => family !== group.family && quantity > comparisonTolerance(group.requiredBaseQuantity),
      ))
      const hasUnresolvedPhysicalStock = Boolean(
        inventory?.hasUnresolvedPhysicalStock || hasOtherResolvedFamily,
      )
      const tolerance = comparisonTolerance(group.requiredBaseQuantity)
      const state: RecipeMatchState = available + tolerance >= group.requiredBaseQuantity
        ? 'sufficient'
        : hasUnresolvedPhysicalStock
          ? 'unresolved'
          : available > tolerance
            ? 'partial'
            : 'missing'

      result = {
        key: group.key,
        productId: group.productId,
        family: group.family,
        ingredientIds: [...group.ingredientIds],
        state,
        requiredBaseQuantity: group.requiredBaseQuantity,
        availableBaseQuantity: available,
        hasUnresolvedPhysicalStock,
      }
    }

    groupResults.push(result)
    for (const ingredientId of result.ingredientIds) ingredientStates[ingredientId] = result.state
  }

  const state = resolveRecipeState(groupResults.map((group) => group.state))
  return {
    recipeId: input.recipe.id,
    state,
    cookable: state === 'sufficient',
    ingredientStates,
    groups: groupResults,
  }
}

export function buildRecipeMatchMap(input: {
  recipes: readonly RecipeMatchingRecipeInput[]
  products: readonly ProductIdentityOption[]
  units: readonly MeasurementUnit[]
  inventoryLots: readonly RecipeMatchingInventoryLotInput[]
}) {
  const result = new Map<string, RecipeMatchResult>()
  for (const recipe of input.recipes) {
    const match = matchRecipe({
      recipe,
      products: input.products,
      units: input.units,
      inventoryLots: input.inventoryLots,
    })
    result.set(recipe.id, match)
  }
  return result
}

export function recipeMatchStateLabel(state: RecipeMatchState) {
  if (state === 'sufficient') return 'Wystarczy'
  if (state === 'partial') return 'Częściowo'
  if (state === 'missing') return 'Brak'
  return 'Nieustalone'
}
