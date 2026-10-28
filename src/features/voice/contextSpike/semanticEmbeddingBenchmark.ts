import type { VoiceReadOnlyIntent } from '../voiceReadOnlyAssistant.ts'
import { VOICE_SEMANTIC_INTENT_PROTOTYPES, type VoiceIntentPrototype } from './contextEvaluationCorpus.ts'

export const SEMANTIC_BENCHMARK_MODEL_ID = 'Xenova/distiluse-base-multilingual-cased-v2'
export const SEMANTIC_BENCHMARK_MODEL_REVISION = 'cad454171d918d9873a2701ba245054b6c1760dd'
export const SEMANTIC_BENCHMARK_DTYPE = 'q8'
export const SEMANTIC_BENCHMARK_DEVICE = 'wasm'

export type SemanticProgress = {
  status?: string
  file?: string
  loaded?: number
  total?: number
}

export type SemanticIntentScore = {
  intent: VoiceReadOnlyIntent
  score: number
}

export type SemanticBenchmarkInitResult = {
  modelId: string
  revision: string
  dtype: string
  device: string
  loadMs: number
  storageBefore: StorageEstimate
  storageAfter: StorageEstimate
  downloads: Array<{ file: string; loaded: number; total: number }>
}

type StorageEstimate = {
  usage: number | null
  quota: number | null
}

type FeatureTensor = {
  tolist(): unknown
}

type FeatureExtractor = (
  input: string | string[],
  options: { pooling: 'mean'; normalize: true },
) => Promise<FeatureTensor>

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

async function storageEstimate(): Promise<StorageEstimate> {
  try {
    const value = await navigator.storage?.estimate?.()
    return { usage: value?.usage ?? null, quota: value?.quota ?? null }
  } catch {
    return { usage: null, quota: null }
  }
}

function dot(left: readonly number[], right: readonly number[]) {
  let total = 0
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index += 1) total += left[index] * right[index]
  return total
}

function rowsFromTensor(tensor: FeatureTensor): number[][] {
  const raw = tensor.tolist()
  if (!Array.isArray(raw)) return []
  if (raw.length === 0) return []
  if (Array.isArray(raw[0]) && typeof raw[0][0] === 'number') return raw as number[][]
  return []
}

export class DistilUseSemanticBenchmark {
  private extractor: FeatureExtractor | null = null
  private prototypeVectors = new Map<VoiceReadOnlyIntent, number[][]>()
  private progressListeners = new Set<(progress: SemanticProgress) => void>()
  private downloads = new Map<string, { file: string; loaded: number; total: number }>()

  onProgress(listener: (progress: SemanticProgress) => void) {
    this.progressListeners.add(listener)
    return () => this.progressListeners.delete(listener)
  }

  async initialize(prototypes: readonly VoiceIntentPrototype[] = VOICE_SEMANTIC_INTENT_PROTOTYPES): Promise<SemanticBenchmarkInitResult> {
    const storageBefore = await storageEstimate()
    const started = now()
    const transformers = await import('@huggingface/transformers')
    transformers.env.allowLocalModels = false
    transformers.env.allowRemoteModels = true
    transformers.env.useBrowserCache = true
    transformers.env.useWasmCache = true
    const extractor = await transformers.pipeline('feature-extraction', SEMANTIC_BENCHMARK_MODEL_ID, {
      revision: SEMANTIC_BENCHMARK_MODEL_REVISION,
      dtype: SEMANTIC_BENCHMARK_DTYPE,
      device: SEMANTIC_BENCHMARK_DEVICE,
      progress_callback: (progress: SemanticProgress) => {
        if (progress.file && typeof progress.loaded === 'number' && typeof progress.total === 'number') {
          this.downloads.set(progress.file, { file: progress.file, loaded: progress.loaded, total: progress.total })
        }
        for (const listener of this.progressListeners) listener(progress)
      },
    })
    this.extractor = extractor as unknown as FeatureExtractor

    const embeddings = await this.embed(prototypes.map((prototype) => prototype.text))
    this.prototypeVectors.clear()
    prototypes.forEach((prototype, index) => {
      const current = this.prototypeVectors.get(prototype.intent) ?? []
      const vector = embeddings[index]
      if (vector) current.push(vector)
      this.prototypeVectors.set(prototype.intent, current)
    })

    const storageAfter = await storageEstimate()
    return {
      modelId: SEMANTIC_BENCHMARK_MODEL_ID,
      revision: SEMANTIC_BENCHMARK_MODEL_REVISION,
      dtype: SEMANTIC_BENCHMARK_DTYPE,
      device: SEMANTIC_BENCHMARK_DEVICE,
      loadMs: now() - started,
      storageBefore,
      storageAfter,
      downloads: Array.from(this.downloads.values()),
    }
  }

  async scoreIntent(text: string): Promise<SemanticIntentScore[]> {
    const [result] = await this.scoreMany([text])
    return result ?? []
  }

  async scoreMany(texts: readonly string[]): Promise<SemanticIntentScore[][]> {
    if (!this.extractor) throw new Error('Benchmark semantyczny nie został zainicjalizowany.')
    const queryVectors = await this.embed([...texts])
    return queryVectors.map((queryVector) => (
      Array.from(this.prototypeVectors.entries()).map(([intent, vectors]) => ({
        intent,
        score: vectors.reduce((best, vector) => Math.max(best, dot(queryVector, vector)), -1),
      })).sort((left, right) => right.score - left.score)
    ))
  }

  dispose() {
    const maybeDispose = this.extractor as unknown as { dispose?: () => Promise<void> | void } | null
    void maybeDispose?.dispose?.()
    this.extractor = null
    this.prototypeVectors.clear()
    this.progressListeners.clear()
  }

  private async embed(texts: string[]) {
    if (!this.extractor) throw new Error('Benchmark semantyczny nie został zainicjalizowany.')
    const tensor = await this.extractor(texts, { pooling: 'mean', normalize: true })
    return rowsFromTensor(tensor)
  }
}
