export type RecipeIngredientRead = {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCode: string
  unitSymbol: string
  sortOrder: number
  note: string | null
}

export type RecipeReadItem = {
  id: string
  name: string
  servings: number
  instructions: string | null
  updatedAt: string
  ingredients: RecipeIngredientRead[]
}

export type RecipesReadModel = {
  recipes: RecipeReadItem[]
}
