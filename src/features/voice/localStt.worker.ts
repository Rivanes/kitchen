/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers'
import type { LocalSttBackend } from './localSttTypes'

const MODEL_ID = 'onnx-community/whisper-tiny'
const MODEL_REVISION = 'ff4177021cc41f7db950912b73ea4fdf7d01d8e7'

type PipelineInstance = any

type WorkerRequest =
  | { id: number; type: 'capability'; backend: LocalSttBackend }
  | { id: number; type: 'initialize'; backend: LocalSttBackend }
  | { id: number; type: 'transcribe'; audio: ArrayBuffer; audioDurationMs: number }
  | { id: number; type: 'dispose' }

type ProgressPayload = {
  status?: string
  file?: string
  loaded?: number
  total?: number
  progress?: number
}

let transcriber: PipelineInstance | null = null
let activeBackend: LocalSttBackend | null = null
let modelLoadMs = 0

function post(message: unknown) {
  self.postMessage(message)
}

async function detectModelCached() {
  if (!('caches' in self)) return false
  try {
    const cacheNames = await caches.keys()
    const needle = MODEL_ID.toLowerCase().replace('/', '%2f')
    const rawNeedle = MODEL_ID.toLowerCase()
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()
      if (requests.some((request) => {
        const url = request.url.toLowerCase()
        return url.includes(rawNeedle) || url.includes(needle)
      })) return true
    }
  } catch {
    return false
  }
  return false
}

function reportProgress(data: ProgressPayload) {
  if (!data || typeof data !== 'object') return
  const file = typeof data.file === 'string' ? data.file : 'model'
  const loaded = Number.isFinite(data.loaded) ? Number(data.loaded) : 0
  const total = Number.isFinite(data.total) ? Number(data.total) : null

  if (data.status === 'progress' || loaded > 0 || total !== null) {
    post({ type: 'progress', progress: { phase: 'model-download', file, loaded, total } })
    return
  }
  if (data.status === 'initiate' || data.status === 'download' || data.status === 'loading') {
    post({ type: 'progress', progress: { phase: 'model-load' } })
  }
}

async function createPipeline(backend: LocalSttBackend) {
  if (transcriber && activeBackend === backend) return transcriber

  if (transcriber && typeof (transcriber as { dispose?: () => Promise<void> }).dispose === 'function') {
    await (transcriber as { dispose: () => Promise<void> }).dispose().catch(() => undefined)
  }
  transcriber = null
  activeBackend = null

  env.allowLocalModels = false
  env.allowRemoteModels = true
  env.useBrowserCache = true
  env.useWasmCache = true

  const startedAt = performance.now()
  post({ type: 'progress', progress: { phase: 'model-load' } })

  const common = {
    revision: MODEL_REVISION,
    progress_callback: reportProgress,
  }

  if (backend === 'webgpu') {
    transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, {
      ...common,
      device: 'webgpu',
      dtype: {
        encoder_model: 'fp16',
        decoder_model_merged: 'fp16',
      },
    })
  } else {
    transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, {
      ...common,
      device: 'wasm',
      dtype: 'q8',
    })
  }

  activeBackend = backend
  modelLoadMs = performance.now() - startedAt
  return transcriber
}

async function handleRequest(request: WorkerRequest) {
  switch (request.type) {
    case 'capability': {
      const modelCached = await detectModelCached()
      post({
        id: request.id,
        type: 'response',
        value: {
          backend: request.backend,
          modelId: MODEL_ID,
          modelRevision: MODEL_REVISION,
          modelCached,
        },
      })
      return
    }
    case 'initialize': {
      const cachedBefore = await detectModelCached()
      await createPipeline(request.backend)
      const cachedAfter = await detectModelCached()
      post({ type: 'progress', progress: { phase: 'ready' } })
      post({
        id: request.id,
        type: 'response',
        value: {
          backend: request.backend,
          modelId: MODEL_ID,
          modelRevision: MODEL_REVISION,
          modelCachedBeforeLoad: cachedBefore,
          modelCachedAfterLoad: cachedAfter,
          modelLoadMs,
        },
      })
      return
    }
    case 'transcribe': {
      if (!transcriber || !activeBackend) throw new Error('Model STT nie został jeszcze załadowany.')
      const audio = new Float32Array(request.audio)
      if (audio.length === 0) throw new Error('Nagranie jest puste.')

      post({ type: 'progress', progress: { phase: 'transcribing' } })
      const startedAt = performance.now()
      const output = await transcriber(audio, {
        language: 'polish',
        task: 'transcribe',
      })
      const inferenceMs = performance.now() - startedAt
      const text = Array.isArray(output)
        ? output.map((item) => ('text' in item ? String(item.text) : '')).join(' ').trim()
        : String(output.text ?? '').trim()

      post({
        id: request.id,
        type: 'response',
        value: {
          text,
          audioDurationMs: request.audioDurationMs,
          inferenceMs,
          backend: activeBackend,
          modelId: MODEL_ID,
          modelRevision: MODEL_REVISION,
        },
      })
      return
    }
    case 'dispose': {
      if (transcriber && typeof (transcriber as { dispose?: () => Promise<void> }).dispose === 'function') {
        await (transcriber as { dispose: () => Promise<void> }).dispose().catch(() => undefined)
      }
      transcriber = null
      activeBackend = null
      post({ id: request.id, type: 'response', value: true })
    }
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void handleRequest(event.data).catch((error) => {
    post({
      id: event.data.id,
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  })
}
