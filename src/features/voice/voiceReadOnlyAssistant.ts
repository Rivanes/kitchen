import type { InventoryLocation, InventoryLot, InventoryResource } from '../inventory/types.ts'
import { sumQuantities, formatQuantity } from '../quantity/quantity.ts'
import { formatRecipeDuration } from '../recipes/recipeDuration.ts'
import { matchRecipe, type RecipeMatchResult } from '../recipes/recipeMatching.ts'
import type { RecipeReadItem } from '../recipes/types.ts'
import type { ShoppingItem } from '../shopping/types.ts'
import type { VoiceKitchenContext } from './voiceKitchenContext.ts'
import { foldPolishText, phraseSimilarity, resolveVoiceEntity } from './voiceTextMatch.ts'

export type VoiceReadOnlyIntent =
  | 'inventory-product'
  | 'inventory-location'
  | 'inventory-all'
  | 'shopping-list'
  | 'recipe-summary'
  | 'recipe-ingredients'
  | 'recipe-availability'
  | 'recipe-instructions'
  | 'recipe-servings'
  | 'cookable-recipes'
  | 'cookable-with-product'
  | 'help'
  | 'unknown'

export type VoiceAssistantChoice = {
  id: string
  label: string
  query: string
}

export type VoiceAssistantAction = {
  kind: 'open-recipe'
  recipeId: string
  label: string
}

export type VoiceAssistantReply = {
  intent: VoiceReadOnlyIntent
  title: string
  text: string
  spokenText: string
  details?: string[]
  choices?: VoiceAssistantChoice[]
  action?: VoiceAssistantAction
}

function hasAny(text: string, patterns: readonly string[]) {
  return patterns.some((pattern) => text.includes(pattern))
}

export function classifyReadOnlyVoiceIntent(query: string): VoiceReadOnlyIntent {
  const text = foldPolishText(query)
  if (!text) return 'unknown'

  if (hasAny(text, ['co potrafisz', 'pomoc', 'jakie pytania', 'co moge zapytac'])) return 'help'

  if (hasAny(text, ['co moge ugotowac z ', 'co moge zrobic z ', 'co ugotuje z '])) return 'cookable-with-product'
  if (hasAny(text, ['co moge ugotowac', 'co moge zrobic do jedzenia', 'co ugotowac', 'co moge przygotowac'])) return 'cookable-recipes'

  if (hasAny(text, ['czy mam wszystko do ', 'czy mam skladniki do ', 'czy mam wszystko na ', 'czy wystarczy mi na '])) return 'recipe-availability'
  if (hasAny(text, ['jak zrobic ', 'jak przygotowac ', 'jak ugotowac '])) return 'recipe-instructions'
  if (hasAny(text, ['skladniki do ', 'skladniki na ', 'czego potrzebuje do ', 'co potrzeba do '])) return 'recipe-ingredients'
  if (hasAny(text, ['ile porcji ', 'na ile porcji '])) return 'recipe-servings'
  if (hasAny(text, ['przepis na ', 'pokaz przepis', 'znajdz przepis', 'otworz przepis'])) return 'recipe-summary'

  if (hasAny(text, ['lista zakupow', 'na liscie zakupow', 'co mam kupic', 'co jest do kupienia', 'co jest na zakupy'])) return 'shopping-list'

  if (hasAny(text, ['co mam w lodow', 'co jest w lodow', 'co mam w zamraz', 'co jest w zamraz', 'co mam w szaf', 'co jest w szaf', 'co mam w spizar', 'co jest w spizar', 'co mam w przypraw', 'co jest w przypraw', 'co mam w domow', 'co jest w domow'])) return 'inventory-location'
  if (hasAny(text, ['co mam w zapasach', 'co jest w zapasach', 'pokaz zapasy'])) return 'inventory-all'
  if (hasAny(text, ['ile mam ', 'ile zostalo ', 'czy mam ', 'jaki mam stan ', 'jaki jest stan ', 'sprawdz stan ', 'pokaz stan ', 'stan produktu '])) return 'inventory-product'

  return 'unknown'
}

function formatLotQuantity(lot: Pick<InventoryLot, 'quantity' | 'unitSymbol' | 'packageContentValue' | 'packageContentUnitSymbol'>) {
  const base = `${formatQuantity(lot.quantity)} ${lot.unitSymbol}`
  if (lot.packageContentValue === null || !lot.packageContentUnitSymbol) return base
  return `${base} po ${formatQuantity(lot.packageContentValue)} ${lot.packageContentUnitSymbol}`
}

function formatShoppingItem(item: ShoppingItem) {
  return `${formatQuantity(item.quantity)} ${item.unitSymbol} · ${item.name}`
}

function describeResource(resource: InventoryResource) {
  if (resource.product.inventoryTrackingMode === 'presence') {
    return resource.present ? 'Mam' : 'Brak'
  }
  return `${formatQuantity(resource.quantity)} ${resource.unitSymbol}`
}

function locationLabel(context: VoiceKitchenContext, locationId: string) {
  return context.recipes.inventory.locations.find((location) => location.id === locationId)?.name ?? 'Nieznana lokalizacja'
}

function recipeMatchingInput(recipe: RecipeReadItem) {
  return {
    id: recipe.id,
    baseServings: recipe.servings,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      productId: ingredient.productId,
      quantity: ingredient.quantity,
      unitCode: ingredient.unitCode,
      packageContentValue: ingredient.packageContentValue,
      packageContentUnitCode: ingredient.packageContentUnitCode,
    })),
  }
}

function getRecipeMatch(context: VoiceKitchenContext, recipe: RecipeReadItem): RecipeMatchResult {
  const inventoryLots = context.recipes.inventory.groups.flatMap((group) => group.lots).map((lot) => ({
    productId: lot.productId,
    quantity: lot.quantity,
    unitCode: lot.unitCode,
    packageContentValue: lot.packageContentValue,
    packageContentUnitCode: lot.packageContentUnitCode,
  }))

  return matchRecipe({
    recipe: recipeMatchingInput(recipe),
    products: context.recipes.inventory.products,
    units: context.recipes.inventory.units,
    inventoryLots,
  })
}

function resolveRecipe(context: VoiceKitchenContext, query: string, intent: VoiceReadOnlyIntent): VoiceAssistantReply | RecipeReadItem {
  const resolution = resolveVoiceEntity({
    query,
    values: context.recipes.recipes,
    getLabel: (recipe) => recipe.name,
    minScore: 0.67,
  })

  if (resolution.kind === 'matched') return resolution.value
  if (resolution.kind === 'ambiguous') {
    const prefix = intent === 'recipe-ingredients'
      ? 'składniki do '
      : intent === 'recipe-availability'
        ? 'czy mam wszystko do '
        : intent === 'recipe-instructions'
          ? 'jak zrobić '
          : intent === 'recipe-servings'
            ? 'ile porcji ma '
            : 'przepis na '
    return {
      intent,
      title: 'Który przepis?',
      text: 'Znalazłem kilka podobnych przepisów. Wybierz właściwy.',
      spokenText: `Znalazłem kilka podobnych przepisów: ${resolution.candidates.map((candidate) => candidate.value.name).join(', ')}. Który masz na myśli?`,
      choices: resolution.candidates.map((candidate) => ({
        id: candidate.value.id,
        label: candidate.value.name,
        query: `${prefix}${candidate.value.name}`,
      })),
    }
  }

  return {
    intent,
    title: 'Nie znalazłem przepisu',
    text: 'Nie udało mi się dopasować nazwy do żadnego zapisanego przepisu.',
    spokenText: 'Nie znalazłem takiego przepisu. Powiedz jego nazwę jeszcze raz.',
  }
}

function resolveProduct(context: VoiceKitchenContext, query: string, intent: VoiceReadOnlyIntent): VoiceAssistantReply | VoiceKitchenContext['recipes']['inventory']['products'][number] {
  const resolution = resolveVoiceEntity({
    query,
    values: context.recipes.inventory.products,
    getLabel: (product) => product.name,
    minScore: 0.66,
  })

  if (resolution.kind === 'matched') return resolution.value
  if (resolution.kind === 'ambiguous') {
    const prefix = intent === 'cookable-with-product' ? 'co mogę ugotować z ' : 'ile mam '
    return {
      intent,
      title: 'Który produkt?',
      text: 'Znalazłem kilka podobnych produktów. Wybierz właściwy.',
      spokenText: `Mam kilka podobnych produktów: ${resolution.candidates.map((candidate) => candidate.value.name).join(', ')}. Który masz na myśli?`,
      choices: resolution.candidates.map((candidate) => ({
        id: candidate.value.id,
        label: candidate.value.name,
        query: `${prefix}${candidate.value.name}`,
      })),
    }
  }

  return {
    intent,
    title: 'Nie znalazłem produktu',
    text: 'Nie udało mi się dopasować pytania do produktu z katalogu Kitchen.',
    spokenText: 'Nie znalazłem takiego produktu. Powiedz nazwę jeszcze raz.',
  }
}

function locationAliases(location: InventoryLocation) {
  const aliases: Record<InventoryLocation['kind'], string[]> = {
    fridge: ['lodowka', 'lodowce', 'lodowki', 'lodowke'],
    freezer: ['zamrazarka', 'zamrazarce', 'zamrazarki'],
    pantry: ['szafka', 'szafce', 'szafki', 'spizarnia', 'spizarni'],
    spices: ['przyprawy', 'przyprawach'],
    household: ['domowe', 'domowych'],
    custom: [],
  }
  return [location.name, ...aliases[location.kind]]
}

function resolveLocation(context: VoiceKitchenContext, query: string): InventoryLocation | null {
  const locations = context.recipes.inventory.locations
  const scored = locations.map((location) => ({
    location,
    score: Math.max(...locationAliases(location).map((alias) => phraseSimilarity(alias, query))),
  })).sort((a, b) => b.score - a.score)

  if (!scored[0] || scored[0].score < 0.68) return null
  if (scored[1] && scored[0].score - scored[1].score < 0.075) return null
  return scored[0].location
}

function answerInventoryProduct(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const resolved = resolveProduct(context, query, 'inventory-product')
  if ('intent' in resolved) return resolved
  const product = resolved

  const resource = context.recipes.inventory.groups
    .flatMap((group) => group.resources)
    .find((entry) => entry.product.id === product.id)

  if (resource) {
    if (resource.product.inventoryTrackingMode === 'presence') {
      return resource.present
        ? {
            intent: 'inventory-product',
            title: product.name,
            text: 'Status: Mam · Przyprawy',
            spokenText: `Masz ${product.name}. Produkt jest oznaczony jako mam w Przyprawach.`,
          }
        : {
            intent: 'inventory-product',
            title: product.name,
            text: 'Status: Brak · Przyprawy',
            spokenText: `Nie masz teraz ${product.name}. W Przyprawach jest oznaczony jako brak.`,
          }
    }

    return {
      intent: 'inventory-product',
      title: product.name,
      text: `${describeResource(resource)} · Domowe`,
      spokenText: `Masz ${formatQuantity(resource.quantity)} ${resource.unitSymbol} produktu ${product.name} w Domowe.`,
    }
  }

  const lots = context.recipes.inventory.groups.flatMap((group) => group.lots).filter((lot) => lot.productId === product.id)
  if (lots.length === 0) {
    return {
      intent: 'inventory-product',
      title: product.name,
      text: 'Brak w aktualnych zapasach.',
      spokenText: `Nie masz teraz produktu ${product.name} w zapasach.`,
    }
  }

  const groups = new Map<string, { locationId: string; unitSymbol: string; packageContentValue: number | null; packageContentUnitSymbol: string | null; quantities: number[] }>()
  for (const lot of lots) {
    const key = [lot.storageLocationId, lot.unitCode, lot.packageContentValue ?? '', lot.packageContentUnitCode ?? ''].join('|')
    const current = groups.get(key) ?? {
      locationId: lot.storageLocationId,
      unitSymbol: lot.unitSymbol,
      packageContentValue: lot.packageContentValue,
      packageContentUnitSymbol: lot.packageContentUnitSymbol,
      quantities: [],
    }
    current.quantities.push(lot.quantity)
    groups.set(key, current)
  }

  const details = Array.from(groups.values()).map((entry) => {
    const quantity = sumQuantities(entry.quantities, 'Łączny stan produktu przekracza dozwolony zakres.')
    const lot: Pick<InventoryLot, 'quantity' | 'unitSymbol' | 'packageContentValue' | 'packageContentUnitSymbol'> = {
      quantity,
      unitSymbol: entry.unitSymbol,
      packageContentValue: entry.packageContentValue,
      packageContentUnitSymbol: entry.packageContentUnitSymbol,
    }
    return `${locationLabel(context, entry.locationId)} · ${formatLotQuantity(lot)}`
  })

  return {
    intent: 'inventory-product',
    title: product.name,
    text: details.join(' • '),
    spokenText: `Masz ${product.name}: ${details.join('; ')}.`,
    details,
  }
}

function answerInventoryLocation(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const location = resolveLocation(context, query)
  if (!location) {
    return {
      intent: 'inventory-location',
      title: 'Która lokalizacja?',
      text: 'Nie udało mi się jednoznacznie rozpoznać lokalizacji.',
      spokenText: 'Nie jestem pewien, o którą lokalizację chodzi. Powiedz na przykład lodówka, zamrażarka albo szafka.',
    }
  }

  const group = context.recipes.inventory.groups.find((entry) => entry.location.id === location.id)
  if (!group) {
    return {
      intent: 'inventory-location',
      title: location.name,
      text: 'Brak danych dla tej lokalizacji.',
      spokenText: `Nie mam danych dla lokalizacji ${location.name}.`,
    }
  }

  const detailRows: string[] = []
  const productLots = new Map<string, InventoryLot[]>()
  for (const lot of group.lots) {
    const current = productLots.get(lot.productId) ?? []
    current.push(lot)
    productLots.set(lot.productId, current)
  }

  for (const lots of productLots.values()) {
    const first = lots[0]
    const compatible = lots.every((lot) => (
      lot.unitCode === first.unitCode
      && lot.packageContentValue === first.packageContentValue
      && lot.packageContentUnitCode === first.packageContentUnitCode
    ))
    if (compatible) {
      const quantity = sumQuantities(lots.map((lot) => lot.quantity), 'Łączny stan lokalizacji przekracza dozwolony zakres.')
      detailRows.push(`${first.productName} · ${formatLotQuantity({ ...first, quantity })}`)
    } else {
      for (const lot of lots) detailRows.push(`${lot.productName} · ${formatLotQuantity(lot)}`)
    }
  }

  for (const resource of group.resources) {
    if (resource.product.inventoryTrackingMode === 'presence') {
      if (resource.present) detailRows.push(`${resource.product.name} · Mam`)
    } else if (resource.quantity > 0) {
      detailRows.push(`${resource.product.name} · ${formatQuantity(resource.quantity)} ${resource.unitSymbol}`)
    }
  }

  detailRows.sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' }))

  if (detailRows.length === 0) {
    return {
      intent: 'inventory-location',
      title: location.name,
      text: 'Brak aktualnego stanu.',
      spokenText: `W lokalizacji ${location.name} nie ma teraz żadnych aktywnych zapasów.`,
    }
  }

  const spokenPreview = detailRows.slice(0, 5)
  const remaining = detailRows.length - spokenPreview.length
  const spokenTail = remaining > 0 ? `, oraz jeszcze ${remaining} ${remaining === 1 ? 'pozycja' : 'pozycje'}` : ''

  return {
    intent: 'inventory-location',
    title: location.name,
    text: `${detailRows.length} ${detailRows.length === 1 ? 'pozycja' : 'pozycji'}`,
    spokenText: `W ${location.name} masz: ${spokenPreview.join('; ')}${spokenTail}.`,
    details: detailRows,
  }
}

function answerInventoryAll(context: VoiceKitchenContext): VoiceAssistantReply {
  const details = context.recipes.inventory.groups
    .map((group) => {
      const standardCount = new Set(group.lots.map((lot) => lot.productId)).size
      const resourceCount = group.resources.filter((resource) => resource.product.inventoryTrackingMode === 'presence' ? resource.present : resource.quantity > 0).length
      const count = standardCount + resourceCount
      return count > 0 ? `${group.location.name} · ${count}` : null
    })
    .filter((value): value is string => Boolean(value))

  return {
    intent: 'inventory-all',
    title: 'Zapasy',
    text: `${context.recipes.inventory.stockedProducts} produktów fizycznie na stanie.`,
    spokenText: details.length > 0
      ? `Masz produkty w następujących lokalizacjach: ${details.join('; ')}.`
      : 'Nie masz teraz żadnych fizycznych zapasów.',
    details,
  }
}

function answerShoppingList(context: VoiceKitchenContext): VoiceAssistantReply {
  const items = context.shopping.activeItems
  if (items.length === 0) {
    return {
      intent: 'shopping-list',
      title: 'Zakupy',
      text: 'Lista zakupów jest pusta.',
      spokenText: 'Lista zakupów jest teraz pusta.',
    }
  }

  const details = items.map(formatShoppingItem)
  const preview = details.slice(0, 5)
  const remaining = details.length - preview.length
  const tail = remaining > 0 ? `, i jeszcze ${remaining} ${remaining === 1 ? 'pozycja' : 'pozycje'}` : ''

  return {
    intent: 'shopping-list',
    title: 'Zakupy',
    text: `${items.length} ${items.length === 1 ? 'pozycja' : 'pozycji'} do kupienia.`,
    spokenText: `Na liście zakupów masz: ${preview.join('; ')}${tail}.`,
    details,
  }
}

function answerRecipeSummary(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const recipe = resolveRecipe(context, query, 'recipe-summary')
  if ('intent' in recipe) return recipe

  const timeParts: string[] = []
  if (recipe.prepTimeMinutes) timeParts.push(`przygotowanie ${formatRecipeDuration(recipe.prepTimeMinutes)}`)
  if (recipe.cookTimeMinutes) timeParts.push(`gotowanie ${formatRecipeDuration(recipe.cookTimeMinutes)}`)
  const timeText = timeParts.length > 0 ? ` · ${timeParts.join(' · ')}` : ''

  return {
    intent: 'recipe-summary',
    title: recipe.name,
    text: `${recipe.servings} ${recipe.servings === 1 ? 'porcja' : 'porcji'} · ${recipe.ingredients.length} składników${timeText}`,
    spokenText: `Mam przepis ${recipe.name}. Jest zapisany na ${recipe.servings} ${recipe.servings === 1 ? 'porcję' : 'porcji'} i ma ${recipe.ingredients.length} składników.`,
    action: { kind: 'open-recipe', recipeId: recipe.id, label: 'Otwórz przepis' },
  }
}

function ingredientDescription(context: VoiceKitchenContext, ingredient: RecipeReadItem['ingredients'][number]) {
  const unit = context.recipes.inventory.units.find((entry) => entry.code === ingredient.unitCode)
  const base = `${ingredient.productName} · ${formatQuantity(ingredient.quantity)} ${ingredient.unitSymbol}`
  if (ingredient.packageContentValue === null || !ingredient.packageContentUnitCode) return base
  const contentUnit = context.recipes.inventory.units.find((entry) => entry.code === ingredient.packageContentUnitCode)
  if (!unit || !contentUnit) return base
  return `${base} po ${formatQuantity(ingredient.packageContentValue)} ${contentUnit.symbol}`
}

function answerRecipeIngredients(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const recipe = resolveRecipe(context, query, 'recipe-ingredients')
  if ('intent' in recipe) return recipe
  const details = recipe.ingredients.map((ingredient) => ingredientDescription(context, ingredient))
  const preview = details.slice(0, 6)
  const remaining = details.length - preview.length

  return {
    intent: 'recipe-ingredients',
    title: `Składniki · ${recipe.name}`,
    text: `${details.length} ${details.length === 1 ? 'składnik' : 'składników'}`,
    spokenText: `Do ${recipe.name} potrzebujesz: ${preview.join('; ')}${remaining > 0 ? `, i jeszcze ${remaining} składników` : ''}.`,
    details,
    action: { kind: 'open-recipe', recipeId: recipe.id, label: 'Otwórz przepis' },
  }
}

function answerRecipeAvailability(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const recipe = resolveRecipe(context, query, 'recipe-availability')
  if ('intent' in recipe) return recipe
  const match = getRecipeMatch(context, recipe)
  const productById = new Map(context.recipes.inventory.products.map((product) => [product.id, product]))

  if (match.state === 'sufficient') {
    return {
      intent: 'recipe-availability',
      title: recipe.name,
      text: 'Masz wszystko do przygotowania przepisu.',
      spokenText: `Tak. Masz wszystko, czego potrzebujesz do przepisu ${recipe.name}.`,
      action: { kind: 'open-recipe', recipeId: recipe.id, label: 'Otwórz przepis' },
    }
  }

  const missing = match.groups.filter((group) => group.state === 'missing').map((group) => productById.get(group.productId)?.name ?? 'Nieznany produkt')
  const partial = match.groups.filter((group) => group.state === 'partial').map((group) => productById.get(group.productId)?.name ?? 'Nieznany produkt')
  const unresolved = match.groups.filter((group) => group.state === 'unresolved').map((group) => productById.get(group.productId)?.name ?? 'Nieznany produkt')
  const details = [
    ...missing.map((name) => `Brak · ${name}`),
    ...partial.map((name) => `Za mało · ${name}`),
    ...unresolved.map((name) => `Nieustalone · ${name}`),
  ]

  const spokenParts: string[] = []
  if (missing.length > 0) spokenParts.push(`brakuje: ${missing.join(', ')}`)
  if (partial.length > 0) spokenParts.push(`masz za mało: ${partial.join(', ')}`)
  if (unresolved.length > 0) spokenParts.push(`nie mogę jednoznacznie porównać: ${unresolved.join(', ')}`)

  return {
    intent: 'recipe-availability',
    title: recipe.name,
    text: 'Nie masz kompletnego zestawu składników.',
    spokenText: `Nie masz jeszcze wszystkiego do ${recipe.name}. ${spokenParts.join('. ')}.`,
    details,
    action: { kind: 'open-recipe', recipeId: recipe.id, label: 'Otwórz przepis' },
  }
}

function answerRecipeInstructions(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const recipe = resolveRecipe(context, query, 'recipe-instructions')
  if ('intent' in recipe) return recipe
  const instructions = recipe.instructions?.trim()
  if (!instructions) {
    return {
      intent: 'recipe-instructions',
      title: recipe.name,
      text: 'Ten przepis nie ma jeszcze zapisanego sposobu przygotowania.',
      spokenText: `Przepis ${recipe.name} nie ma jeszcze zapisanego sposobu przygotowania.`,
      action: { kind: 'open-recipe', recipeId: recipe.id, label: 'Otwórz przepis' },
    }
  }

  const preview = instructions.length > 260 ? `${instructions.slice(0, 257).trimEnd()}…` : instructions
  return {
    intent: 'recipe-instructions',
    title: recipe.name,
    text: preview,
    spokenText: instructions.length > 320
      ? `Mam zapisany sposób przygotowania ${recipe.name}. Jest dość długi, więc pokażę go w przepisie.`
      : instructions,
    action: { kind: 'open-recipe', recipeId: recipe.id, label: 'Otwórz cały przepis' },
  }
}

function answerRecipeServings(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const recipe = resolveRecipe(context, query, 'recipe-servings')
  if ('intent' in recipe) return recipe
  return {
    intent: 'recipe-servings',
    title: recipe.name,
    text: `${recipe.servings} ${recipe.servings === 1 ? 'porcja' : 'porcji'}`,
    spokenText: `Przepis ${recipe.name} jest zapisany na ${recipe.servings} ${recipe.servings === 1 ? 'porcję' : 'porcji'}.`,
    action: { kind: 'open-recipe', recipeId: recipe.id, label: 'Otwórz przepis' },
  }
}

function answerCookableRecipes(context: VoiceKitchenContext): VoiceAssistantReply {
  const cookable = context.recipes.recipes.filter((recipe) => getRecipeMatch(context, recipe).cookable)
  if (cookable.length === 0) {
    return {
      intent: 'cookable-recipes',
      title: 'Co możesz ugotować',
      text: 'Żaden zapisany przepis nie ma teraz kompletu rozpoznanych składników.',
      spokenText: 'Na podstawie aktualnych zapasów nie widzę teraz przepisu, do którego masz komplet rozpoznanych składników.',
    }
  }

  const details = cookable.map((recipe) => recipe.name)
  const preview = details.slice(0, 5)
  const remaining = details.length - preview.length
  return {
    intent: 'cookable-recipes',
    title: 'Możesz ugotować',
    text: `${cookable.length} ${cookable.length === 1 ? 'przepis' : 'przepisów'}`,
    spokenText: `Możesz teraz przygotować: ${preview.join(', ')}${remaining > 0 ? `, i jeszcze ${remaining} przepisów` : ''}.`,
    details,
    choices: cookable.slice(0, 5).map((recipe) => ({ id: recipe.id, label: recipe.name, query: `przepis na ${recipe.name}` })),
  }
}

function answerCookableWithProduct(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const resolved = resolveProduct(context, query, 'cookable-with-product')
  if ('intent' in resolved) return resolved
  const product = resolved
  const matchingRecipes = context.recipes.recipes.filter((recipe) => (
    recipe.ingredients.some((ingredient) => ingredient.productId === product.id)
    && getRecipeMatch(context, recipe).cookable
  ))

  if (matchingRecipes.length === 0) {
    return {
      intent: 'cookable-with-product',
      title: product.name,
      text: 'Nie znalazłem teraz gotowego do ugotowania przepisu z tym produktem.',
      spokenText: `Nie widzę teraz przepisu z produktem ${product.name}, do którego masz komplet składników.`,
    }
  }

  return {
    intent: 'cookable-with-product',
    title: `Z ${product.name}`,
    text: matchingRecipes.map((recipe) => recipe.name).join(' • '),
    spokenText: `Z produktem ${product.name} możesz teraz przygotować: ${matchingRecipes.slice(0, 5).map((recipe) => recipe.name).join(', ')}.`,
    details: matchingRecipes.map((recipe) => recipe.name),
    choices: matchingRecipes.slice(0, 5).map((recipe) => ({ id: recipe.id, label: recipe.name, query: `przepis na ${recipe.name}` })),
  }
}

function answerHelp(): VoiceAssistantReply {
  const details = [
    '„Ile mam mleka?”',
    '„Co mam w lodówce?”',
    '„Co jest na liście zakupów?”',
    '„Pokaż przepis na lasagne.”',
    '„Czy mam wszystko do lasagne?”',
    '„Jakie są składniki do lasagne?”',
    '„Co mogę ugotować?”',
  ]
  return {
    intent: 'help',
    title: 'Pytania bez zmian danych',
    text: 'Na tym etapie tylko sprawdzam dane Kitchen. Niczego nie dodaję, nie usuwam i nie oznaczam jako kupione.',
    spokenText: 'Na razie mogę sprawdzać zapasy, listę zakupów i zapisane przepisy. Nie zmieniam jeszcze żadnych danych.',
    details,
  }
}

export function answerReadOnlyKitchenQuery(context: VoiceKitchenContext, query: string): VoiceAssistantReply {
  const intent = classifyReadOnlyVoiceIntent(query)

  switch (intent) {
    case 'inventory-product':
      return answerInventoryProduct(context, query)
    case 'inventory-location':
      return answerInventoryLocation(context, query)
    case 'inventory-all':
      return answerInventoryAll(context)
    case 'shopping-list':
      return answerShoppingList(context)
    case 'recipe-summary':
      return answerRecipeSummary(context, query)
    case 'recipe-ingredients':
      return answerRecipeIngredients(context, query)
    case 'recipe-availability':
      return answerRecipeAvailability(context, query)
    case 'recipe-instructions':
      return answerRecipeInstructions(context, query)
    case 'recipe-servings':
      return answerRecipeServings(context, query)
    case 'cookable-recipes':
      return answerCookableRecipes(context)
    case 'cookable-with-product':
      return answerCookableWithProduct(context, query)
    case 'help':
      return answerHelp()
    default:
      return {
        intent: 'unknown',
        title: 'Nie rozumiem pytania',
        text: 'Spróbuj zapytać o stan produktu, lokalizację, zakupy albo zapisany przepis.',
        spokenText: 'Nie rozumiem jeszcze tego pytania. Możesz zapytać na przykład ile masz mleka, co jest w lodówce albo czy masz wszystko do wybranego przepisu.',
        details: ['„Ile mam mleka?”', '„Co mam w lodówce?”', '„Czy mam wszystko do lasagne?”'],
      }
  }
}
