import { classifyReadOnlyVoiceIntent, type VoiceReadOnlyIntent } from '../voiceReadOnlyAssistant.ts'
import {
  VOICE_CONTEXT_EVALUATION_SEQUENCES,
  VOICE_ENTITY_EVALUATION_CASES,
  VOICE_INTENT_HELD_OUT_CASES,
  VOICE_INTENT_TRAINING_EXAMPLES,
  type VoiceIntentEvaluationCategory,
} from './contextEvaluationCorpus.ts'
import { KitchenVoiceContextEngine as VoiceContextEnginePrototype, EMPTY_VOICE_CONVERSATION_STATE, type VoiceContextCandidateSet, type VoiceConversationState } from '../context/voiceContextEngine.ts'
import { HashedCharIntentClassifier } from '../context/hashedCharIntentClassifier.ts'
import { resolveContextEntity } from '../context/phoneticEntityEvidence.ts'

export type CandidateEvaluationRow = {
  id: string
  category: VoiceIntentEvaluationCategory
  text: string
  expectedIntent: VoiceReadOnlyIntent
  literalIntent: VoiceReadOnlyIntent
  microIntent: VoiceReadOnlyIntent
  microScore: number
  microMargin: number
  literalCorrect: boolean
  microCorrect: boolean
}

export type EvaluationSummary = {
  correct: number
  total: number
  accuracy: number
}

export type VoiceContextLocalEvaluationReport = {
  generatedAt: string
  trainingExampleCount: number
  heldOutCount: number
  classifierInitMs: number
  perQueryMs: { average: number; p95: number; max: number }
  literal: EvaluationSummary
  micro: EvaluationSummary
  byCategory: Record<string, { literal: EvaluationSummary; micro: EvaluationSummary }>
  rows: CandidateEvaluationRow[]
  actualPhoneCaseRecovered: boolean
  writeShapedNoiseRejected: boolean
  entity: {
    passed: number
    total: number
    rows: Array<{
      id: string
      expectedDecision: string
      actualDecision: string
      expectedId: string | null
      actualId: string | null
      top: Array<{ id: string; label: string; score: number; lexical: number; phonetic: number }>
      pass: boolean
    }>
  }
  context: {
    passed: number
    total: number
    rows: Array<{
      id: string
      expectedIntent: VoiceReadOnlyIntent
      actualIntent: VoiceReadOnlyIntent
      expectedEntityId?: string
      actualEntityId?: string
      expectedLocationId?: string
      actualLocationId?: string
      decision: string
      pass: boolean
    }>
  }
}

function summarize(correct: number, total: number): EvaluationSummary {
  return { correct, total, accuracy: total > 0 ? correct / total : 0 }
}

function percentile95(values: readonly number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
}

function syntheticContextCandidates(): VoiceContextCandidateSet {
  return {
    products: [
      { id: 'milk', label: 'Mleko' },
      { id: 'eggs', label: 'Jajka' },
      { id: 'passata', label: 'Passata Mutti' },
    ],
    recipes: [
      { id: 'lasagne', label: 'Lasagne' },
      { id: 'omlet', label: 'Omlet' },
    ],
    locations: [
      { id: 'fridge', label: 'Lodówka' },
      { id: 'freezer', label: 'Zamrażarka' },
      { id: 'pantry', label: 'Szafka' },
    ],
  }
}

function stateForSequence(sequence: (typeof VOICE_CONTEXT_EVALUATION_SEQUENCES)[number]): VoiceConversationState {
  const state = { ...EMPTY_VOICE_CONVERSATION_STATE }
  // The evaluation corpus contains both entity-bearing and entity-free initial turns.
  // Narrow the discriminated union before accessing its optional-in-practice `entity` field.
  const initialEntity = 'entity' in sequence.initial ? sequence.initial.entity : undefined
  if (initialEntity?.kind === 'recipe') {
    state.activeTopic = 'recipe'
    state.activeRecipeId = initialEntity.id
  } else if (initialEntity?.kind === 'product') {
    state.activeTopic = 'inventory'
    state.activeProductId = initialEntity.id
  } else if (sequence.initial.expectedIntent === 'shopping-list') {
    state.activeTopic = 'shopping'
  }
  state.lastIntent = sequence.initial.expectedIntent
  return state
}

export function runLocalContextEvaluation(): VoiceContextLocalEvaluationReport {
  const initStarted = performance.now()
  const classifier = new HashedCharIntentClassifier().train(VOICE_INTENT_TRAINING_EXAMPLES)
  const classifierInitMs = performance.now() - initStarted

  const rows: CandidateEvaluationRow[] = []
  const latencies: number[] = []
  const byCategoryAccumulator = new Map<string, { literalCorrect: number; microCorrect: number; total: number }>()
  let literalCorrect = 0
  let microCorrect = 0

  for (const testCase of VOICE_INTENT_HELD_OUT_CASES.filter((entry) => entry.category !== 'context')) {
    const literalIntent = classifyReadOnlyVoiceIntent(testCase.text)
    const started = performance.now()
    const microPrediction = classifier.predict(testCase.text)
    latencies.push(performance.now() - started)
    const literalPass = literalIntent === testCase.expectedIntent
    const microPass = microPrediction.intent === testCase.expectedIntent
    if (literalPass) literalCorrect += 1
    if (microPass) microCorrect += 1

    const accumulator = byCategoryAccumulator.get(testCase.category) ?? { literalCorrect: 0, microCorrect: 0, total: 0 }
    accumulator.total += 1
    if (literalPass) accumulator.literalCorrect += 1
    if (microPass) accumulator.microCorrect += 1
    byCategoryAccumulator.set(testCase.category, accumulator)

    rows.push({
      id: testCase.id,
      category: testCase.category,
      text: testCase.text,
      expectedIntent: testCase.expectedIntent,
      literalIntent,
      microIntent: microPrediction.intent,
      microScore: microPrediction.score,
      microMargin: microPrediction.margin,
      literalCorrect: literalPass,
      microCorrect: microPass,
    })
  }

  const entityRows = VOICE_ENTITY_EVALUATION_CASES.map((testCase) => {
    const resolution = resolveContextEntity({
      query: testCase.utterance,
      values: testCase.candidates,
      getId: (entry) => entry.id,
      getLabel: (entry) => entry.label,
    })
    const actualId = resolution.decision === 'match' ? resolution.candidate.value.id : null
    const pass = resolution.decision === testCase.expectedDecision && actualId === testCase.expectedId
    return {
      id: testCase.id,
      expectedDecision: testCase.expectedDecision,
      actualDecision: resolution.decision,
      expectedId: testCase.expectedId,
      actualId,
      top: resolution.candidates.map((candidate) => ({
        id: candidate.value.id,
        label: candidate.value.label,
        score: candidate.score,
        lexical: candidate.lexicalScore,
        phonetic: candidate.phoneticScore,
      })),
      pass,
    }
  })

  const contextEngine = new VoiceContextEnginePrototype()
  const candidates = syntheticContextCandidates()
  const contextRows = VOICE_CONTEXT_EVALUATION_SEQUENCES.map((sequence) => {
    const result = contextEngine.interpret({
      rawText: sequence.followup.text,
      origin: 'speech',
      candidates,
      conversation: stateForSequence(sequence),
    })
    const expectedEntityId = 'expectedEntityId' in sequence.followup ? sequence.followup.expectedEntityId : undefined
    const expectedLocationId = 'expectedLocationId' in sequence.followup ? sequence.followup.expectedLocationId : undefined
    const pass = result.intent === sequence.followup.expectedIntent
      && (!expectedEntityId || result.entity?.id === expectedEntityId)
      && (!expectedLocationId || result.location?.id === expectedLocationId)
    return {
      id: sequence.id,
      expectedIntent: sequence.followup.expectedIntent,
      actualIntent: result.intent,
      expectedEntityId,
      actualEntityId: result.entity?.id,
      expectedLocationId,
      actualLocationId: result.location?.id,
      decision: result.decision,
      pass,
    }
  })

  const byCategory = Object.fromEntries(Array.from(byCategoryAccumulator.entries()).map(([category, value]) => [category, {
    literal: summarize(value.literalCorrect, value.total),
    micro: summarize(value.microCorrect, value.total),
  }]))

  const actualPhoneRow = rows.find((row) => row.id === 'stt-real-shopping-1')
  const writeNoiseRows = rows.filter((row) => row.id === 'stt-real-milk-1' || row.id === 'stt-real-milk-2')

  return {
    generatedAt: new Date().toISOString(),
    trainingExampleCount: VOICE_INTENT_TRAINING_EXAMPLES.length,
    heldOutCount: rows.length,
    classifierInitMs,
    perQueryMs: {
      average: latencies.reduce((sum, value) => sum + value, 0) / Math.max(1, latencies.length),
      p95: percentile95(latencies),
      max: Math.max(0, ...latencies),
    },
    literal: summarize(literalCorrect, rows.length),
    micro: summarize(microCorrect, rows.length),
    byCategory,
    rows,
    actualPhoneCaseRecovered: actualPhoneRow?.microCorrect === true && actualPhoneRow.literalCorrect === false,
    writeShapedNoiseRejected: writeNoiseRows.length === 2 && writeNoiseRows.every((row) => row.microIntent === 'unknown'),
    entity: {
      passed: entityRows.filter((row) => row.pass).length,
      total: entityRows.length,
      rows: entityRows,
    },
    context: {
      passed: contextRows.filter((row) => row.pass).length,
      total: contextRows.length,
      rows: contextRows,
    },
  }
}
