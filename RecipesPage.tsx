import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { ensureCanonicalShoppingTargetsSequentially } from '../shopping/shoppingMutations'
import { RecipeServingsControl } from './RecipeServingsControl'
import { formatRecipeDuration } from './recipeDuration'
import { formatScaledRecipeQuantity } from './recipeServings'
import { buildRecipeShoppingPlan, getRecipeShoppingActionProductIds, getRecipeShoppingBlockedProductIds, getRecipeShoppingListedProductIds } from './recipeShoppingPlan'
import { RecipeCoverImage } from './RecipeCoverImage'
import { RECIPE_CATEGORIES, recipeCategoryLabel } from './recipeCategories'
import { filterRecipesByCategory, type RecipeCategoryFilter } from './recipeDiscovery'
import { RECIPE_COVER_HERO_ASPECT, RECIPE_COVER_THUMBNAIL_ASPECT } from './recipeCoverCrop'
import { RecipeEditor } from './RecipeEditor'
import { flushRecipeImageCleanupQueue } from './recipeCoverStorage'
import { loadRecipesReadModel } from './recipesReadModel'
import { buildRecipeMatchMap, matchRecipe, recipeMatchStateLabel, type RecipeMatchResult, type RecipeMatchState } from './recipeMatching'
import { buildRecipePurchasePlan } from './recipePurchasePlanning'
import type { RecipeReadItem, RecipesReadModel } from './types'

type RecipesPageProps = {
  ownerId: string
  overviewRequestToken: number
  openRecipeId: string | null
  openRecipeRequestToken: number
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


export function RecipesPage({ ownerId, overviewRequestToken, openRecipeId, openRecipeRequestToken }: RecipesPageProps) {
  const [recipesStatus, setRecipesStatus] = useState<RecipesStatus>({ status: 'loading', model: null })
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>(null)
  const [targetServings, setTargetServings] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategoryFilter>('all')
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
    setCategoryFilter('all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [overviewRequestToken])

  const model = recipesStatus.status === 'ready' ? recipesStatus.model : null
  const recipeMatches = useMemo(() => {
    if (!model) return new Map<string, RecipeMatchResult>()
    return buildRecipeMatchMap({
      recipes: model.recipes.map((recipe) => ({
        id: recipe.id,
        baseServings: recipe.servings,
        ingredients: recipe.ingredients,
      })),
      products: model.inventory.products,
      units: model.inventory.units,
      inventoryLots: model.inventory.groups.flatMap((group) => group.lots),
    })
  }, [model])

  useEffect(() => {
    if (!model || openRecipeRequestToken <= 0 || !openRecipeId) return
    if (!model.recipes.some((recipe) => recipe.id === openRecipeId)) return

    setEditorMode(null)
    setSelectedRecipeId(openRecipeId)
    setSearchQuery('')
    setCategoryFilter('all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [model, openRecipeId, openRecipeRequestToken])

  const selectedRecipe = useMemo(
    () => model?.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [model, selectedRecipeId],
  )
  const selectedRecipeMatch = useMemo(() => {
    if (!selectedRecipe || !model) return null
    return matchRecipe({
      recipe: {
        id: selectedRecipe.id,
        baseServings: selectedRecipe.servings,
        targetServings,
        ingredients: selectedRecipe.ingredients,
      },
      products: model.inventory.products,
      units: model.inventory.units,
      inventoryLots: model.inventory.groups.flatMap((group) => group.lots),
    })
  }, [model, selectedRecipe, targetServings])

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

    const categoryRecipes = filterRecipesByCategory(model.recipes, categoryFilter)
    if (!normalizedSearch) return categoryRecipes

    return categoryRecipes.filter((recipe) => (
      recipe.name.toLocaleLowerCase('pl-PL').includes(normalizedSearch)
      || recipe.ingredients.some((ingredient) => (
        ingredient.productName.toLocaleLowerCase('pl-PL').includes(normalizedSearch)
      ))
    ))
  }, [categoryFilter, model, normalizedSearch])

  async function handleEditorSaved(recipeId: string | null) {
    setEditorMode(null)
    await load(false, recipeId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const visibleRecipeSections = useMemo(() => (
    selectedRecipe
      ? selectedRecipe.sections.filter((section) => selectedRecipe.ingredients.some((ingredient) => ingredient.sectionId === section.id))
      : []
  ), [selectedRecipe])
  const shouldShowRecipeSectionHeadings = visibleRecipeSections.length > 1
  const selectedRecipePurchasePlan = useMemo(() => {
    if (!selectedRecipeMatch || !model) return null
    return buildRecipePurchasePlan({
      match: selectedRecipeMatch,
      products: model.inventory.products,
      units: model.inventory.units,
    })
  }, [model, selectedRecipeMatch])
  const selectedRecipeShoppingPlan = useMemo(() => {
    if (!selectedRecipePurchasePlan || !model) return null
    return buildRecipeShoppingPlan({
      purchasePlan: selectedRecipePurchasePlan,
      activeShoppingItems: model.activeShoppingItems,
    })
  }, [model, selectedRecipePurchasePlan])
  const shoppingActionProductIds = useMemo(
    () => selectedRecipeShoppingPlan ? getRecipeShoppingActionProductIds(selectedRecipeShoppingPlan) : [],
    [selectedRecipeShoppingPlan],
  )
  const shoppingActionProductIdSet = useMemo(() => new Set(shoppingActionProductIds), [shoppingActionProductIds])
  const shoppingListedProductIdSet = useMemo(
    () => new Set(selectedRecipeShoppingPlan ? getRecipeShoppingListedProductIds(selectedRecipeShoppingPlan) : []),
    [selectedRecipeShoppingPlan],
  )
  const blockedShoppingProductIdSet = useMemo(
    () => new Set(selectedRecipeShoppingPlan ? getRecipeShoppingBlockedProductIds(selectedRecipeShoppingPlan) : []),
    [selectedRecipeShoppingPlan],
  )
  const unresolvedPurchaseProductIdSet = useMemo(
    () => new Set(selectedRecipeShoppingPlan?.unresolvedProductIds ?? []),
    [selectedRecipeShoppingPlan],
  )

  async function refreshRecipesSilently() {
    const refreshed = await loadRecipesReadModel(ownerId)
    setRecipesStatus({ status: 'ready', model: refreshed })
  }

  async function updateRecipeShoppingTargets(productIds: string[], action: RecipeShoppingAction) {
    if (!selectedRecipeShoppingPlan || shoppingAction || shoppingRecoveryBlocked || productIds.length === 0) return

    setShoppingAction(action)
    setShoppingFeedback(null)

    try {
      const productIdSet = new Set(productIds)
      const entries = selectedRecipeShoppingPlan.entries.filter((entry) => (
        productIdSet.has(entry.productId) && entry.state === 'needs-top-up'
      ))

      if (entries.length === 0) return

      await ensureCanonicalShoppingTargetsSequentially(entries.map((entry) => ({
        ownerId,
        name: entry.productName,
        existingProductId: entry.productId,
        targetQuantity: entry.targetQuantity,
        unitCode: entry.unitCode,
        wholeUnits: entry.purchaseMode === 'container' || entry.purchaseMode === 'count-pack',
      })))

      await refreshRecipesSilently()
      setShoppingFeedback({
        kind: 'success',
        message: productIds.length === 1
          ? 'Zaktualizowano listę zakupów dla produktu.'
          : `Zaktualizowano brakujące zakupy (${productIds.length}).`,
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
            <span className="recipe-category-badge">{recipeCategoryLabel(selectedRecipe.categoryCode)}</span>
            <span className={`recipe-match-badge is-${selectedRecipeMatch?.state ?? 'unresolved'}`}>{recipeMatchStateLabel(selectedRecipeMatch?.state ?? 'unresolved')}</span>
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
            {shoppingActionProductIds.length > 0 && (
              <button
                className="secondary-button compact-button recipe-shopping-add-all"
                type="button"
                disabled={shoppingAction !== null || shoppingRecoveryBlocked}
                onClick={() => void updateRecipeShoppingTargets(shoppingActionProductIds, { kind: 'bulk' })}
                aria-label={`Dodaj brakujące ilości produktów do listy zakupów (${shoppingActionProductIds.length})`}
              >
                <KitchenIcon name="shoppingAdd" size={16} />
                <span>{shoppingAction?.kind === 'bulk' ? 'Aktualizowanie…' : `Dodaj brakujące (${shoppingActionProductIds.length})`}</span>
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
              {visibleRecipeSections.map((section) => {
                const sectionIngredients = selectedRecipe.ingredients.filter((ingredient) => ingredient.sectionId === section.id)
                if (sectionIngredients.length === 0) return null

                return (
                  <div className="recipe-ingredient-section-group" key={section.id}>
                    {shouldShowRecipeSectionHeadings && <h3 className="recipe-ingredient-section-title">{section.name}</h3>}
                    {sectionIngredients.map((ingredient) => {
                      const displayQuantity = formatScaledRecipeQuantity({
                        baseQuantity: ingredient.quantity,
                        baseServings: selectedRecipe.servings,
                        targetServings,
                      })
                      const matchState: RecipeMatchState = selectedRecipeMatch?.ingredientStates[ingredient.id] ?? 'unresolved'

                      return (
                        <div className={`recipe-ingredient-row${shoppingActionProductIdSet.has(ingredient.productId) ? ' has-shopping-action' : ''}`} key={ingredient.id}>
                          <span
                            className={`recipe-ingredient-index is-match-${matchState}`}
                            role="img"
                            aria-label={recipeMatchStateLabel(matchState)}
                            title={recipeMatchStateLabel(matchState)}
                          />
                          <span className="recipe-ingredient-copy">
                            <strong>{ingredient.productName}</strong>
                            {ingredient.note && <small>{ingredient.note}</small>}
                            {(shoppingListedProductIdSet.has(ingredient.productId) || ingredient.presence === 'shopping') && <small className="recipe-ingredient-shopping-context">Na liście zakupów</small>}
                            {unresolvedPurchaseProductIdSet.has(ingredient.productId) && ingredient.presence !== 'shopping' && (matchState === 'partial' || matchState === 'missing') && <small className="recipe-ingredient-shopping-context">Ustaw sposób zakupu</small>}
                            {blockedShoppingProductIdSet.has(ingredient.productId) && <small className="recipe-ingredient-shopping-context">Sprawdź listę zakupów</small>}
                          </span>
                          <span className="recipe-ingredient-meta"><span className="recipe-ingredient-quantity">{displayQuantity} {ingredient.unitSymbol}</span><small>{recipeMatchStateLabel(matchState)}</small></span>
                          {shoppingActionProductIdSet.has(ingredient.productId) && (
                            <button
                              className="recipe-ingredient-shopping-action"
                              type="button"
                              disabled={shoppingAction !== null || shoppingRecoveryBlocked}
                              onClick={() => void updateRecipeShoppingTargets(
                                [ingredient.productId],
                                { kind: 'product', productId: ingredient.productId },
                              )}
                              aria-label={`${shoppingListedProductIdSet.has(ingredient.productId) ? 'Uzupełnij' : 'Dodaj'} ${ingredient.productName} na liście zakupów`}
                              title={shoppingListedProductIdSet.has(ingredient.productId) ? 'Uzupełnij listę zakupów' : 'Dodaj do listy zakupów'}
                            >
                              <KitchenIcon
                                name="shoppingAdd"
                                size={17}
                              />
                            </button>
                          )}
                        </div>
                      )
                    })}
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
        <div className="recipe-category-filters" role="group" aria-label="Filtr kategorii przepisów">
          <button
            className={`recipe-category-filter${categoryFilter === 'all' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          >
            Wszystkie
          </button>
          {RECIPE_CATEGORIES.map((category) => (
            <button
              className={`recipe-category-filter${categoryFilter === category.code ? ' is-active' : ''}`}
              type="button"
              aria-pressed={categoryFilter === category.code}
              key={category.code}
              onClick={() => setCategoryFilter(category.code)}
            >
              {category.label}
            </button>
          ))}
        </div>
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

      {model && model.recipes.length > 0 && visibleRecipes.length === 0 && (normalizedSearch || categoryFilter !== 'all') && (
        <div className="recipes-search-empty" role="status">
          {normalizedSearch
            ? 'Brak przepisów pasujących do wybranych filtrów i wyszukiwania.'
            : 'Brak przepisów pasujących do wybranych filtrów.'}
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
                    <small>{recipeCategoryLabel(recipe.categoryCode)} · {servingsLabel(recipe.servings)} · {ingredientsLabel(recipe.ingredients.length)}</small>
                    <span className={`recipe-match-badge is-${recipeMatches.get(recipe.id)?.state ?? 'unresolved'}`}>{recipeMatchStateLabel(recipeMatches.get(recipe.id)?.state ?? 'unresolved')}</span>
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
