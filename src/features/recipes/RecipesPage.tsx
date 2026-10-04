import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { formatQuantity } from '../quantity/quantity'
import { loadRecipesReadModel } from './recipesReadModel'
import type { RecipeReadItem, RecipesReadModel } from './types'

type RecipesPageProps = {
  ownerId: string
  overviewRequestToken: number
}

type RecipesStatus =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: RecipesReadModel }
  | { status: 'error'; model: null }

function recipesLabel(count: number) {
  if (count === 1) return '1 przepis'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${count} przepisy`
  }
  return `${count} przepisów`
}

function servingsLabel(count: number) {
  if (count === 1) return '1 porcja'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${count} porcje`
  }
  return `${count} porcji`
}

function ingredientsLabel(count: number) {
  if (count === 1) return '1 składnik'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${count} składniki`
  }
  return `${count} składników`
}

export function RecipesPage({ ownerId, overviewRequestToken }: RecipesPageProps) {
  const [recipesStatus, setRecipesStatus] = useState<RecipesStatus>({ status: 'loading', model: null })
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRecipesStatus({ status: 'loading', model: null })
    try {
      const model = await loadRecipesReadModel(ownerId)
      setRecipesStatus({ status: 'ready', model })
      setSelectedRecipeId((currentId) => (
        currentId && model.recipes.some((recipe) => recipe.id === currentId)
          ? currentId
          : null
      ))
    } catch {
      setRecipesStatus({ status: 'error', model: null })
    }
  }, [ownerId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (overviewRequestToken <= 0) return
    setSelectedRecipeId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [overviewRequestToken])

  const model = recipesStatus.status === 'ready' ? recipesStatus.model : null
  const selectedRecipe = useMemo(
    () => model?.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [model, selectedRecipeId],
  )

  function openRecipe(recipe: RecipeReadItem) {
    setSelectedRecipeId(recipe.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeRecipe() {
    setSelectedRecipeId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (selectedRecipe) {
    return (
      <section className="recipes-page recipe-detail-page" aria-label={`Przepis ${selectedRecipe.name}`}>
        <div className="recipe-detail-heading">
          <button className="icon-button" type="button" onClick={closeRecipe} aria-label="Wróć do listy przepisów" title="Wróć">
            <KitchenIcon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">Przepis</p>
            <h1>{selectedRecipe.name}</h1>
          </div>
        </div>

        <section className="recipe-detail-summary" aria-label="Podsumowanie przepisu">
          <span className="recipe-detail-summary-icon" aria-hidden="true"><KitchenIcon name="recipes" size={22} /></span>
          <div className="recipe-detail-meta">
            <span>{servingsLabel(selectedRecipe.servings)}</span>
            <span>{ingredientsLabel(selectedRecipe.ingredients.length)}</span>
          </div>
        </section>

        <section className="recipe-detail-section" aria-labelledby="recipe-ingredients-title">
          <div className="recipe-detail-section-heading">
            <span className="recipe-detail-section-icon" aria-hidden="true"><KitchenIcon name="inventory" size={18} /></span>
            <h2 id="recipe-ingredients-title">Składniki</h2>
          </div>

          {selectedRecipe.ingredients.length > 0 ? (
            <ul className="recipe-ingredient-list">
              {selectedRecipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="recipe-ingredient-row">
                  <span className="recipe-ingredient-index" aria-hidden="true" />
                  <span className="recipe-ingredient-copy">
                    <strong>{ingredient.productName}</strong>
                    {ingredient.note && <small>{ingredient.note}</small>}
                  </span>
                  <span className="recipe-ingredient-quantity">
                    {formatQuantity(ingredient.quantity)} {ingredient.unitSymbol}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="recipe-detail-muted">Ten przepis nie ma jeszcze składników.</p>
          )}
        </section>

        <section className="recipe-detail-section" aria-labelledby="recipe-instructions-title">
          <div className="recipe-detail-section-heading">
            <span className="recipe-detail-section-icon" aria-hidden="true"><KitchenIcon name="recipes" size={18} /></span>
            <h2 id="recipe-instructions-title">Przygotowanie</h2>
          </div>
          {selectedRecipe.instructions ? (
            <p className="recipe-instructions">{selectedRecipe.instructions}</p>
          ) : (
            <p className="recipe-detail-muted">Ten przepis nie ma jeszcze instrukcji przygotowania.</p>
          )}
        </section>
      </section>
    )
  }

  return (
    <section className="recipes-page" aria-label="Przepisy">
      <div className="recipes-page-heading">
        <div>
          <p className="eyebrow">Twoja książka kucharska</p>
          <h1>Przepisy</h1>
          {model && model.recipes.length > 0 && <p>{recipesLabel(model.recipes.length)}</p>}
          {model && model.recipes.length === 0 && <p>Zapisane przepisy pojawią się tutaj.</p>}
        </div>
        <button className="icon-button" type="button" onClick={() => void load()} aria-label="Odśwież przepisy" title="Odśwież">
          <KitchenIcon name="refresh" />
        </button>
      </div>

      {recipesStatus.status === 'loading' && (
        <section className="recipes-state-card" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <strong>Ładuję przepisy…</strong>
        </section>
      )}

      {recipesStatus.status === 'error' && (
        <section className="recipes-state-card recipes-state-error">
          <KitchenIcon name="recipes" size={24} />
          <strong>Nie udało się wczytać przepisów.</strong>
          <button className="secondary-button compact-button" type="button" onClick={() => void load()}>
            Spróbuj ponownie
          </button>
        </section>
      )}

      {model && model.recipes.length === 0 && (
        <section className="recipes-empty-card">
          <span className="recipes-empty-icon" aria-hidden="true"><KitchenIcon name="recipes" size={23} /></span>
          <div>
            <strong>Tu pojawią się Twoje przepisy</strong>
            <span>Każdy przepis pokaże porcje, składniki i sposób przygotowania.</span>
          </div>
        </section>
      )}

      {model && model.recipes.length > 0 && (
        <div className="recipes-list-card">
          <ul className="recipes-list">
            {model.recipes.map((recipe) => (
              <li key={recipe.id}>
                <button className="recipe-row" type="button" onClick={() => openRecipe(recipe)}>
                  <span className="recipe-row-icon" aria-hidden="true"><KitchenIcon name="recipes" size={19} /></span>
                  <span className="recipe-row-copy">
                    <strong>{recipe.name}</strong>
                    <small>{servingsLabel(recipe.servings)} · {ingredientsLabel(recipe.ingredients.length)}</small>
                  </span>
                  <KitchenIcon name="chevronRight" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
