import { useEffect, useMemo, useRef, useState } from 'react'
import { VoicePcmCapture, VOICE_SPIKE_MAX_DURATION_MS } from './audioCapture'
import { TransformersLocalSttAdapter } from './transformersLocalSttAdapter'
import type {
  LocalSttBackend,
  LocalSttCapability,
  LocalSttDownloadProgress,
  LocalSttInitResult,
  LocalSttProgress,
  LocalSttResult,
  StorageSnapshot,
  VoiceSpikeResultRecord,
} from './localSttTypes'
import {
  POLISH_VOICE_SPIKE_PHRASES,
  clearVoiceSpikeResults,
  formatBytes,
  formatDuration,
  readStorageSnapshot,
  readStoredVoiceSpikeResults,
  storeVoiceSpikeResult,
} from './voiceSpikeMetrics'

type VoiceSttSpikePageProps = {
  onExit: () => void
}

type SpikeStatus = 'idle' | 'loading-model' | 'ready' | 'recording' | 'transcribing' | 'error'

const EMPTY_STORAGE: StorageSnapshot = { usage: null, quota: null, persisted: null }

function describeError(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Dostęp do mikrofonu został odrzucony. Nadaj uprawnienie i spróbuj ponownie.'
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'Nie znaleziono mikrofonu na tym urządzeniu.'
  }
  return error instanceof Error ? error.message : String(error)
}

function backendLabel(backend: LocalSttBackend) {
  return backend === 'wasm' ? 'WASM / CPU (q8)' : 'WebGPU (fp16)'
}

function storageDelta(before: StorageSnapshot, after: StorageSnapshot) {
  if (before.usage === null || after.usage === null) return null
  return after.usage - before.usage
}

export function VoiceSttSpikePage({ onExit }: VoiceSttSpikePageProps) {
  const adapterRef = useRef<TransformersLocalSttAdapter | null>(null)
  const captureRef = useRef<VoicePcmCapture | null>(null)
  const autoStopInFlightRef = useRef(false)

  const [backend, setBackend] = useState<LocalSttBackend>('wasm')
  const [capability, setCapability] = useState<LocalSttCapability | null>(null)
  const [status, setStatus] = useState<SpikeStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [initResult, setInitResult] = useState<LocalSttInitResult | null>(null)
  const [lastResult, setLastResult] = useState<LocalSttResult | null>(null)
  const [selectedPhrase, setSelectedPhrase] = useState<string>(POLISH_VOICE_SPIKE_PHRASES[0])
  const [elapsedMs, setElapsedMs] = useState(0)
  const [captureInfo, setCaptureInfo] = useState<{ sourceSampleRate: number; sampleCount: number; peak: number } | null>(null)
  const [downloads, setDownloads] = useState<Record<string, LocalSttDownloadProgress>>({})
  const [storageBefore, setStorageBefore] = useState<StorageSnapshot>(EMPTY_STORAGE)
  const [storageAfter, setStorageAfter] = useState<StorageSnapshot>(EMPTY_STORAGE)
  const [records, setRecords] = useState<VoiceSpikeResultRecord[]>(() => readStoredVoiceSpikeResults())
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const downloadTotals = useMemo(() => {
    const values = Object.values(downloads)
    const loaded = values.reduce((sum, item) => sum + item.loaded, 0)
    const withTotal = values.filter((item) => item.total !== null)
    const total = withTotal.length === values.length && values.length > 0
      ? withTotal.reduce((sum, item) => sum + (item.total ?? 0), 0)
      : null
    return { loaded, total }
  }, [downloads])

  useEffect(() => {
    const adapter = new TransformersLocalSttAdapter()
    const capture = new VoicePcmCapture()
    adapterRef.current = adapter
    captureRef.current = capture

    const unsubscribe = adapter.onProgress((progress: LocalSttProgress) => {
      if (progress.phase === 'model-download') {
        setDownloads((current) => ({
          ...current,
          [progress.file]: {
            file: progress.file,
            loaded: progress.loaded,
            total: progress.total,
          },
        }))
      }
    })

    capture.setElapsedListener((value) => setElapsedMs(value))
    capture.setAutoStopListener(() => {
      if (autoStopInFlightRef.current) return
      autoStopInFlightRef.current = true
      void stopAndTranscribe().finally(() => {
        autoStopInFlightRef.current = false
      })
    })

    return () => {
      unsubscribe()
      void capture.cancel()
      adapter.dispose()
      adapterRef.current = null
      captureRef.current = null
    }
    // This diagnostic surface intentionally owns one adapter/capture lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refreshCapability(backend)
    setInitResult(null)
    setLastResult(null)
    setStatus('idle')
    setError(null)
    setDownloads({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend])

  async function refreshCapability(targetBackend = backend) {
    const adapter = adapterRef.current
    if (!adapter) return
    try {
      const next = await adapter.getCapability(targetBackend)
      setCapability(next)
    } catch (nextError) {
      setCapability(null)
      setError(describeError(nextError))
      setStatus('error')
    }
  }

  async function initializeModel() {
    const adapter = adapterRef.current
    if (!adapter) return
    setError(null)
    setLastResult(null)
    setDownloads({})
    setStatus('loading-model')

    try {
      const before = await readStorageSnapshot()
      setStorageBefore(before)
      const result = await adapter.initialize(backend)
      const after = await readStorageSnapshot()
      setStorageAfter(after)
      setInitResult(result)
      setStatus('ready')
      await refreshCapability(backend)
    } catch (nextError) {
      setError(describeError(nextError))
      setStatus('error')
    }
  }

  async function startRecording() {
    const capture = captureRef.current
    if (!capture || status !== 'ready') return
    setError(null)
    setLastResult(null)
    setCaptureInfo(null)
    setElapsedMs(0)
    try {
      await capture.start(VOICE_SPIKE_MAX_DURATION_MS)
      setStatus('recording')
    } catch (nextError) {
      setError(describeError(nextError))
      setStatus('error')
    }
  }

  async function stopAndTranscribe() {
    const capture = captureRef.current
    const adapter = adapterRef.current
    if (!capture || !adapter || !capture.active) return

    setStatus('transcribing')
    setError(null)
    try {
      const captured = await capture.stop()
      setElapsedMs(captured.durationMs)
      setCaptureInfo({
        sourceSampleRate: captured.sourceSampleRate,
        sampleCount: captured.samples.length,
        peak: captured.peak,
      })

      if (captured.durationMs < 350 || captured.samples.length < 4_000) {
        throw new Error('Nagranie jest zbyt krótkie. Nagraj pełną komendę.')
      }
      if (captured.peak < 0.003) {
        throw new Error('Nagranie jest praktycznie bezgłośne. Sprawdź mikrofon i spróbuj ponownie.')
      }

      const result = await adapter.transcribe(captured.samples, captured.durationMs)
      const after = await readStorageSnapshot()
      setStorageAfter(after)
      setLastResult(result)
      setStatus('ready')

      const record: VoiceSpikeResultRecord = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        expectedPhrase: selectedPhrase,
        transcript: result.text,
        backend: result.backend,
        modelId: result.modelId,
        modelRevision: result.modelRevision,
        modelLoadMs: initResult?.modelLoadMs ?? null,
        inferenceMs: result.inferenceMs,
        audioDurationMs: result.audioDurationMs,
        sourceSampleRate: captured.sourceSampleRate,
        capturedSamples: captured.samples.length,
        storageBefore,
        storageAfter: after,
        userAgent: navigator.userAgent,
        webGpuSupported: capability?.webGpuSupported ?? ('gpu' in navigator),
      }
      setRecords(storeVoiceSpikeResult(record))
    } catch (nextError) {
      setError(describeError(nextError))
      setStatus(initResult ? 'ready' : 'error')
    }
  }

  async function cancelRecording() {
    const capture = captureRef.current
    if (!capture?.active) return
    await capture.cancel()
    setElapsedMs(0)
    setStatus('ready')
  }

  async function copyResults() {
    const payload = {
      spike: 'Kitchen V6.1A Local STT',
      generatedAt: new Date().toISOString(),
      capability,
      initResult,
      downloads: Object.values(downloads),
      storageBefore,
      storageAfter,
      records,
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1600)
    } catch {
      setCopyState('failed')
    }
  }

  function clearResults() {
    clearVoiceSpikeResults()
    setRecords([])
  }

  const canLoad = capability?.supported === true && status !== 'loading-model' && status !== 'recording' && status !== 'transcribing'
  const canRecord = status === 'ready' && Boolean(initResult)
  const isBusy = status === 'loading-model' || status === 'transcribing'
  const downloadPercent = downloadTotals.total && downloadTotals.total > 0
    ? Math.min(100, downloadTotals.loaded / downloadTotals.total * 100)
    : null

  return (
    <section className="voice-spike-page" aria-labelledby="voice-spike-title">
      <div className="voice-spike-heading">
        <div>
          <p className="eyebrow">V6.1A · Local STT Spike</p>
          <h1 id="voice-spike-title">Lokalna transkrypcja</h1>
          <p>Diagnostyka tylko do testu telefonu. Audio nie jest zapisywane ani wysyłane do Supabase.</p>
        </div>
        <button className="secondary-button voice-spike-exit" type="button" onClick={onExit}>Powrót</button>
      </div>

      <div className="voice-spike-warning" role="note">
        Pierwsze uruchomienie pobiera model Whisper. Normalny ekran Kitchen nie pobiera modelu automatycznie.
      </div>

      <section className="voice-spike-card" aria-labelledby="voice-runtime-title">
        <div className="voice-spike-section-title">
          <div>
            <p className="eyebrow">1. Runtime</p>
            <h2 id="voice-runtime-title">Wybierz backend</h2>
          </div>
          <span className={`voice-spike-status voice-spike-status-${status}`}>{status}</span>
        </div>

        <div className="voice-backend-options" role="radiogroup" aria-label="Backend lokalnego STT">
          <label className={backend === 'wasm' ? 'is-active' : ''}>
            <input type="radio" name="voice-backend" value="wasm" checked={backend === 'wasm'} disabled={isBusy || status === 'recording'} onChange={() => setBackend('wasm')} />
            <span>
              <strong>WASM / CPU</strong>
              <small>Baseline · q8 · największa kompatybilność</small>
            </span>
          </label>
          <label className={`${backend === 'webgpu' ? 'is-active' : ''}${capability && !capability.webGpuSupported ? ' is-disabled' : ''}`}>
            <input type="radio" name="voice-backend" value="webgpu" checked={backend === 'webgpu'} disabled={isBusy || status === 'recording' || capability?.webGpuSupported === false} onChange={() => setBackend('webgpu')} />
            <span>
              <strong>WebGPU</strong>
              <small>Benchmark · fp16 · tylko gdy urządzenie wspiera</small>
            </span>
          </label>
        </div>

        <dl className="voice-diagnostic-grid">
          <div><dt>HTTPS</dt><dd>{capability?.secureContext ? 'TAK' : 'NIE'}</dd></div>
          <div><dt>Mikrofon</dt><dd>{capability?.microphoneSupported ? 'TAK' : 'NIE'}</dd></div>
          <div><dt>AudioWorklet</dt><dd>{capability?.audioWorkletSupported ? 'TAK' : 'NIE'}</dd></div>
          <div><dt>WebGPU</dt><dd>{capability?.webGpuSupported ? 'TAK' : 'NIE'}</dd></div>
          <div><dt>Model cache</dt><dd>{capability?.modelCached ? 'HIT' : 'MISS'}</dd></div>
          <div><dt>Backend</dt><dd>{backendLabel(backend)}</dd></div>
        </dl>

        <div className="voice-model-meta">
          <code>onnx-community/whisper-tiny</code>
          <small>revision ff4177021cc41f7db950912b73ea4fdf7d01d8e7</small>
        </div>

        <button className="primary-button" type="button" disabled={!canLoad} onClick={initializeModel}>
          {status === 'loading-model' ? 'Ładowanie modelu…' : initResult ? 'Przeładuj / zmierz ponownie' : 'Załaduj model lokalny'}
        </button>

        {(downloadTotals.loaded > 0 || status === 'loading-model') && (
          <div className="voice-download-progress" aria-live="polite">
            <div className="voice-download-progress-bar" aria-hidden="true">
              <span style={{ width: `${downloadPercent ?? 8}%` }} />
            </div>
            <small>
              {downloadPercent === null
                ? `Pobrano ${formatBytes(downloadTotals.loaded)}`
                : `${downloadPercent.toFixed(0)}% · ${formatBytes(downloadTotals.loaded)} / ${formatBytes(downloadTotals.total)}`}
            </small>
          </div>
        )}

        {initResult && (
          <dl className="voice-metrics-row">
            <div><dt>Model load</dt><dd>{formatDuration(initResult.modelLoadMs)}</dd></div>
            <div><dt>Cache przed</dt><dd>{initResult.modelCachedBeforeLoad ? 'HIT' : 'MISS'}</dd></div>
            <div><dt>Cache po</dt><dd>{initResult.modelCachedAfterLoad ? 'HIT' : 'MISS / nieustalone'}</dd></div>
            <div><dt>Storage Δ</dt><dd>{formatBytes(storageDelta(storageBefore, storageAfter))}</dd></div>
          </dl>
        )}
      </section>

      <section className="voice-spike-card" aria-labelledby="voice-record-title">
        <div className="voice-spike-section-title">
          <div>
            <p className="eyebrow">2. Próbka</p>
            <h2 id="voice-record-title">Nagraj dokładną frazę</h2>
          </div>
          {status === 'recording' && <span className="voice-record-dot">REC</span>}
        </div>

        <label className="voice-phrase-select">
          <span>Fraza testowa</span>
          <select value={selectedPhrase} disabled={status === 'recording' || status === 'transcribing'} onChange={(event) => setSelectedPhrase(event.target.value)}>
            {POLISH_VOICE_SPIKE_PHRASES.map((phrase) => <option key={phrase} value={phrase}>{phrase}</option>)}
          </select>
        </label>

        <blockquote className="voice-phrase-card">{selectedPhrase}</blockquote>

        <div className="voice-record-actions">
          {status !== 'recording' ? (
            <button className="primary-button" type="button" disabled={!canRecord} onClick={startRecording}>
              Nagraj do 10 s
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={stopAndTranscribe}>
              Zatrzymaj i transkrybuj
            </button>
          )}
          {status === 'recording' && (
            <button className="secondary-button" type="button" onClick={cancelRecording}>Anuluj</button>
          )}
        </div>

        {(status === 'recording' || status === 'transcribing') && (
          <div className="voice-record-progress" aria-live="polite">
            <strong>{status === 'recording' ? `${(elapsedMs / 1000).toFixed(1)} / 10.0 s` : 'Transkrypcja lokalna…'}</strong>
            <small>{status === 'recording' ? 'Audio pozostaje w pamięci urządzenia.' : `Backend: ${backendLabel(backend)}`}</small>
          </div>
        )}

        {error && <div className="notice notice-error voice-spike-error" role="alert">{error}</div>}

        {lastResult && (
          <div className="voice-transcript-result" aria-live="polite">
            <p className="eyebrow">Dokładny wynik modelu</p>
            <p className="voice-transcript-text">{lastResult.text || '— pusty transcript —'}</p>
            <dl className="voice-metrics-row">
              <div><dt>Audio</dt><dd>{formatDuration(lastResult.audioDurationMs)}</dd></div>
              <div><dt>Inference</dt><dd>{formatDuration(lastResult.inferenceMs)}</dd></div>
              <div><dt>Źródło</dt><dd>{captureInfo ? `${Math.round(captureInfo.sourceSampleRate / 1000)} kHz` : '—'}</dd></div>
              <div><dt>Peak</dt><dd>{captureInfo ? captureInfo.peak.toFixed(3) : '—'}</dd></div>
            </dl>
          </div>
        )}
      </section>

      <section className="voice-spike-card" aria-labelledby="voice-results-title">
        <div className="voice-spike-section-title">
          <div>
            <p className="eyebrow">3. QA</p>
            <h2 id="voice-results-title">Wyniki tego telefonu</h2>
          </div>
          <span className="voice-results-count">{records.length}</span>
        </div>

        <div className="voice-result-actions">
          <button className="secondary-button" type="button" disabled={records.length === 0} onClick={copyResults}>
            {copyState === 'copied' ? 'Skopiowano' : copyState === 'failed' ? 'Błąd kopiowania' : 'Kopiuj JSON'}
          </button>
          <button className="secondary-button" type="button" disabled={records.length === 0} onClick={clearResults}>Wyczyść wyniki</button>
        </div>

        {records.length === 0 ? (
          <p className="voice-empty-results">Po pierwszej transkrypcji pojawi się tutaj dokładny log bez surowego audio.</p>
        ) : (
          <div className="voice-results-list">
            {records.map((record) => (
              <article key={record.id} className="voice-result-item">
                <div className="voice-result-item-head">
                  <strong>{backendLabel(record.backend)}</strong>
                  <small>{new Date(record.createdAt).toLocaleString('pl-PL')}</small>
                </div>
                <p><span>Fraza:</span> {record.expectedPhrase}</p>
                <p><span>Model:</span> {record.transcript || '— pusty transcript —'}</p>
                <small>Inference {formatDuration(record.inferenceMs)} · audio {formatDuration(record.audioDurationMs)}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
