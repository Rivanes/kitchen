import { useCallback, useEffect, useMemo, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { getInventoryExpiryMeta } from '../inventory/expiry'
import { formatQuantity } from '../quantity/quantity'
import { loadInventoryReadModel } from '../inventory/inventoryReadModel'
import { isHouseholdLowStock } from '../inventory/resourcePolicy'
import { loadActiveShoppingCount, loadActiveShoppingProductIds } from '../shopping/shoppingReadModel'
import { ensureActiveShoppingProduct } from '../shopping/shoppingMutations'
import type { InventoryReadModel } from '../inventory/types'
import { RecipeCoverImage } from '../recipes/RecipeCoverImage'
import { RECIPE_CATEGORIES, recipeCategoryLabel } from '../recipes/recipeCategories'
import {
  buildHomeRecipeSuggestions,
  resolveCurrentMealCategory,
  type RecipeCategoryFilter,
  type RecipeCookabilityFilter,
} from '../recipes/recipeDiscovery'
import { loadRecipeDiscoveryReadModel, type RecipeDiscoveryReadModel } from '../recipes/recipeDiscoveryReadModel'
import { buildRecipeMatchMap, recipeMatchStateLabel, type RecipeMatchResult } from '../recipes/recipeMatching'

type HomePageProps = {
  ownerId: string
  onAddProduct: () => void
  onOpenExpiry: () => void
  onOpenShopping: () => void
  onOpenRecipes: () => void
  onOpenRecipe: (recipeId: string) => void
}

type RecipeDiscoveryStatus =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: RecipeDiscoveryReadModel }
  | { status: 'error'; model: null }

type HomeStatus =
  | { status: 'loading'; model: null }
  | { status: 'ready'; model: InventoryReadModel }
  | { status: 'error'; model: null }

function polishProducts(value: number) {
  if (value === 1) return '1 produkt w zasobach'
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${value} produkty w zasobach`
  }
  return `${value} produktów w zasobach`
}

function expiryHubSummary(critical: number, warning: number, missing: number, total: number) {
  if (total === 0) return 'Pojawią się razem z zapasami'

  const parts: string[] = []
  if (critical > 0) parts.push(`${critical} pilne`)
  if (warning > 0) parts.push(`${warning} wkrótce`)
  if (missing > 0) parts.push(`${missing} bez terminu`)

  return parts.length > 0 ? parts.join(' · ') : 'Wszystkie terminy są spokojne'
}

function shoppingSummary(count: number) {
  if (count === 0) return 'Lista jest pusta'
  if (count === 1) return '1 rzecz do kupienia'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${count} rzeczy do kupienia`
  }
  return `${count} rzeczy do kupienia`
}

function servingsLabel(count: number) {
  if (count === 1) return '1 porcja'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${count} porcje`
  return `${count} porcji`
}

export function HomePage({ ownerId, onAddProduct, onOpenExpiry, onOpenShopping, onOpenRecipes, onOpenRecipe }: HomePageProps) {
  const [homeStatus, setHomeStatus] = useState<HomeStatus>({ status: 'loading', model: null })
  const [shoppingCount, setShoppingCount] = useState<number | null>(null)
  const [activeShoppingProductIds, setActiveShoppingProductIds] = useState<Set<string>>(new Set())
  const [lowStockUpdatingId, setLowStockUpdatingId] = useState<string | null>(null)
  const [lowStockError, setLowStockError] = useState('')
  const [recipeStatus, setRecipeStatus] = useState<RecipeDiscoveryStatus>({ status: 'loading', model: null })
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<RecipeCategoryFilter>('all')
  const [recipeCookabilityFilter, setRecipeCookabilityFilter] = useState<RecipeCookabilityFilter>('all')
  const [localNow, setLocalNow] = useState(() => new Date())

  useEffect(() => {
    let active = true

    loadInventoryReadModel(ownerId)
      .then((model) => {
        if (active) setHomeStatus({ status: 'ready', model })
      })
      .catch(() => {
        if (active) setHomeStatus({ status: 'error', model: null })
      })

    return () => {
      active = false
    }
  }, [ownerId])

  useEffect(() => {
    let active = true

    Promise.all([
      loadActiveShoppingCount(ownerId),
      loadActiveShoppingProductIds(ownerId),
    ])
      .then(([count, productIds]) => {
        if (!active) return
        setShoppingCount(count)
        setActiveShoppingProductIds(productIds)
      })
      .catch(() => {
        if (!active) return
        setShoppingCount(null)
        setActiveShoppingProductIds(new Set())
      })

    return () => {
      active = false
    }
  }, [ownerId])

  const loadRecipeDiscovery = useCallback(async () => {
    setRecipeStatus({ status: 'loading', model: null })
    try {
      const model = await loadRecipeDiscoveryReadModel(ownerId)
      setRecipeStatus({ status: 'ready', model })
    } catch {
      setRecipeStatus({ status: 'error', model: null })
    }
  }, [ownerId])

  useEffect(() => {
    void loadRecipeDiscovery()
  }, [loadRecipeDiscovery])

  useEffect(() => {
    let timer: number | undefined

    const refreshClock = () => setLocalNow(new Date())
    const scheduleMinuteBoundary = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      const now = new Date()
      const delay = Math.max(250, 60_000 - now.getSeconds() * 1000 - now.getMilliseconds() + 25)
      timer = window.setTimeout(() => {
        refreshClock()
        scheduleMinuteBoundary()
      }, delay)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshClock()
        scheduleMinuteBoundary()
      }
    }

    refreshClock()
    scheduleMinuteBoundary()
    window.addEventListener('focus', refreshClock)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      window.removeEventListener('focus', refreshClock)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const hasResources = homeStatus.status === 'ready' && homeStatus.model.resourceProducts > 0

  const expirySummary = useMemo(() => {
    if (homeStatus.status !== 'ready') return { critical: 0, warning: 0, missing: 0, total: 0 }

    let critical = 0
    let warning = 0
    let missing = 0
    const lots = homeStatus.model.groups
      .flatMap((group) => group.lots)
      .filter((lot) => lot.recipeEligible && lot.inventoryTrackingMode === 'quantity')

    for (const lot of lots) {
      const meta = getInventoryExpiryMeta(lot.expiryDate, lot.openedUseByDate)
      if (meta.tone === 'critical') critical += 1
      if (meta.tone === 'warning') warning += 1
      if (!lot.expiryDate) missing += 1
    }

    return { critical, warning, missing, total: lots.length }
  }, [homeStatus])

  const expiryTone = homeStatus.status !== 'ready' || expirySummary.total === 0
    ? 'none'
    : expirySummary.critical > 0
      ? 'critical'
      : expirySummary.warning > 0 || expirySummary.missing > 0
        ? 'warning'
        : 'good'


  const lowHouseholdResources = useMemo(() => {
    if (homeStatus.status !== 'ready') return []
    const household = homeStatus.model.groups.find((group) => group.location.kind === 'household')
    if (!household) return []
    return household.resources.filter((resource) => (
      isHouseholdLowStock(resource.quantity, resource.product.minimumStockQuantity)
    ))
  }, [homeStatus])

  const currentMealCategory = resolveCurrentMealCategory(localNow.getHours())
  const recipeMatches = useMemo(() => {
    if (recipeStatus.status !== 'ready' || homeStatus.status !== 'ready') return new Map<string, RecipeMatchResult>()
    return buildRecipeMatchMap({
      recipes: recipeStatus.model.recipes.map((recipe) => ({
        id: recipe.id,
        baseServings: recipe.servings,
        ingredients: recipe.matchingIngredients,
      })),
      products: homeStatus.model.products,
      units: homeStatus.model.units,
      inventoryLots: homeStatus.model.groups.flatMap((group) => group.lots),
    })
  }, [homeStatus, recipeStatus])
  const recipeCandidates = useMemo(() => (
    recipeStatus.status === 'ready'
      ? recipeStatus.model.recipes.map((recipe) => ({
          ...recipe,
          match: recipeMatches.get(recipe.id) ?? null,
          cookable: recipeMatches.get(recipe.id)?.cookable === true,
        }))
      : []
  ), [recipeMatches, recipeStatus])
  const recipeSuggestions = useMemo(() => (
    buildHomeRecipeSuggestions({
      recipes: recipeCandidates,
      currentMealCategory,
      generalFilter: recipeCategoryFilter,
      generalCookabilityFilter: recipeCookabilityFilter,
    })
  ), [currentMealCategory, recipeCandidates, recipeCategoryFilter, recipeCookabilityFilter])

  async function handleAddLowStock(productId: string) {
    if (lowStockUpdatingId || activeShoppingProductIds.has(productId)) return
    setLowStockUpdatingId(productId)
    setLowStockError('')
    try {
      const result = await ensureActiveShoppingProduct(ownerId, productId)
      setActiveShoppingProductIds((current) => new Set(current).add(productId))
      if (result.created) setShoppingCount((current) => current === null ? null : current + 1)
    } catch (error) {
      console.error('Kitchen Home low-stock Shopping ensure failed.', error)
      setLowStockError('Nie udało się dodać produktu do listy zakupów.')
    } finally {
      setLowStockUpdatingId(null)
    }
  }

  return (
    <section className="home-page" aria-label="Start">
      <section className="home-overview" aria-labelledby="home-overview-title">
        <p className="eyebrow">Dzisiaj</p>
        <div className="home-overview-row">
          <div>
            <h1 id="home-overview-title">Twoja kuchnia</h1>
            {homeStatus.status === 'loading' && <p>Sprawdzam stan zapasów…</p>}
            {homeStatus.status === 'error' && <p>Zapasy są dostępne w dolnym menu.</p>}
            {homeStatus.status === 'ready' && !hasResources && <p>Dodaj pierwszy produkt i zacznij budować zasoby.</p>}
            {homeStatus.status === 'ready' && hasResources && <p>{polishProducts(homeStatus.model.resourceProducts)}</p>}
          </div>
          <span className="home-overview-icon" aria-hidden="true"><KitchenIcon name="inventory" size={22} /></span>
        </div>
      </section>

      <button className="home-quick-action" type="button" onClick={onAddProduct}>
        <span className="home-quick-icon" aria-hidden="true"><KitchenIcon name="plus" size={23} /></span>
        <strong>{hasResources ? 'Dodaj produkt' : 'Dodaj pierwszy produkt'}</strong>
        <KitchenIcon name="chevronRight" size={20} />
      </button>

      <button className={`home-expiry-hub home-expiry-hub-${expiryTone}`} type="button" onClick={onOpenExpiry}>
        <span className="home-expiry-hub-icon" aria-hidden="true"><KitchenIcon name="calendar" size={21} /></span>
        <span className="home-expiry-hub-copy">
          <strong>Terminy ważności</strong>
          <small>
            {homeStatus.status === 'ready'
              ? expiryHubSummary(expirySummary.critical, expirySummary.warning, expirySummary.missing, expirySummary.total)
              : homeStatus.status === 'loading'
                ? 'Sprawdzam terminy…'
                : 'Otwórz centrum terminów'}
          </small>
        </span>
        <KitchenIcon name="chevronRight" size={19} />
      </button>

      <button className="home-shopping-hub" type="button" onClick={onOpenShopping}>
        <span className="home-shopping-hub-icon" aria-hidden="true"><KitchenIcon name="shopping" size={21} /></span>
        <span className="home-shopping-hub-copy">
          <strong>Lista zakupów</strong>
          <small>{shoppingCount === null ? 'Otwórz listę zakupów' : shoppingSummary(shoppingCount)}</small>
        </span>
        <KitchenIcon name="chevronRight" size={19} />
      </button>

      {lowHouseholdResources.length > 0 && (
        <section className="home-low-stock" aria-labelledby="home-low-stock-title">
          <div className="home-section-heading home-low-stock-heading">
            <h2 id="home-low-stock-title">Do uzupełnienia</h2>
          </div>
          <div className="home-low-stock-list">
            {lowHouseholdResources.map((resource) => {
              const onShopping = activeShoppingProductIds.has(resource.product.id)
              const updating = lowStockUpdatingId === resource.product.id
              return (
                <div className="home-low-stock-row" key={resource.product.id}>
                  <span className="home-low-stock-copy">
                    <strong>{resource.product.name}</strong>
                    <small>{formatQuantity(resource.quantity)} {resource.unitSymbol}</small>
                  </span>
                  {onShopping ? (
                    <button className="home-low-stock-status" type="button" onClick={onOpenShopping}>Na liście</button>
                  ) : (
                    <button
                      className="secondary-button compact-button home-low-stock-add"
                      type="button"
                      onClick={() => void handleAddLowStock(resource.product.id)}
                      disabled={updating}
                    >
                      <KitchenIcon name="shoppingAdd" size={16} />
                      {updating ? 'Dodaję…' : 'Dodaj'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {lowStockError && <p className="form-error" role="alert">{lowStockError}</p>}
        </section>
      )}

      {recipeStatus.status === 'ready' && currentMealCategory && recipeSuggestions.now.length > 0 && (
        <section className="home-recipes-section home-recipes-now" aria-labelledby="home-recipes-now-title">
          <div className="home-section-heading home-recipes-heading">
            <div>
              <p className="eyebrow">Na teraz</p>
              <h2 id="home-recipes-now-title">{recipeCategoryLabel(currentMealCategory)}</h2>
            </div>
            <button className="home-recipes-link" type="button" onClick={onOpenRecipes}>Wszystkie przepisy</button>
          </div>
          <div className="home-recipe-grid">
            {recipeSuggestions.now.map((recipe) => (
              <button className="home-recipe-card" type="button" key={recipe.id} onClick={() => onOpenRecipe(recipe.id)}>
                <span className={`home-recipe-cover${recipe.coverImageUrl ? ' has-image' : ''}`}>
                  {recipe.coverImageUrl ? (
                    <RecipeCoverImage src={recipe.coverImageUrl} alt="" focusX={recipe.coverFocusX} focusY={recipe.coverFocusY} />
                  ) : (
                    <KitchenIcon name="recipes" size={23} />
                  )}
                </span>
                <span className="home-recipe-copy">
                  <strong>{recipe.name}</strong>
                  <small>{servingsLabel(recipe.servings)}</small>
                  <span className={`recipe-match-badge is-${recipe.match?.state ?? 'unresolved'}`}>{recipeMatchStateLabel(recipe.match?.state ?? 'unresolved')}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="home-recipes-section home-recipes-general" aria-labelledby="home-recipes-general-title">
        <div className="home-section-heading home-recipes-heading">
          <div>
            <p className="eyebrow">Inspiracje i planowanie</p>
            <h2 id="home-recipes-general-title">Przepisy</h2>
          </div>
          <button className="home-recipes-link" type="button" onClick={onOpenRecipes}>Otwórz</button>
        </div>

        {recipeStatus.status === 'loading' && (
          <div className="home-recipe-state" aria-live="polite">
            <span className="loading-dot" aria-hidden="true" />
            <span>Ładuję przepisy…</span>
          </div>
        )}

        {recipeStatus.status === 'error' && (
          <div className="home-recipe-state home-recipe-state-error">
            <span>Nie udało się wczytać przepisów na Start.</span>
            <button className="secondary-button compact-button" type="button" onClick={() => void loadRecipeDiscovery()}>Spróbuj ponownie</button>
          </div>
        )}

        {recipeStatus.status === 'ready' && (
          <>
            <div className="recipe-category-filters home-recipe-filters" role="group" aria-label="Filtr kategorii przepisów na Start">
              <button
                className={`recipe-category-filter${recipeCategoryFilter === 'all' ? ' is-active' : ''}`}
                type="button"
                aria-pressed={recipeCategoryFilter === 'all'}
                onClick={() => setRecipeCategoryFilter('all')}
              >
                Wszystkie
              </button>
              {RECIPE_CATEGORIES.map((category) => (
                <button
                  className={`recipe-category-filter${recipeCategoryFilter === category.code ? ' is-active' : ''}`}
                  type="button"
                  aria-pressed={recipeCategoryFilter === category.code}
                  key={category.code}
                  onClick={() => setRecipeCategoryFilter(category.code)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <button
              className={`recipe-cookable-filter${recipeCookabilityFilter === 'cookable' ? ' is-active' : ''}`}
              type="button"
              aria-pressed={recipeCookabilityFilter === 'cookable'}
              onClick={() => setRecipeCookabilityFilter((current) => current === 'cookable' ? 'all' : 'cookable')}
            >
              Mogę ugotować
            </button>

            {recipeStatus.model.recipes.length === 0 ? (
              <div className="home-recipe-state">
                <span>Dodaj pierwszy przepis, aby pojawiły się tutaj inspiracje.</span>
                <button className="secondary-button compact-button" type="button" onClick={onOpenRecipes}>Przejdź do przepisów</button>
              </div>
            ) : recipeSuggestions.general.length === 0 ? (
              <div className="home-recipe-state">Brak przepisów pasujących do wybranych filtrów.</div>
            ) : (
              <div className="home-recipe-grid">
                {recipeSuggestions.general.map((recipe) => (
                  <button className="home-recipe-card" type="button" key={recipe.id} onClick={() => onOpenRecipe(recipe.id)}>
                    <span className={`home-recipe-cover${recipe.coverImageUrl ? ' has-image' : ''}`}>
                      {recipe.coverImageUrl ? (
                        <RecipeCoverImage src={recipe.coverImageUrl} alt="" focusX={recipe.coverFocusX} focusY={recipe.coverFocusY} />
                      ) : (
                        <KitchenIcon name="recipes" size={23} />
                      )}
                    </span>
                    <span className="home-recipe-copy">
                      <strong>{recipe.name}</strong>
                      <small>{recipeCategoryLabel(recipe.categoryCode)} · {servingsLabel(recipe.servings)}</small>
                      <span className={`recipe-match-badge is-${recipe.match?.state ?? 'unresolved'}`}>{recipeMatchStateLabel(recipe.match?.state ?? 'unresolved')}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

    </section>
  )
}
