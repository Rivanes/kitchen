import { KitchenIcon } from '../../components/KitchenIcon'
import {
  RECIPE_SERVINGS_MAX,
  RECIPE_SERVINGS_MIN,
  clampRecipeServings,
} from './recipeServings'

type RecipeServingsControlProps = {
  baseServings: number
  value: number
  onChange: (value: number) => void
}

export function RecipeServingsControl({
  baseServings,
  value,
  onChange,
}: RecipeServingsControlProps) {
  const servings = clampRecipeServings(value)
  const base = clampRecipeServings(baseServings)
  const changed = servings !== base

  return (
    <div className="recipe-servings-preview" aria-label="Przelicz porcje">
      <span className="recipe-servings-label">Porcje</span>

      <div className="recipe-servings-stepper">
        <button
          type="button"
          onClick={() => onChange(servings - 1)}
          disabled={servings <= RECIPE_SERVINGS_MIN}
          aria-label="Zmniejsz liczbę porcji"
        >
          <KitchenIcon name="minus" size={17} />
        </button>

        <strong aria-live="polite">{servings}</strong>

        <button
          type="button"
          onClick={() => onChange(servings + 1)}
          disabled={servings >= RECIPE_SERVINGS_MAX}
          aria-label="Zwiększ liczbę porcji"
        >
          <KitchenIcon name="plus" size={17} />
        </button>
      </div>

      {changed && (
        <button
          className="recipe-servings-reset"
          type="button"
          onClick={() => onChange(base)}
        >
          Przywróć {base}
        </button>
      )}
    </div>
  )
}
