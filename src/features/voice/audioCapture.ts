export const WHISPER_SAMPLE_RATE = 16_000
export const VOICE_SPIKE_MAX_DURATION_MS = 10_000

export type CapturedVoiceAudio = {
  samples: Float32Array
  sourceSampleRate: number
  durationMs: number
  peak: number
}

type CaptureSession = {
  stream: MediaStream
  context: AudioContext
  source: MediaStreamAudioSourceNode
  recorder: AudioWorkletNode
  silentSink: GainNode
  chunks: Float32Array[]
  sampleCount: number
  sourceSampleRate: number
  startedAt: number
  timer: number | null
}

function getAudioContextConstructor(): typeof AudioContext | null {
  const candidate = window.AudioContext
  return candidate ?? null
}

export function isGetUserMediaSupported() {
  return typeof navigator.mediaDevices?.getUserMedia === 'function'
}

export function isAudioWorkletSupported() {
  return 'AudioWorkletNode' in window
}

export function isMicrophoneCaptureSupported() {
  return Boolean(
    window.isSecureContext
      && isGetUserMediaSupported()
      && getAudioContextConstructor()
      && isAudioWorkletSupported(),
  )
}

export function flattenFloat32(chunks: readonly Float32Array[], totalSamples: number) {
  const output = new Float32Array(totalSamples)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

export function resampleLinear(input: Float32Array, sourceRate: number, targetRate = WHISPER_SAMPLE_RATE) {
  if (!Number.isFinite(sourceRate) || sourceRate <= 0) {
    throw new Error('Nieprawidłowa częstotliwość próbkowania mikrofonu.')
  }
  if (!Number.isFinite(targetRate) || targetRate <= 0) {
    throw new Error('Nieprawidłowa docelowa częstotliwość próbkowania.')
  }
  if (input.length === 0 || sourceRate === targetRate) return input.slice()

  const outputLength = Math.max(1, Math.round(input.length * targetRate / sourceRate))
  const output = new Float32Array(outputLength)
  const ratio = sourceRate / targetRate

  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, input.length - 1)
    const fraction = position - left
    output[i] = input[left] * (1 - fraction) + input[right] * fraction
  }

  return output
}

export function getPeakAmplitude(samples: Float32Array) {
  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]))
  }
  return peak
}

export class VoicePcmCapture {
  private session: CaptureSession | null = null
  private onElapsed: ((elapsedMs: number) => void) | null = null
  private onAutoStop: (() => void) | null = null

  setElapsedListener(listener: ((elapsedMs: number) => void) | null) {
    this.onElapsed = listener
  }

  setAutoStopListener(listener: (() => void) | null) {
    this.onAutoStop = listener
  }

  get active() {
    return this.session !== null
  }

  async start(maxDurationMs = VOICE_SPIKE_MAX_DURATION_MS) {
    if (this.session) throw new Error('Nagrywanie już trwa.')
    if (!window.isSecureContext) throw new Error('Mikrofon wymaga bezpiecznego połączenia HTTPS.')
    if (!isGetUserMediaSupported()) throw new Error('Ta przeglądarka nie udostępnia mikrofonu przez getUserMedia().')
    if (!isAudioWorkletSupported()) throw new Error('Ta przeglądarka nie obsługuje AudioWorklet.')

    const AudioContextCtor = getAudioContextConstructor()
    if (!AudioContextCtor) throw new Error('Ta przeglądarka nie obsługuje Web Audio API.')

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    const context = new AudioContextCtor()
    try {
      await context.resume()
      await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}voice/pcm-recorder-worklet.js`)

      const source = context.createMediaStreamSource(stream)
      const recorder = new AudioWorkletNode(context, 'kitchen-pcm-recorder', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
      })
      const silentSink = context.createGain()
      silentSink.gain.value = 0
      const chunks: Float32Array[] = []
      let sampleCount = 0
      recorder.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const chunk = new Float32Array(event.data)
        if (chunk.length === 0) return
        chunks.push(chunk)
        sampleCount += chunk.length
        if (this.session) this.session.sampleCount = sampleCount
      }
      source.connect(recorder)
      recorder.connect(silentSink)
      silentSink.connect(context.destination)

      const startedAt = performance.now()
      this.session = {
        stream,
        context,
        source,
        recorder,
        silentSink,
        chunks,
        sampleCount,
        sourceSampleRate: context.sampleRate,
        startedAt,
        timer: null,
      }

      this.session.timer = window.setInterval(() => {
        if (!this.session) return
        const elapsed = performance.now() - this.session.startedAt
        this.onElapsed?.(Math.min(elapsed, maxDurationMs))
        if (elapsed >= maxDurationMs) {
          this.onAutoStop?.()
        }
      }, 100)
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop())
      await context.close().catch(() => undefined)
      throw error
    }
  }

  async stop(): Promise<CapturedVoiceAudio> {
    const session = this.session
    if (!session) throw new Error('Nagrywanie nie jest aktywne.')
    this.session = null

    if (session.timer !== null) window.clearInterval(session.timer)
    session.recorder.port.onmessage = null
    session.source.disconnect()
    session.recorder.disconnect()
    session.silentSink.disconnect()
    session.stream.getTracks().forEach((track) => track.stop())

    const endedAt = performance.now()
    await session.context.close().catch(() => undefined)

    const raw = flattenFloat32(session.chunks, session.sampleCount)
    const samples = resampleLinear(raw, session.sourceSampleRate, WHISPER_SAMPLE_RATE)
    const durationMs = raw.length > 0
      ? raw.length / session.sourceSampleRate * 1000
      : endedAt - session.startedAt

    return {
      samples,
      sourceSampleRate: session.sourceSampleRate,
      durationMs,
      peak: getPeakAmplitude(samples),
    }
  }

  async cancel() {
    if (!this.session) return
    const session = this.session
    this.session = null
    if (session.timer !== null) window.clearInterval(session.timer)
    session.recorder.port.onmessage = null
    session.source.disconnect()
    session.recorder.disconnect()
    session.silentSink.disconnect()
    session.stream.getTracks().forEach((track) => track.stop())
    await session.context.close().catch(() => undefined)
  }
}
