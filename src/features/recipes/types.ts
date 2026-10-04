export type RecipeIngredientRead = {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCode: string
  unitSymbol: string
  sortOrder: number
  sectionLabel: string | null
  note: string | null
}

export type RecipeReadItem = {
  id: string
  name: string
  servings: number
  instructions: string | null
  coverImagePath: string | null
  coverImageUrl: string | null
  coverFocusX: number
  coverFocusY: number
  updatedAt: string
  ingredients: RecipeIngredientRead[]
}

export type RecipesReadModel = {
  recipes: RecipeReadItem[]
}
