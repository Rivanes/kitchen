import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { createCanonicalShoppingItemsSequentially } from '../shopping/shoppingMutations'
import { RecipeServingsControl } from './RecipeServingsControl'
import { formatRecipeDuration } from './recipeDuration'
import { formatScaledRecipeQuantity } from './recipeServings'
import { buildRecipeShoppingPlan, getMissingRecipeProductIds } from './recipeShoppingPlan'
import { RecipeCoverImage } from './RecipeCoverImage'
import { RECIPE_COVER_HERO_ASPECT, RECIPE_COVER_THUMBNAIL_ASPECT } from './recipeCoverCrop'
import { RecipeEditor } from './RecipeEditor'
import { flushRecipeImageCleanupQueue } from './recipeCoverStorage'
import { loadRecipesReadModel } from './recipesReadModel'
import type { RecipeIngredientPresence, RecipeReadItem, RecipesReadModel } from './types'

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

type RecipeShoppingAction =
  | { kind: 'product'; productId: string }
  | { kind: 'bulk' }
  | null

type RecipeShoppingFeedback =
  | { kind: 'success' | 'error'; message: string }
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

function ingredientPresenceLabel(presence: RecipeIngredientPresence) {
  if (presence === 'inventory') return 'W zapasach'
  if (presence === 'shopping') return 'Na liście zakupów'
  return 'Brak w zapasach i na liście zakupów'
}

export function RecipesPage({ ownerId, overviewRequestToken }: RecipesPageProps) {
  const [recipesStatus, setRecipesStatus] = useState<RecipesStatus>({ status: 'loading', model: null })
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>(null)
  const [targetServings, setTargetServings] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [shoppingAction, setShoppingAction] = useState<RecipeShoppingAction>(null)
  const [shoppingFeedback, setShoppingFeedback] = useState<RecipeShoppingFeedback>(null)
  const [shoppingRecoveryBlocked, setShoppingRecoveryBlocked] = useState(false)

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
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [overviewRequestToken])

  const model = recipesStatus.status === 'ready' ? recipesStatus.model : null
  const selectedRecipe = useMemo(
    () => model?.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [model, selectedRecipeId],
  )

  useEffect(() => {
    if (!selectedRecipe) return
    setTargetServings(selectedRecipe.servings)
  }, [selectedRecipe?.id, selectedRecipe?.servings])

  useEffect(() => {
    setShoppingAction(null)
    setShoppingFeedback(null)
    setShoppingRecoveryBlocked(false)
  }, [selectedRecipe?.id])

  const shouldShowRecipeSearch = Boolean(model && model.recipes.length >= 8)
  const normalizedSearch = shouldShowRecipeSearch
    ? searchQuery.trim().toLocaleLowerCase('pl-PL')
    : ''
  const visibleRecipes = useMemo(() => {
    if (!model) return []
    if (!normalizedSearch) return model.recipes

    return model.recipes.filter((recipe) => (
      recipe.name.toLocaleLowerCase('pl-PL').includes(normalizedSearch)
      || recipe.ingredients.some((ingredient) => (
        ingredient.productName.toLocaleLowerCase('pl-PL').includes(normalizedSearch)
      ))
    ))
  }, [model, normalizedSearch])

  async function handleEditorSaved(recipeId: string | null) {
    setEditorMode(null)
    await load(false, recipeId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasNamedRecipeSections = Boolean(
    selectedRecipe?.ingredients.some((ingredient) => Boolean(ingredient.sectionLabel?.trim())),
  )
  const missingRecipeProductIds = useMemo(
    () => selectedRecipe ? getMissingRecipeProductIds(selectedRecipe.ingredients) : [],
    [selectedRecipe],
  )

  function markRecipeProductsAsShopping(productIds: Iterable<string>) {
    const ids = new Set(productIds)
    if (ids.size === 0) return

    setRecipesStatus((current) => {
      if (current.status !== 'ready') return current

      return {
        status: 'ready',
        model: {
          recipes: current.model.recipes.map((recipe) => ({
            ...recipe,
            ingredients: recipe.ingredients.map((ingredient) => (
              ids.has(ingredient.productId) && ingredient.presence !== 'inventory'
                ? { ...ingredient, presence: 'shopping' as const }
                : ingredient
            )),
          })),
        },
      }
    })
  }

  async function refreshRecipesSilently() {
    const refreshed = await loadRecipesReadModel(ownerId)
    setRecipesStatus({ status: 'ready', model: refreshed })
  }

  async function addMissingProductsToShopping(productIds: string[], action: RecipeShoppingAction) {
    if (!selectedRecipe || shoppingAction || shoppingRecoveryBlocked || productIds.length === 0) return

    setShoppingAction(action)
    setShoppingFeedback(null)

    try {
      const plan = buildRecipeShoppingPlan({
        ingredients: selectedRecipe.ingredients,
        baseServings: selectedRecipe.servings,
        targetServings,
        productIds,
      })

      if (plan.length === 0) return

      await createCanonicalShoppingItemsSequentially(plan.map((entry) => ({
        ownerId,
        name: entry.productName,
        existingProductId: entry.productId,
        quantity: entry.quantity,
        unitCode: entry.unitCode,
      })))

      markRecipeProductsAsShopping(productIds)
      setShoppingFeedback({
        kind: 'success',
        message: productIds.length === 1
          ? 'Dodano brakujący produkt do listy zakupów.'
          : `Dodano brakujące produkty do listy zakupów (${productIds.length}).`,
      })
    } catch (error) {
      let refreshed = false
      try {
        await refreshRecipesSilently()
        refreshed = true
      } catch {
        setShoppingRecoveryBlocked(true)
      }
      setShoppingFeedback({
        kind: 'error',
        message: refreshed
          ? (error instanceof Error
              ? `${error.message} Status listy został odświeżony.`
              : 'Nie udało się dodać wszystkich produktów. Status listy został odświeżony.')
          : 'Nie udało się potwierdzić aktualnego stanu listy zakupów. Wróć do listy przepisów i otwórz przepis ponownie przed kolejną próbą.',
      })
    } finally {
      setShoppingAction(null)
    }
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
          <div className="recipe-detail-summary-content">
            <RecipeServingsControl
              baseServings={selectedRecipe.servings}
              value={targetServings}
              onChange={setTargetServings}
            />
          </div>
        </section>

        {(selectedRecipe.prepTimeMinutes || selectedRecipe.cookTimeMinutes) && (
          <section className="recipe-detail-timing" aria-label="Czas przepisu">
            {selectedRecipe.prepTimeMinutes && (
              <div className="recipe-detail-time-item">
                <span>Czas przygotowania</span>
                <strong>{formatRecipeDuration(selectedRecipe.prepTimeMinutes)}</strong>
              </div>
            )}
            {selectedRecipe.cookTimeMinutes && (
              <div className="recipe-detail-time-item">
                <span>Czas gotowania / pieczenia</span>
                <strong>{formatRecipeDuration(selectedRecipe.cookTimeMinutes)}</strong>
              </div>
            )}
          </section>
        )}

        <section className="recipe-detail-section" aria-labelledby="recipe-ingredients-title">
          <div className="recipe-detail-section-heading recipe-ingredients-heading">
            <span className="recipe-detail-section-icon" aria-hidden="true"><KitchenIcon name="inventory" size={18} /></span>
            <h2 id="recipe-ingredients-title">Składniki</h2>
            {missingRecipeProductIds.length > 0 && (
              <button
                className="secondary-button compact-button recipe-shopping-add-all"
                type="button"
                disabled={shoppingAction !== null || shoppingRecoveryBlocked}
                onClick={() => void addMissingProductsToShopping(missingRecipeProductIds, { kind: 'bulk' })}
                aria-label={`Dodaj wszystkie brakujące produkty do listy zakupów (${missingRecipeProductIds.length})`}
              >
                <KitchenIcon name="shoppingAdd" size={16} />
                <span>{shoppingAction?.kind === 'bulk' ? 'Dodawanie…' : `Dodaj wszystkie brakujące (${missingRecipeProductIds.length})`}</span>
              </button>
            )}
          </div>

          {shoppingFeedback && (
            <p className={`recipe-shopping-feedback is-${shoppingFeedback.kind}`} role="status" aria-live="polite">
              {shoppingFeedback.message}
            </p>
          )}

          {selectedRecipe.ingredients.length > 0 ? (
            <div className="recipe-ingredient-groups">
              {selectedRecipe.ingredients.map((ingredient, index) => {
                const hasNamedSections = hasNamedRecipeSections
                const currentSection = ingredient.sectionLabel?.trim() ?? ''
                const previousSection = index > 0
                  ? selectedRecipe.ingredients[index - 1].sectionLabel?.trim() ?? ''
                  : null
                const showSection = hasNamedSections && currentSection !== previousSection
                const sectionTitle = currentSection || 'Pozostałe składniki'
                const displayQuantity = formatScaledRecipeQuantity({
                  baseQuantity: ingredient.quantity,
                  baseServings: selectedRecipe.servings,
                  targetServings,
                })

                return (
                  <div key={ingredient.id}>
                    {showSection && <h3 className="recipe-ingredient-section-title">{sectionTitle}</h3>}
                    <div className={`recipe-ingredient-row${ingredient.presence === 'missing' ? ' has-shopping-action' : ''}`}>
                      <span
                        className={`recipe-ingredient-index is-${ingredient.presence}`}
                        role="img"
                        aria-label={ingredientPresenceLabel(ingredient.presence)}
                        title={ingredientPresenceLabel(ingredient.presence)}
                      />
                      <span className="recipe-ingredient-copy">
                        <strong>{ingredient.productName}</strong>
                        {ingredient.note && <small>{ingredient.note}</small>}
                      </span>
                      <span className="recipe-ingredient-quantity">{displayQuantity} {ingredient.unitSymbol}</span>
                      {ingredient.presence === 'missing' && (
                        <button
                          className="recipe-ingredient-shopping-action"
                          type="button"
                          disabled={shoppingAction !== null || shoppingRecoveryBlocked}
                          onClick={() => void addMissingProductsToShopping(
                            [ingredient.productId],
                            { kind: 'product', productId: ingredient.productId },
                          )}
                          aria-label={`Dodaj ${ingredient.productName} do listy zakupów`}
                          title="Dodaj do listy zakupów"
                        >
                          <KitchenIcon
                            name="shoppingAdd"
                            size={17}
                          />
                        </button>
                      )}
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

      {model && shouldShowRecipeSearch && (
        <label className="inventory-search recipes-search">
          <KitchenIcon name="search" size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Szukaj przepisu lub składnika"
            aria-label="Szukaj przepisu lub składnika"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Wyczyść wyszukiwanie">
              <KitchenIcon name="close" size={17} />
            </button>
          )}
        </label>
      )}

      {model && model.recipes.length > 0 && normalizedSearch && visibleRecipes.length === 0 && (
        <div className="recipes-search-empty" role="status">
          Brak przepisów pasujących do wyszukiwania.
        </div>
      )}

      {model && visibleRecipes.length > 0 && (
        <div className="recipes-list-card">
          <ul className="recipes-list">
            {visibleRecipes.map((recipe) => (
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
