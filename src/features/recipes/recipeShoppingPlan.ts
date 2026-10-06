import { normalizeQuantityPrecision, sumQuantities } from '../quantity/quantity.ts'
import type {
  RecipePurchasePlan,
  RecipePurchasePlanningMode,
} from './recipePurchasePlanning.ts'

export type RecipeActiveShoppingItemInput = {
  productId: string
  quantity: number
  unitCode: string
}

export type RecipeShoppingPlanEntryState = 'needs-top-up' | 'covered' | 'blocked'

export type RecipeShoppingPlanEntry = {
  productId: string
  productName: string
  unitCode: string
  purchaseMode: RecipePurchasePlanningMode
  targetQuantity: number
  activeQuantity: number
  topUpQuantity: number | null
  state: RecipeShoppingPlanEntryState
}

export type RecipeShoppingPlan = {
  entries: RecipeShoppingPlanEntry[]
  unresolvedProductIds: string[]
}

type BuildRecipeShoppingPlanInput = {
  purchasePlan: RecipePurchasePlan
  activeShoppingItems: readonly RecipeActiveShoppingItemInput[]
  productIds?: Iterable<string>
}

const WHOLE_UNIT_TOLERANCE = 1e-9

function planKey(productId: string, unitCode: string) {
  return `${productId}\u0000${unitCode}`
}

function isWholeQuantity(value: number) {
  return Math.abs(value - Math.round(value)) <= WHOLE_UNIT_TOLERANCE
}

function sumPositiveQuantities(values: readonly number[], message: string) {
  if (values.length === 0) return 0
  return sumQuantities(values, message)
}

export function buildRecipeShoppingPlan(input: BuildRecipeShoppingPlanInput): RecipeShoppingPlan {
  const allowedProductIds = input.productIds ? new Set(input.productIds) : null
  const unresolvedProductIds = Array.from(new Set(
    input.purchasePlan.groups
      .filter((group) => group.state === 'unresolved')
      .filter((group) => !allowedProductIds || allowedProductIds.has(group.productId))
      .map((group) => group.productId),
  ))
  const unresolvedProductIdSet = new Set(unresolvedProductIds)
  const groupedTargets = new Map<string, {
    productId: string
    productName: string
    unitCode: string
    purchaseMode: RecipePurchasePlanningMode
    quantities: number[]
  }>()

  for (const entry of input.purchasePlan.entries) {
    if (allowedProductIds && !allowedProductIds.has(entry.productId)) continue
    if (unresolvedProductIdSet.has(entry.productId)) continue

    const key = planKey(entry.productId, entry.unitCode)
    const current = groupedTargets.get(key)
    if (current) {
      if (current.purchaseMode !== entry.purchaseMode) {
        throw new Error('Niespójny sposób zakupu dla tego samego produktu i jednostki.')
      }
      current.quantities.push(entry.quantity)
    } else {
      groupedTargets.set(key, {
        productId: entry.productId,
        productName: entry.productName,
        unitCode: entry.unitCode,
        purchaseMode: entry.purchaseMode,
        quantities: [entry.quantity],
      })
    }
  }

  const activeByKey = new Map<string, number[]>()
  for (const item of input.activeShoppingItems) {
    const key = planKey(item.productId, item.unitCode)
    const values = activeByKey.get(key) ?? []
    values.push(item.quantity)
    activeByKey.set(key, values)
  }

  const entries: RecipeShoppingPlanEntry[] = []
  for (const target of groupedTargets.values()) {
    const key = planKey(target.productId, target.unitCode)
    const targetQuantity = sumPositiveQuantities(
      target.quantities,
      `Łączna ilość zakupu produktu „${target.productName}” przekracza dozwolony zakres.`,
    )
    const activeQuantity = sumPositiveQuantities(
      activeByKey.get(key) ?? [],
      `Łączna ilość produktu „${target.productName}” na liście zakupów jest nieprawidłowa.`,
    )

    if (activeQuantity + WHOLE_UNIT_TOLERANCE >= targetQuantity) {
      entries.push({
        productId: target.productId,
        productName: target.productName,
        unitCode: target.unitCode,
        purchaseMode: target.purchaseMode,
        targetQuantity,
        activeQuantity,
        topUpQuantity: 0,
        state: 'covered',
      })
      continue
    }

    const wholeUnitPurchase = target.purchaseMode === 'container' || target.purchaseMode === 'count-pack'
    if (wholeUnitPurchase && activeQuantity > 0 && !isWholeQuantity(activeQuantity)) {
      entries.push({
        productId: target.productId,
        productName: target.productName,
        unitCode: target.unitCode,
        purchaseMode: target.purchaseMode,
        targetQuantity,
        activeQuantity,
        topUpQuantity: null,
        state: 'blocked',
      })
      continue
    }

    const topUpQuantity = normalizeQuantityPrecision(targetQuantity - activeQuantity)
    if (topUpQuantity <= 0 || (wholeUnitPurchase && !isWholeQuantity(topUpQuantity))) {
      entries.push({
        productId: target.productId,
        productName: target.productName,
        unitCode: target.unitCode,
        purchaseMode: target.purchaseMode,
        targetQuantity,
        activeQuantity,
        topUpQuantity: null,
        state: 'blocked',
      })
      continue
    }

    entries.push({
      productId: target.productId,
      productName: target.productName,
      unitCode: target.unitCode,
      purchaseMode: target.purchaseMode,
      targetQuantity,
      activeQuantity,
      topUpQuantity,
      state: 'needs-top-up',
    })
  }

  return { entries, unresolvedProductIds }
}

export function getRecipeShoppingActionProductIds(plan: RecipeShoppingPlan) {
  return Array.from(new Set(
    plan.entries
      .filter((entry) => entry.state === 'needs-top-up')
      .map((entry) => entry.productId),
  ))
}

export function getRecipeShoppingListedProductIds(plan: RecipeShoppingPlan) {
  return Array.from(new Set(
    plan.entries
      .filter((entry) => entry.activeQuantity > 0)
      .map((entry) => entry.productId),
  ))
}

export function getRecipeShoppingBlockedProductIds(plan: RecipeShoppingPlan) {
  return Array.from(new Set(
    plan.entries
      .filter((entry) => entry.state === 'blocked')
      .map((entry) => entry.productId),
  ))
}
