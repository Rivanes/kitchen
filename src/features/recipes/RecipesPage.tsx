import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { formatQuantity } from '../quantity/quantity'
import { RecipeCoverImage } from './RecipeCoverImage'
import { RECIPE_COVER_HERO_ASPECT, RECIPE_COVER_THUMBNAIL_ASPECT } from './recipeCoverCrop'
import { RecipeEditor } from './RecipeEditor'
import { flushRecipeImageCleanupQueue } from './recipeCoverStorage'
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

type EditorMode =
  | { kind: 'create' }
  | { kind: 'edit'; recipe: RecipeReadItem }
  | null

function recipesLabel(count: number) {
  if (count === 1) return '1 przepis'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${count} przepisy`
  return `${count} przepisów`
}

function servingsLabel(count: number) {
  if (count === 1) return '1 porcja'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${count} porcje`
  return `${count} porcji`
}

function ingredientsLabel(count: number) {
  if (count === 1) return '1 składnik'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${count} składniki`
  return `${count} składników`
}

export function RecipesPage({ ownerId, overviewRequestToken }: RecipesPageProps) {
  const [recipesStatus, setRecipesStatus] = useState<RecipesStatus>({ status: 'loading', model: null })
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>(null)

  const load = useCallback(async (preserveSelection = true, selectedAfterLoad: string | null = null) => {
    setRecipesStatus({ status: 'loading', model: null })
    try {
      const model = await loadRecipesReadModel(ownerId)
      setRecipesStatus({ status: 'ready', model })
      setSelectedRecipeId((currentId) => {
        const targetId = preserveSelection ? currentId : selectedAfterLoad
        return targetId && model.recipes.some((recipe) => recipe.id === targetId) ? targetId : null
      })
      void flushRecipeImageCleanupQueue(ownerId)
    } catch {
      setRecipesStatus({ status: 'error', model: null })
    }
  }, [ownerId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (overviewRequestToken <= 0) return
    setEditorMode(null)
    setSelectedRecipeId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [overviewRequestToken])

  const model = recipesStatus.status === 'ready' ? recipesStatus.model : null
  const selectedRecipe = useMemo(
    () => model?.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [model, selectedRecipeId],
  )

  async function handleEditorSaved(recipeId: string | null) {
    setEditorMode(null)
    await load(false, recipeId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (selectedRecipe) {
    return (
      <section className="recipes-page recipe-detail-page" aria-label={`Przepis ${selectedRecipe.name}`}>
        <div className="recipe-detail-heading">
          <button className="icon-button" type="button" onClick={() => setSelectedRecipeId(null)} aria-label="Wróć do listy przepisów" title="Wróć">
            <KitchenIcon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">Przepis</p>
            <h1>{selectedRecipe.name}</h1>
          </div>
          <button className="icon-button" type="button" onClick={() => setEditorMode({ kind: 'edit', recipe: selectedRecipe })} aria-label="Edytuj przepis" title="Edytuj przepis">
            <KitchenIcon name="edit" />
          </button>
        </div>

        <div className={`recipe-detail-cover${selectedRecipe.coverImageUrl ? ' has-image' : ''}`} style={{ aspectRatio: RECIPE_COVER_HERO_ASPECT }}>
          {selectedRecipe.coverImageUrl ? (
            <RecipeCoverImage
              src={selectedRecipe.coverImageUrl}
              alt={`Zdjęcie przepisu ${selectedRecipe.name}`}
              focusX={selectedRecipe.coverFocusX}
              focusY={selectedRecipe.coverFocusY}
            />
          ) : (
            <span aria-hidden="true"><KitchenIcon name="recipes" size={34} /></span>
          )}
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
            <div className="recipe-ingredient-groups">
              {selectedRecipe.ingredients.map((ingredient, index) => {
                const previousSection = index > 0 ? selectedRecipe.ingredients[index - 1].sectionLabel : null
                const showSection = ingredient.sectionLabel && ingredient.sectionLabel !== previousSection
                return (
                  <div key={ingredient.id}>
                    {showSection && <h3 className="recipe-ingredient-section-title">{ingredient.sectionLabel}</h3>}
                    <div className="recipe-ingredient-row">
                      <span className="recipe-ingredient-index" aria-hidden="true" />
                      <span className="recipe-ingredient-copy">
                        <strong>{ingredient.productName}</strong>
                        {ingredient.note && <small>{ingredient.note}</small>}
                      </span>
                      <span className="recipe-ingredient-quantity">{formatQuantity(ingredient.quantity)} {ingredient.unitSymbol}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="recipe-detail-muted">Brak składników.</p>
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
            <p className="recipe-detail-muted">Brak instrukcji przygotowania.</p>
          )}
        </section>

        {editorMode && (
          <RecipeEditor
            ownerId={ownerId}
            mode={editorMode}
            onClose={() => setEditorMode(null)}
            onSaved={(recipeId) => void handleEditorSaved(recipeId)}
          />
        )}
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
        <div className="recipes-heading-actions">
          <button className="icon-button" type="button" onClick={() => void load()} aria-label="Odśwież przepisy" title="Odśwież">
            <KitchenIcon name="refresh" />
          </button>
          <button className="icon-button recipes-add-button" type="button" onClick={() => setEditorMode({ kind: 'create' })} aria-label="Dodaj przepis" title="Dodaj przepis">
            <KitchenIcon name="plus" />
          </button>
        </div>
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
          <button className="secondary-button compact-button" type="button" onClick={() => void load()}>Spróbuj ponownie</button>
        </section>
      )}

      {model && model.recipes.length === 0 && (
        <section className="recipes-empty-card recipes-empty-with-action">
          <span className="recipes-empty-icon" aria-hidden="true"><KitchenIcon name="recipes" size={23} /></span>
          <div>
            <strong>Dodaj pierwszy przepis</strong>
            <span>Zapisz przepis w swojej książce kucharskiej.</span>
          </div>
          <button className="primary-button" type="button" onClick={() => setEditorMode({ kind: 'create' })}>
            <KitchenIcon name="plus" size={18} />
            <span>Dodaj przepis</span>
          </button>
        </section>
      )}

      {model && model.recipes.length > 0 && (
        <div className="recipes-list-card">
          <ul className="recipes-list">
            {model.recipes.map((recipe) => (
              <li key={recipe.id}>
                <button className="recipe-row" type="button" onClick={() => { setSelectedRecipeId(recipe.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  <span className={`recipe-row-cover${recipe.coverImageUrl ? ' has-image' : ''}`} aria-hidden={!recipe.coverImageUrl}>
                    {recipe.coverImageUrl ? (
                      <RecipeCoverImage src={recipe.coverImageUrl} alt="" focusX={recipe.coverFocusX} focusY={recipe.coverFocusY} />
                    ) : (
                      <KitchenIcon name="recipes" size={19} />
                    )}
                  </span>
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

      {editorMode && (
        <RecipeEditor
          ownerId={ownerId}
          mode={editorMode}
          onClose={() => setEditorMode(null)}
          onSaved={(recipeId) => void handleEditorSaved(recipeId)}
        />
      )}
    </section>
  )
}
