import { KitchenVoiceContextEngine, EMPTY_VOICE_CONVERSATION_STATE, type VoiceContextInterpretation, type VoiceConversationState, type VoiceInputOrigin } from './context/voiceContextEngine.ts'
import { answerReadOnlyKitchenQuery, type VoiceAssistantReply, type VoiceReadOnlyIntent, type VoiceResolvedReadTarget } from './voiceReadOnlyAssistant.ts'
import type { VoiceKitchenContext } from './voiceKitchenContext.ts'
import { foldPolishText } from './voiceTextMatch.ts'

export type VoiceReadOnlyResult = {
  interpretation: VoiceContextInterpretation
  reply: VoiceAssistantReply
  nextConversation: VoiceConversationState
}

const RECIPE_INTENTS = new Set<VoiceReadOnlyIntent>([
  'recipe-summary', 'recipe-ingredients', 'recipe-availability', 'recipe-instructions', 'recipe-servings',
])

function candidateQuery(intent: VoiceReadOnlyIntent, label: string): string {
  const prefix: Partial<Record<VoiceReadOnlyIntent, string>> = {
    'inventory-product': 'Ile mam ',
    'inventory-location': 'Co mam w ',
    'recipe-summary': 'Pokaż przepis na ',
    'recipe-ingredients': 'Jakie składniki do ',
    'recipe-availability': 'Czy mam wszystko do ',
    'recipe-instructions': 'Jak zrobić ',
    'recipe-servings': 'Ile porcji ma ',
    'cookable-with-product': 'Co mogę ugotować z ',
  }
  return `${prefix[intent] ?? ''}${label}`
}

function askToClarify(interpretation: VoiceContextInterpretation): VoiceAssistantReply {
  const possibleChoices = interpretation.clarificationChoices?.length
    ? interpretation.clarificationChoices
    : interpretation.entity && interpretation.entity.score >= 0.82
      ? [{ id: interpretation.entity.id, label: interpretation.entity.label }]
      : []
  const choices = possibleChoices.slice(0, 3).map((entry) => ({
    id: entry.id,
    label: entry.label,
    query: candidateQuery(interpretation.intent, entry.label),
    ...(RECIPE_INTENTS.has(interpretation.intent) ? {
      confirmedTarget: { intent: interpretation.intent, entity: { kind: 'recipe' as const, id: entry.id } },
    } : interpretation.intent === 'inventory-product' || interpretation.intent === 'cookable-with-product' ? {
      confirmedTarget: { intent: interpretation.intent, entity: { kind: 'product' as const, id: entry.id } },
    } : interpretation.intent === 'inventory-location' ? {
      confirmedTarget: { intent: interpretation.intent, entity: { kind: 'location' as const, id: entry.id } },
    } : {}),
  }))
  return {
    intent: interpretation.intent,
    title: 'Dopytam, żeby nie zgadywać',
    text: choices.length ? 'Czy chodzi Ci o wskazany element? Potwierdź wybór.' : 'Nie jestem pewien, o co pytasz. Spróbuj powiedzieć to inaczej.',
    spokenText: choices.length
      ? `Nie jestem pewien, o który element pytasz. ${choices.map((item) => item.label).join(' czy ')}?`
      : 'Nie jestem pewien, o co pytasz. Spróbuj powiedzieć to inaczej.',
    ...(choices.length ? { choices } : {}),
  }
}

function askToRepeat(): VoiceAssistantReply {
  return {
    intent: 'unknown',
    title: 'Nie rozumiem jeszcze pytania',
    text: 'Powtórz pytanie lub wpisz je ręcznie. Kitchen nie wykona żadnej zmiany.',
    spokenText: 'Nie zrozumiałem pytania. Możesz powiedzieć je jeszcze raz?',
  }
}

// Only narrow, explicit write-shaped requests are blocked. No transcript rewrites or name aliases.
// The classifier's read-only labels never authorize mutations, even for other wording.
function appearsToRequestWrite(raw: string): boolean {
  const text = foldPolishText(raw)
  return /\b(dodaj|dorzuc|wrzuc|zapisz|usun|skasuj|wykasuj|odejmij|kupilem|kupilam|kup|przenies|oznacz|zmien|ustaw)\b/.test(text)
}

export function createKitchenVoiceContextEngine() {
  return new KitchenVoiceContextEngine()
}

// The sole product-read integration point for contextual Voice. No Supabase access and no writes.
// Interpretation returns canonical current IDs. It cannot directly calculate stock or Recipe quantities.
export function interpretAndAnswerReadOnlyKitchen(input: {
  context: VoiceKitchenContext
  rawText: string
  origin: VoiceInputOrigin
  conversation?: VoiceConversationState
  engine: KitchenVoiceContextEngine
}): VoiceReadOnlyResult {
  const conversation = input.conversation ?? EMPTY_VOICE_CONVERSATION_STATE
  const interpretation = input.engine.interpret({
    rawText: input.rawText,
    origin: input.origin,
    conversation,
    candidates: {
      products: input.context.recipes.inventory.products.map((entry) => ({ id: entry.id, label: entry.name })),
      recipes: input.context.recipes.recipes.map((entry) => ({ id: entry.id, label: entry.name })),
      locations: input.context.recipes.inventory.locations.map((entry) => ({ id: entry.id, label: entry.name })),
    },
  })

  if (appearsToRequestWrite(input.rawText) || interpretation.intent === 'unknown') {
    return { interpretation, reply: askToRepeat(), nextConversation: conversation }
  }
  if (interpretation.decision === 'repeat' && (!interpretation.entity || interpretation.entity.score < 0.82)) {
    return { interpretation, reply: askToRepeat(), nextConversation: conversation }
  }
  if (interpretation.decision !== 'answer' || interpretation.confidence < 0.68) {
    return { interpretation, reply: askToClarify(interpretation), nextConversation: conversation }
  }

  const requiresRecipe = RECIPE_INTENTS.has(interpretation.intent)
  const requiresProduct = interpretation.intent === 'inventory-product' || interpretation.intent === 'cookable-with-product'
  const requiresLocation = interpretation.intent === 'inventory-location'
  if ((requiresRecipe && interpretation.entity?.kind !== 'recipe')
    || (requiresProduct && interpretation.entity?.kind !== 'product')
    || (requiresLocation && interpretation.entity?.kind !== 'location')) {
    return { interpretation, reply: askToClarify(interpretation), nextConversation: conversation }
  }

  // Canonical IDs must still exist in the current snapshot. Never invent or re-resolve by wording.
  if (interpretation.entity) {
    const entities = interpretation.entity.kind === 'recipe'
      ? input.context.recipes.recipes
      : interpretation.entity.kind === 'product'
        ? input.context.recipes.inventory.products
        : input.context.recipes.inventory.locations
    if (!entities.some((entry) => entry.id === interpretation.entity?.id)) {
      return { interpretation, reply: askToClarify(interpretation), nextConversation: conversation }
    }
  }

  const locationId = interpretation.location?.id
  if (locationId && !input.context.recipes.inventory.locations.some((entry) => entry.id === locationId)) {
    return { interpretation, reply: askToClarify(interpretation), nextConversation: conversation }
  }

  const resolved: VoiceResolvedReadTarget = {
    intent: interpretation.intent,
    ...(interpretation.entity ? {
      entity: { kind: interpretation.entity.kind, id: interpretation.entity.id },
    } : {}),
    ...(interpretation.intent === 'inventory-product' && locationId ? { locationId } : {}),
  }
  const reply = answerReadOnlyKitchenQuery(input.context, input.rawText, resolved)
  if (reply.intent === 'unknown' || reply.title.includes('niedostępny')) {
    return { interpretation, reply: askToClarify(interpretation), nextConversation: conversation }
  }

  return {
    interpretation,
    reply,
    nextConversation: interpretation.nextConversation,
  }
}

// Selection through the visible clarification UI is deliberate user confirmation.
// It binds directly to the selected LIVE ID rather than re-classifying the same
// ambiguous utterance and trapping the user in a clarification loop.
export function confirmReadOnlyContextChoice(input: {
  context: VoiceKitchenContext
  target: VoiceResolvedReadTarget
  query: string
  conversation: VoiceConversationState
}): { reply: VoiceAssistantReply; nextConversation: VoiceConversationState } {
  const { entity, intent } = input.target
  const validKind = entity && (
    (RECIPE_INTENTS.has(intent) && entity.kind === 'recipe')
    || ((intent === 'inventory-product' || intent === 'cookable-with-product') && entity.kind === 'product')
    || (intent === 'inventory-location' && entity.kind === 'location')
  )
  const collection = entity?.kind === 'recipe'
    ? input.context.recipes.recipes
    : entity?.kind === 'product'
      ? input.context.recipes.inventory.products
      : input.context.recipes.inventory.locations
  if (!validKind || !collection.some((entry) => entry.id === entity.id)) {
    return { reply: askToRepeat(), nextConversation: input.conversation }
  }

  const reply = answerReadOnlyKitchenQuery(input.context, input.query, input.target)
  if (reply.intent === 'unknown' || reply.title.includes('niedostępny')) {
    return { reply: askToRepeat(), nextConversation: input.conversation }
  }
  const activeTopic: VoiceConversationState['activeTopic'] = RECIPE_INTENTS.has(intent)
    ? 'recipe'
    : intent === 'cookable-with-product' ? 'cookable' : 'inventory'
  return {
    reply,
    nextConversation: {
      ...input.conversation,
      activeTopic,
      activeRecipeId: entity.kind === 'recipe' ? entity.id : input.conversation.activeRecipeId,
      activeProductId: entity.kind === 'product' ? entity.id : input.conversation.activeProductId,
      activeLocationId: entity.kind === 'location' ? entity.id : input.conversation.activeLocationId,
      lastIntent: intent,
    },
  }
}
