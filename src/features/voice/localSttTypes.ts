export type LocalSttBackend = 'wasm' | 'webgpu'

export type LocalSttCapability = {
  supported: boolean
  secureContext: boolean
  microphoneSupported: boolean
  audioWorkletSupported: boolean
  webGpuSupported: boolean
  backend: LocalSttBackend
  modelId: string
  modelRevision: string
  modelCached: boolean
}

export type LocalSttDownloadProgress = {
  file: string
  loaded: number
  total: number | null
}

export type LocalSttProgress =
  | { phase: 'model-download'; file: string; loaded: number; total: number | null }
  | { phase: 'model-load' }
  | { phase: 'recording'; elapsedMs: number; maxDurationMs: number }
  | { phase: 'transcribing' }
  | { phase: 'ready' }

export type LocalSttInitResult = {
  backend: LocalSttBackend
  modelId: string
  modelRevision: string
  modelCachedBeforeLoad: boolean
  modelCachedAfterLoad: boolean
  modelLoadMs: number
}

export type LocalSttResult = {
  text: string
  audioDurationMs: number
  inferenceMs: number
  backend: LocalSttBackend
  modelId: string
  modelRevision: string
}

export type StorageSnapshot = {
  usage: number | null
  quota: number | null
  persisted: boolean | null
}

export type VoiceSpikeResultRecord = {
  id: string
  createdAt: string
  expectedPhrase: string
  transcript: string
  backend: LocalSttBackend
  modelId: string
  modelRevision: string
  modelLoadMs: number | null
  inferenceMs: number
  audioDurationMs: number
  sourceSampleRate: number
  capturedSamples: number
  storageBefore: StorageSnapshot
  storageAfter: StorageSnapshot
  userAgent: string
  webGpuSupported: boolean
}

export interface LocalSpeechToTextAdapter {
  getCapability(backend: LocalSttBackend): Promise<LocalSttCapability>
  initialize(backend: LocalSttBackend): Promise<LocalSttInitResult>
  transcribe(audio16k: Float32Array, audioDurationMs: number): Promise<LocalSttResult>
  onProgress(listener: (progress: LocalSttProgress) => void): () => void
  dispose(): void
}
