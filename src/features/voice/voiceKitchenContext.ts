import { loadRecipesReadModel } from '../recipes/recipesReadModel'
import type { RecipesReadModel } from '../recipes/types'
import { loadShoppingReadModel } from '../shopping/shoppingReadModel'
import type { ShoppingReadModel } from '../shopping/types'

export type VoiceKitchenContext = {
  recipes: RecipesReadModel
  shopping: ShoppingReadModel
  loadedAt: string
}

export async function loadVoiceKitchenContext(ownerId: string): Promise<VoiceKitchenContext> {
  const [recipes, shopping] = await Promise.all([
    loadRecipesReadModel(ownerId),
    loadShoppingReadModel(ownerId),
  ])

  return {
    recipes,
    shopping,
    loadedAt: new Date().toISOString(),
  }
}
