import { assertValidQuantity, normalizeQuantityPrecision } from '../quantity/quantity'
import { scaleRecipeIngredientQuantity } from './recipeServings'
import type { RecipeIngredientRead } from './types'

export type RecipeShoppingPlanEntry = {
  productId: string
  productName: string
  unitCode: string
  quantity: number
}

type BuildRecipeShoppingPlanInput = {
  ingredients: RecipeIngredientRead[]
  baseServings: number
  targetServings: number
  productIds?: Iterable<string>
}

const MIN_POSITIVE_SHOPPING_QUANTITY = 0.001

function planKey(productId: string, unitCode: string) {
  return `${productId}\u0000${unitCode}`
}

export function buildRecipeShoppingPlan(input: BuildRecipeShoppingPlanInput): RecipeShoppingPlanEntry[] {
  const allowedProductIds = input.productIds ? new Set(input.productIds) : null
  const grouped = new Map<string, RecipeShoppingPlanEntry & { exactQuantity: number }>()

  for (const ingredient of input.ingredients) {
    if (ingredient.presence !== 'missing') continue
    if (allowedProductIds && !allowedProductIds.has(ingredient.productId)) continue

    const productId = ingredient.productId.trim()
    const productName = ingredient.productName.trim()
    const unitCode = ingredient.unitCode.trim()

    if (!productId || !productName || !unitCode) {
      throw new Error('Nie udało się przygotować brakującego składnika do listy zakupów.')
    }

    const scaled = scaleRecipeIngredientQuantity({
      baseQuantity: ingredient.quantity,
      baseServings: input.baseServings,
      targetServings: input.targetServings,
    })

    const key = planKey(productId, unitCode)
    const current = grouped.get(key)

    if (current) {
      current.exactQuantity += scaled.exact
    } else {
      grouped.set(key, {
        productId,
        productName,
        unitCode,
        quantity: 0,
        exactQuantity: scaled.exact,
      })
    }
  }

  return Array.from(grouped.values()).map(({ exactQuantity, ...entry }) => {
    const rounded = normalizeQuantityPrecision(exactQuantity)
    const quantity = rounded > 0 ? rounded : MIN_POSITIVE_SHOPPING_QUANTITY

    return {
      ...entry,
      quantity: assertValidQuantity(
        quantity,
        `Ilość produktu „${entry.productName}” jest poza dozwolonym zakresem listy zakupów.`,
      ),
    }
  })
}

export function getMissingRecipeProductIds(ingredients: RecipeIngredientRead[]) {
  return Array.from(new Set(
    ingredients
      .filter((ingredient) => ingredient.presence === 'missing')
      .map((ingredient) => ingredient.productId),
  ))
}
