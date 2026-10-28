import type { VoiceReadOnlyIntent } from '../voiceReadOnlyAssistant.ts'
import { foldPolishText, phraseSimilarity } from '../voiceTextMatch.ts'
import type { VoiceIntentPrediction } from './hashedCharIntentClassifier.ts'
import { HashedCharIntentClassifier } from './hashedCharIntentClassifier.ts'
import { resolveContextEntity, type ContextEntityResolution } from './phoneticEntityEvidence.ts'
import { VOICE_INTENT_TRAINING_EXAMPLES } from './contextEvaluationCorpus.ts'

export type VoiceInputOrigin = 'speech' | 'typed'
export type VoiceContextEntityKind = 'product' | 'recipe' | 'location'

export type VoiceContextEntity = {
  id: string
  label: string
}

export type VoiceContextCandidateSet = {
  products: readonly VoiceContextEntity[]
  recipes: readonly VoiceContextEntity[]
  locations: readonly VoiceContextEntity[]
}

export type VoiceConversationState = {
  activeTopic: 'inventory' | 'shopping' | 'recipe' | 'cookable' | null
  activeProductId: string | null
  activeRecipeId: string | null
  activeLocationId: string | null
  lastIntent: VoiceReadOnlyIntent | null
}

export type VoiceContextInterpretation = {
  rawText: string
  origin: VoiceInputOrigin
  intent: VoiceReadOnlyIntent
  intentPrediction: VoiceIntentPrediction
  confidence: number
  decision: 'answer' | 'clarify' | 'repeat'
  entity?: {
    kind: VoiceContextEntityKind
    id: string
    label: string
    score: number
    lexicalScore: number
    phoneticScore: number
    contextScore: number
  }
  location?: {
    id: string
    label: string
    score: number
  }
  clarificationChoices?: VoiceContextEntity[]
  interpretedSummary: string
  nextConversation: VoiceConversationState
}

export const EMPTY_VOICE_CONVERSATION_STATE: VoiceConversationState = {
  activeTopic: null,
  activeProductId: null,
  activeRecipeId: null,
  activeLocationId: null,
  lastIntent: null,
}

const RECIPE_INTENTS = new Set<VoiceReadOnlyIntent>([
  'recipe-summary',
  'recipe-ingredients',
  'recipe-availability',
  'recipe-instructions',
  'recipe-servings',
])

function topicForIntent(intent: VoiceReadOnlyIntent): VoiceConversationState['activeTopic'] {
  if (RECIPE_INTENTS.has(intent)) return 'recipe'
  if (intent === 'shopping-list') return 'shopping'
  if (intent === 'cookable-recipes' || intent === 'cookable-with-product') return 'cookable'
  if (intent === 'inventory-product' || intent === 'inventory-location' || intent === 'inventory-all') return 'inventory'
  return null
}

function tokenCount(value: string) {
  const folded = foldPolishText(value)
  return folded ? folded.split(' ').length : 0
}

function isEllipticalFollowup(value: string) {
  const folded = foldPolishText(value)
  if (!folded) return false
  if (tokenCount(folded) > 5) return false
  const tokens = new Set(folded.split(' '))
  return ['a', 'ile', 'co', 'tego', 'tam', 'jeszcze', 'wszystko', 'brakuje'].some((token) => tokens.has(token))
}

function strongestEntitySignal(query: string, values: readonly VoiceContextEntity[]) {
  return values.reduce((best, value) => Math.max(best, phraseSimilarity(value.label, query)), 0)
}

function confidenceFromPrediction(prediction: VoiceIntentPrediction) {
  const marginScore = Math.min(1, prediction.margin * 2.2)
  return Math.max(0, Math.min(1, prediction.score * 0.72 + marginScore * 0.28))
}

function mapResolvedEntity(
  kind: VoiceContextEntityKind,
  resolution: ContextEntityResolution<VoiceContextEntity>,
): VoiceContextInterpretation['entity'] | undefined {
  if (resolution.decision !== 'match') return undefined
  return {
    kind,
    id: resolution.candidate.value.id,
    label: resolution.candidate.value.label,
    score: resolution.candidate.score,
    lexicalScore: resolution.candidate.lexicalScore,
    phoneticScore: resolution.candidate.phoneticScore,
    contextScore: resolution.candidate.contextScore,
  }
}

function interpretationSummary(intent: VoiceReadOnlyIntent, entity?: VoiceContextInterpretation['entity'], location?: VoiceContextInterpretation['location']) {
  const intentLabels: Record<VoiceReadOnlyIntent, string> = {
    'inventory-product': 'stan produktu',
    'inventory-location': 'zawartość lokalizacji',
    'inventory-all': 'przegląd zapasów',
    'shopping-list': 'lista zakupów',
    'recipe-summary': 'podgląd przepisu',
    'recipe-ingredients': 'składniki przepisu',
    'recipe-availability': 'dostępność składników przepisu',
    'recipe-instructions': 'sposób przygotowania przepisu',
    'recipe-servings': 'liczba porcji przepisu',
    'cookable-recipes': 'przepisy możliwe do ugotowania',
    'cookable-with-product': 'przepisy z produktem',
    help: 'pomoc Kitchen Voice',
    unknown: 'nierozpoznane pytanie',
  }
  const parts = [intentLabels[intent]]
  if (entity) parts.push(`${entity.kind}: ${entity.label}`)
  if (location) parts.push(`lokalizacja: ${location.label}`)
  return parts.join(' · ')
}

export class VoiceContextEnginePrototype {
  private readonly classifier = new HashedCharIntentClassifier().train(VOICE_INTENT_TRAINING_EXAMPLES)

  interpret(input: {
    rawText: string
    origin: VoiceInputOrigin
    candidates: VoiceContextCandidateSet
    conversation?: VoiceConversationState
  }): VoiceContextInterpretation {
    const conversation = input.conversation ?? EMPTY_VOICE_CONVERSATION_STATE
    const prediction = this.classifier.predict(input.rawText)
    let intent = prediction.intent
    let confidence = confidenceFromPrediction(prediction)
    const elliptical = isEllipticalFollowup(input.rawText)

    // Context is a bounded reranking signal, never a replacement for a new explicit entity.
    if (conversation.activeTopic === 'shopping' && elliptical && (prediction.score < 0.68 || intent === 'inventory-product')) {
      intent = 'shopping-list'
      confidence = Math.max(confidence, 0.68)
    }

    let explicitLocationResolution: ContextEntityResolution<VoiceContextEntity> | null = null
    if (input.candidates.locations.length > 0) {
      explicitLocationResolution = resolveContextEntity({
        query: input.rawText,
        values: input.candidates.locations,
        getId: (entry) => entry.id,
        getLabel: (entry) => entry.label,
        activeEntityId: conversation.activeLocationId,
        explicitEntityExpected: true,
        minScore: 0.62,
      })
    }

    // A short location follow-up after a product question means the same product scoped to the new location.
    if (
      conversation.activeProductId
      && elliptical
      && explicitLocationResolution?.decision === 'match'
      && intent === 'inventory-location'
    ) {
      intent = 'inventory-product'
      confidence = Math.max(confidence, 0.76)
    }

    let entity: VoiceContextInterpretation['entity']
    let entityResolution: ContextEntityResolution<VoiceContextEntity> | null = null

    if (RECIPE_INTENTS.has(intent)) {
      const explicitSignal = strongestEntitySignal(input.rawText, input.candidates.recipes)
      entityResolution = resolveContextEntity({
        query: input.rawText,
        values: input.candidates.recipes,
        getId: (entry) => entry.id,
        getLabel: (entry) => entry.label,
        activeEntityId: conversation.activeRecipeId,
        explicitEntityExpected: explicitSignal >= 0.5,
        minScore: explicitSignal >= 0.5 ? 0.57 : 0.2,
      })
      entity = mapResolvedEntity('recipe', entityResolution)
    } else if (intent === 'inventory-product' || intent === 'cookable-with-product') {
      const explicitSignal = strongestEntitySignal(input.rawText, input.candidates.products)
      entityResolution = resolveContextEntity({
        query: input.rawText,
        values: input.candidates.products,
        getId: (entry) => entry.id,
        getLabel: (entry) => entry.label,
        activeEntityId: conversation.activeProductId,
        explicitEntityExpected: explicitSignal >= 0.5,
        minScore: explicitSignal >= 0.5 ? 0.57 : 0.2,
      })
      entity = mapResolvedEntity('product', entityResolution)
    } else if (intent === 'inventory-location') {
      entityResolution = explicitLocationResolution
      entity = explicitLocationResolution ? mapResolvedEntity('location', explicitLocationResolution) : undefined
    }

    let location: VoiceContextInterpretation['location']
    if (intent === 'inventory-product' && explicitLocationResolution?.decision === 'match') {
      location = {
        id: explicitLocationResolution.candidate.value.id,
        label: explicitLocationResolution.candidate.value.label,
        score: explicitLocationResolution.candidate.score,
      }
    }

    const requiresEntity = RECIPE_INTENTS.has(intent) || intent === 'inventory-product' || intent === 'cookable-with-product' || intent === 'inventory-location'
    let decision: VoiceContextInterpretation['decision'] = 'answer'
    let clarificationChoices: VoiceContextEntity[] | undefined

    if (intent === 'unknown') {
      decision = 'repeat'
    } else if (requiresEntity && entityResolution?.decision === 'clarify') {
      decision = 'clarify'
      clarificationChoices = entityResolution.candidates.map((candidate) => candidate.value)
      confidence = Math.min(confidence, 0.59)
    } else if (requiresEntity && !entity) {
      decision = confidence >= 0.5 ? 'clarify' : 'repeat'
      clarificationChoices = entityResolution?.candidates.filter((candidate) => candidate.score >= 0.35).map((candidate) => candidate.value)
    } else if (confidence < 0.42) {
      decision = 'repeat'
    } else if (confidence < 0.6) {
      decision = 'clarify'
    }

    const nextConversation: VoiceConversationState = {
      activeTopic: topicForIntent(intent) ?? conversation.activeTopic,
      activeProductId: entity?.kind === 'product' ? entity.id : (intent === 'inventory-product' ? conversation.activeProductId : conversation.activeProductId),
      activeRecipeId: entity?.kind === 'recipe' ? entity.id : (RECIPE_INTENTS.has(intent) ? conversation.activeRecipeId : conversation.activeRecipeId),
      activeLocationId: location?.id ?? (entity?.kind === 'location' ? entity.id : conversation.activeLocationId),
      lastIntent: intent,
    }

    return {
      rawText: input.rawText,
      origin: input.origin,
      intent,
      intentPrediction: prediction,
      confidence,
      decision,
      entity,
      location,
      clarificationChoices,
      interpretedSummary: interpretationSummary(intent, entity, location),
      nextConversation,
    }
  }
}
