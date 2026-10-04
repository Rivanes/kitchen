export type RecipeIngredientPresence = 'inventory' | 'shopping' | 'missing'

export type RecipeSectionRead = {
  id: string
  name: string
  sortOrder: number
  isPrimary: boolean
}

export type RecipeIngredientRead = {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCode: string
  unitSymbol: string
  sortOrder: number
  sectionId: string
  note: string | null
  presence: RecipeIngredientPresence
}

export type RecipeReadItem = {
  id: string
  name: string
  servings: number
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  instructions: string | null
  coverImagePath: string | null
  coverImageUrl: string | null
  coverFocusX: number
  coverFocusY: number
  updatedAt: string
  sections: RecipeSectionRead[]
  ingredients: RecipeIngredientRead[]
}

export type RecipesReadModel = {
  recipes: RecipeReadItem[]
}
