import type {
  LocalSpeechToTextAdapter,
  LocalSttBackend,
  LocalSttCapability,
  LocalSttInitResult,
  LocalSttProgress,
  LocalSttResult,
} from './localSttTypes'

const MODEL_ID = 'onnx-community/whisper-tiny'
const MODEL_REVISION = 'ff4177021cc41f7db950912b73ea4fdf7d01d8e7'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

type WorkerResponse =
  | { id: number; type: 'response'; value: unknown }
  | { id: number; type: 'error'; message: string }
  | { type: 'progress'; progress: LocalSttProgress }

export class TransformersLocalSttAdapter implements LocalSpeechToTextAdapter {
  private worker: Worker
  private nextId = 1
  private pending = new Map<number, PendingRequest>()
  private progressListeners = new Set<(progress: LocalSttProgress) => void>()

  constructor() {
    this.worker = new Worker(new URL('./localStt.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if (message.type === 'progress') {
        this.progressListeners.forEach((listener) => listener(message.progress))
        return
      }

      const request = this.pending.get(message.id)
      if (!request) return
      this.pending.delete(message.id)
      if (message.type === 'error') {
        request.reject(new Error(message.message))
      } else {
        request.resolve(message.value)
      }
    }
    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'Worker lokalnego STT uległ awarii.')
      for (const request of this.pending.values()) request.reject(error)
      this.pending.clear()
    }
  }

  onProgress(listener: (progress: LocalSttProgress) => void) {
    this.progressListeners.add(listener)
    return () => this.progressListeners.delete(listener)
  }

  async getCapability(backend: LocalSttBackend): Promise<LocalSttCapability> {
    const workerCapability = await this.request<{ modelCached: boolean }>('capability', { backend })
    const microphoneSupported = Boolean(navigator.mediaDevices?.getUserMedia)
    const audioWorkletSupported = 'AudioWorkletNode' in window
    const webGpuSupported = 'gpu' in navigator
    const backendSupported = backend === 'wasm' || webGpuSupported

    return {
      supported: window.isSecureContext && microphoneSupported && audioWorkletSupported && backendSupported,
      secureContext: window.isSecureContext,
      microphoneSupported,
      audioWorkletSupported,
      webGpuSupported,
      backend,
      modelId: MODEL_ID,
      modelRevision: MODEL_REVISION,
      modelCached: workerCapability.modelCached,
    }
  }

  initialize(backend: LocalSttBackend) {
    return this.request<LocalSttInitResult>('initialize', { backend })
  }

  transcribe(audio16k: Float32Array, audioDurationMs: number) {
    const transferable = audio16k.slice().buffer
    return this.request<LocalSttResult>('transcribe', { audio: transferable, audioDurationMs }, [transferable])
  }

  dispose() {
    void this.request('dispose', {}).catch(() => undefined)
    this.worker.terminate()
    for (const request of this.pending.values()) request.reject(new Error('Adapter STT został zamknięty.'))
    this.pending.clear()
    this.progressListeners.clear()
  }

  private request<T>(type: string, payload: Record<string, unknown>, transfer: Transferable[] = []) {
    const id = this.nextId
    this.nextId += 1
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
      this.worker.postMessage({ id, type, ...payload }, transfer)
    })
  }
}
