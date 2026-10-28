import { foldPolishText } from '../voiceTextMatch.ts'
import type { VoiceReadOnlyIntent } from '../voiceReadOnlyAssistant.ts'
import { VOICE_EVALUATION_INTENTS, type VoiceIntentTrainingExample } from './contextEvaluationCorpus.ts'

export type VoiceIntentScore = {
  intent: VoiceReadOnlyIntent
  score: number
}

export type VoiceIntentPrediction = {
  intent: VoiceReadOnlyIntent
  score: number
  margin: number
  candidates: VoiceIntentScore[]
}

type SparseFeature = { index: number; value: number }

const FEATURE_DIMENSION = 4096
const NGRAM_MIN = 2
const NGRAM_MAX = 5

function fnv1a(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function featureIndex(value: string) {
  return fnv1a(value) % FEATURE_DIMENSION
}

function addFeature(counts: Map<number, number>, token: string, weight = 1) {
  const index = featureIndex(token)
  counts.set(index, (counts.get(index) ?? 0) + weight)
}

export function extractHashedVoiceFeatures(text: string): SparseFeature[] {
  const folded = foldPolishText(text)
  if (!folded) return []

  const counts = new Map<number, number>()
  const bounded = `^${folded.replace(/\s+/g, '_')}$`
  for (let size = NGRAM_MIN; size <= NGRAM_MAX; size += 1) {
    for (let index = 0; index + size <= bounded.length; index += 1) {
      addFeature(counts, `c${size}:${bounded.slice(index, index + size)}`)
    }
  }

  const tokens = folded.split(' ').filter(Boolean)
  for (const token of tokens) addFeature(counts, `w:${token}`, 1.35)
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    addFeature(counts, `b:${tokens[index]}_${tokens[index + 1]}`, 1.15)
  }

  let norm = 0
  for (const value of counts.values()) norm += value * value
  norm = Math.sqrt(norm) || 1

  return Array.from(counts.entries()).map(([index, value]) => ({ index, value: value / norm }))
}

function softmax(scores: Float64Array) {
  let max = Number.NEGATIVE_INFINITY
  for (const score of scores) max = Math.max(max, score)
  const output = new Float64Array(scores.length)
  let total = 0
  for (let index = 0; index < scores.length; index += 1) {
    const value = Math.exp(scores[index] - max)
    output[index] = value
    total += value
  }
  for (let index = 0; index < output.length; index += 1) output[index] /= total || 1
  return output
}

export class HashedCharIntentClassifier {
  readonly labels = [...VOICE_EVALUATION_INTENTS]
  private readonly weights = this.labels.map(() => new Float32Array(FEATURE_DIMENSION))
  private readonly bias = new Float32Array(this.labels.length)
  private trained = false

  train(examples: readonly VoiceIntentTrainingExample[]) {
    if (examples.length === 0) throw new Error('Brak przykładów treningowych Context Engine.')

    const rows = examples.map((example) => ({
      labelIndex: this.labels.indexOf(example.intent),
      features: extractHashedVoiceFeatures(example.text),
    }))
    if (rows.some((row) => row.labelIndex < 0)) throw new Error('Corpus zawiera nieobsługiwaną etykietę intentu.')

    const epochs = 84
    const l2 = 0.00002
    for (let epoch = 0; epoch < epochs; epoch += 1) {
      const progress = epoch / Math.max(1, epochs - 1)
      const learningRate = 0.22 * (1 - progress * 0.68)

      // Deterministic rotating start prevents class-order bias without random training.
      const offset = epoch % rows.length
      for (let step = 0; step < rows.length; step += 1) {
        const row = rows[(step + offset) % rows.length]
        const logits = this.scoreFeatures(row.features)
        const probabilities = softmax(logits)

        for (let labelIndex = 0; labelIndex < this.labels.length; labelIndex += 1) {
          const target = labelIndex === row.labelIndex ? 1 : 0
          const error = target - probabilities[labelIndex]
          this.bias[labelIndex] += learningRate * error
          const weights = this.weights[labelIndex]
          for (const feature of row.features) {
            const current = weights[feature.index]
            weights[feature.index] = current + learningRate * (error * feature.value - l2 * current)
          }
        }
      }
    }

    this.trained = true
    return this
  }

  predict(text: string, limit = 4): VoiceIntentPrediction {
    if (!this.trained) throw new Error('Klasyfikator Context Engine nie został wytrenowany.')
    const probabilities = softmax(this.scoreFeatures(extractHashedVoiceFeatures(text)))
    const candidates = this.labels
      .map((intent, index) => ({ intent, score: probabilities[index] }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)

    const best = candidates[0] ?? { intent: 'unknown' as const, score: 0 }
    const second = candidates[1]?.score ?? 0
    return {
      intent: best.intent,
      score: best.score,
      margin: best.score - second,
      candidates,
    }
  }

  private scoreFeatures(features: readonly SparseFeature[]) {
    const scores = new Float64Array(this.labels.length)
    for (let labelIndex = 0; labelIndex < this.labels.length; labelIndex += 1) {
      const weights = this.weights[labelIndex]
      let score = this.bias[labelIndex]
      for (const feature of features) score += weights[feature.index] * feature.value
      scores[labelIndex] = score
    }
    return scores
  }
}
