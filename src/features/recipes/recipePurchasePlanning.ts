import { fromBaseMeasurementQuantity, toBaseMeasurementQuantity } from '../measurements/measurementConversion.ts'
import type { MeasurementUnit } from '../measurements/measurementUnits.ts'
import { isContainerMeasurementUnit, isDirectMeasurementUnit } from '../measurements/packageSemantics.ts'
import type { ProductIdentityOption } from '../products/productIdentity.ts'
import { assertValidQuantity, QUANTITY_SCALE } from '../quantity/quantity.ts'
import type { RecipeMatchResult, RecipeRequirementGroupResult } from './recipeMatching.ts'

export type RecipePurchasePlanningMode = 'direct' | 'count-pack' | 'container'
export type RecipePurchasePlanningState = 'planned' | 'not-needed' | 'excluded' | 'unresolved'
export type RecipePurchasePlanningReason =
  | 'sufficient'
  | 'presence-tracked-product'
  | 'matcher-unresolved'
  | 'product-not-found'
  | 'product-not-recipe-eligible'
  | 'unknown-default-unit'
  | 'unsupported-default-unit'
  | 'invalid-shortage'
  | 'ambiguous-direct-package-content'
  | 'missing-package-content'
  | 'invalid-package-content-unit'
  | 'purchase-family-mismatch'

export type RecipePurchasePlanEntry = {
  groupKey: string
  productId: string
  productName: string
  purchaseMode: RecipePurchasePlanningMode
  unitCode: string
  quantity: number
  shortageBaseQuantity: number
}

export type RecipePurchasePlanningGroupResult = {
  groupKey: string
  productId: string
  ingredientIds: string[]
  shortageFamily: string | null
  shortageBaseQuantity: number | null
  state: RecipePurchasePlanningState
  reason: RecipePurchasePlanningReason | null
  entry: RecipePurchasePlanEntry | null
}

export type RecipePurchasePlan = {
  recipeId: string
  groups: RecipePurchasePlanningGroupResult[]
  entries: RecipePurchasePlanEntry[]
  hasUnresolved: boolean
}

const WHOLE_UNIT_TOLERANCE = 1e-9
const PRECISION_TOLERANCE = 1e-7

function findUnit(unitCode: string, units: readonly MeasurementUnit[]) {
  return units.find((unit) => unit.code === unitCode) ?? null
}

function hasCompletePackageContent(product: ProductIdentityOption) {
  return product.packageContentValue !== null && Boolean(product.packageContentUnitCode)
}

function ceilWholeUnits(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Nieprawidłowa ilość zakupu.')
  const nearest = Math.round(value)
  const whole = Math.abs(value - nearest) <= WHOLE_UNIT_TOLERANCE ? nearest : Math.ceil(value)
  return assertValidQuantity(whole, 'Ilość zakupu przekracza obsługiwany zakres.')
}

function ceilShoppingPrecision(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Nieprawidłowa ilość zakupu.')

  const scaled = value * QUANTITY_SCALE
  const nearest = Math.round(scaled)
  const ticks = Math.abs(scaled - nearest) <= PRECISION_TOLERANCE
    ? nearest
    : Math.ceil(scaled)

  return assertValidQuantity(
    ticks / QUANTITY_SCALE,
    'Ilość zakupu przekracza obsługiwany zakres.',
  )
}

function unresolved(
  group: RecipeRequirementGroupResult,
  reason: RecipePurchasePlanningReason,
  shortageBaseQuantity: number | null,
): RecipePurchasePlanningGroupResult {
  return {
    groupKey: group.key,
    productId: group.productId,
    ingredientIds: [...group.ingredientIds],
    shortageFamily: group.family,
    shortageBaseQuantity,
    state: 'unresolved',
    reason,
    entry: null,
  }
}

function buildEntryResult(input: {
  group: RecipeRequirementGroupResult
  product: ProductIdentityOption
  shortageBaseQuantity: number
  purchaseMode: RecipePurchasePlanningMode
  unitCode: string
  quantity: number
}): RecipePurchasePlanningGroupResult {
  const entry: RecipePurchasePlanEntry = {
    groupKey: input.group.key,
    productId: input.product.id,
    productName: input.product.name,
    purchaseMode: input.purchaseMode,
    unitCode: input.unitCode,
    quantity: input.quantity,
    shortageBaseQuantity: input.shortageBaseQuantity,
  }

  return {
    groupKey: input.group.key,
    productId: input.group.productId,
    ingredientIds: [...input.group.ingredientIds],
    shortageFamily: input.group.family,
    shortageBaseQuantity: input.shortageBaseQuantity,
    state: 'planned',
    reason: null,
    entry,
  }
}

function resolveQuantitativeGroup(input: {
  group: RecipeRequirementGroupResult
  product: ProductIdentityOption
  units: readonly MeasurementUnit[]
}): RecipePurchasePlanningGroupResult {
  const { group, product, units } = input

  if (group.state === 'sufficient') {
    return {
      groupKey: group.key,
      productId: group.productId,
      ingredientIds: [...group.ingredientIds],
      shortageFamily: group.family,
      shortageBaseQuantity: 0,
      state: 'not-needed',
      reason: 'sufficient',
      entry: null,
    }
  }

  if (
    group.state === 'unresolved'
    || !group.family
    || group.requiredBaseQuantity === null
    || group.availableBaseQuantity === null
  ) {
    return unresolved(group, 'matcher-unresolved', null)
  }

  const shortageBaseQuantity = Math.max(
    group.requiredBaseQuantity - group.availableBaseQuantity,
    0,
  )

  if (!Number.isFinite(shortageBaseQuantity)) {
    return unresolved(group, 'invalid-shortage', null)
  }

  if (shortageBaseQuantity <= WHOLE_UNIT_TOLERANCE) {
    return {
      groupKey: group.key,
      productId: group.productId,
      ingredientIds: [...group.ingredientIds],
      shortageFamily: group.family,
      shortageBaseQuantity: 0,
      state: 'not-needed',
      reason: 'sufficient',
      entry: null,
    }
  }

  const defaultUnit = findUnit(product.defaultUnitCode, units)
  if (!defaultUnit) return unresolved(group, 'unknown-default-unit', shortageBaseQuantity)

  const hasPackageContent = hasCompletePackageContent(product)
  const partialPackageContent = (product.packageContentValue === null) !== (product.packageContentUnitCode === null)
  if (partialPackageContent) return unresolved(group, 'missing-package-content', shortageBaseQuantity)

  if (isDirectMeasurementUnit(defaultUnit)) {
    if ((defaultUnit.family === 'mass' || defaultUnit.family === 'volume') && hasPackageContent) {
      return unresolved(group, 'ambiguous-direct-package-content', shortageBaseQuantity)
    }

    if (defaultUnit.family === 'count' && hasPackageContent) {
      const contentUnit = findUnit(product.packageContentUnitCode!, units)
      if (!contentUnit || !isDirectMeasurementUnit(contentUnit)) {
        return unresolved(group, 'invalid-package-content-unit', shortageBaseQuantity)
      }

      if (contentUnit.family === group.family) {
        try {
          const packageBaseQuantity = toBaseMeasurementQuantity(
            product.packageContentValue!,
            contentUnit.code,
            units,
          )
          return buildEntryResult({
            group,
            product,
            shortageBaseQuantity,
            purchaseMode: 'count-pack',
            unitCode: defaultUnit.code,
            quantity: ceilWholeUnits(shortageBaseQuantity / packageBaseQuantity),
          })
        } catch {
          return unresolved(group, 'invalid-package-content-unit', shortageBaseQuantity)
        }
      }
    }

    if (defaultUnit.family === group.family) {
      try {
        const directQuantity = fromBaseMeasurementQuantity(shortageBaseQuantity, defaultUnit.code, units)
        return buildEntryResult({
          group,
          product,
          shortageBaseQuantity,
          purchaseMode: 'direct',
          unitCode: defaultUnit.code,
          quantity: ceilShoppingPrecision(directQuantity),
        })
      } catch {
        return unresolved(group, 'invalid-shortage', shortageBaseQuantity)
      }
    }

    return unresolved(group, 'purchase-family-mismatch', shortageBaseQuantity)
  }

  if (!isContainerMeasurementUnit(defaultUnit)) {
    return unresolved(group, 'unsupported-default-unit', shortageBaseQuantity)
  }

  if (!hasPackageContent) return unresolved(group, 'missing-package-content', shortageBaseQuantity)

  const contentUnit = findUnit(product.packageContentUnitCode!, units)
  if (!contentUnit || !isDirectMeasurementUnit(contentUnit)) {
    return unresolved(group, 'invalid-package-content-unit', shortageBaseQuantity)
  }
  if (contentUnit.family !== group.family) {
    return unresolved(group, 'purchase-family-mismatch', shortageBaseQuantity)
  }

  try {
    const packageBaseQuantity = toBaseMeasurementQuantity(
      product.packageContentValue!,
      contentUnit.code,
      units,
    )
    return buildEntryResult({
      group,
      product,
      shortageBaseQuantity,
      purchaseMode: 'container',
      unitCode: defaultUnit.code,
      quantity: ceilWholeUnits(shortageBaseQuantity / packageBaseQuantity),
    })
  } catch {
    return unresolved(group, 'invalid-package-content-unit', shortageBaseQuantity)
  }
}

export function buildRecipePurchasePlan(input: {
  match: RecipeMatchResult
  products: readonly ProductIdentityOption[]
  units: readonly MeasurementUnit[]
}): RecipePurchasePlan {
  const productById = new Map(input.products.map((product) => [product.id, product]))
  const groups: RecipePurchasePlanningGroupResult[] = []

  for (const group of input.match.groups) {
    const product = productById.get(group.productId)
    if (!product) {
      groups.push(unresolved(group, 'product-not-found', null))
      continue
    }
    if (!product.recipeEligible) {
      groups.push(unresolved(group, 'product-not-recipe-eligible', null))
      continue
    }
    if (product.inventoryTrackingMode === 'presence') {
      groups.push({
        groupKey: group.key,
        productId: group.productId,
        ingredientIds: [...group.ingredientIds],
        shortageFamily: group.family,
        shortageBaseQuantity: null,
        state: 'excluded',
        reason: 'presence-tracked-product',
        entry: null,
      })
      continue
    }

    groups.push(resolveQuantitativeGroup({ group, product, units: input.units }))
  }

  return {
    recipeId: input.match.recipeId,
    groups,
    entries: groups.flatMap((group) => group.entry ? [group.entry] : []),
    hasUnresolved: groups.some((group) => group.state === 'unresolved'),
  }
}
