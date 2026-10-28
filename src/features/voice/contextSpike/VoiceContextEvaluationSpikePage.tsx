import { useEffect, useMemo, useRef, useState } from 'react'
import { loadVoiceKitchenContext, type VoiceKitchenContext } from '../voiceKitchenContext'
import type { VoiceReadOnlyIntent } from '../voiceReadOnlyAssistant.ts'
import {
  VOICE_INTENT_HELD_OUT_CASES,
} from './contextEvaluationCorpus.ts'
import {
  KitchenVoiceContextEngine as VoiceContextEnginePrototype,
  EMPTY_VOICE_CONVERSATION_STATE,
  type VoiceContextCandidateSet,
  type VoiceContextInterpretation,
} from '../context/voiceContextEngine.ts'
import { runLocalContextEvaluation, type VoiceContextLocalEvaluationReport } from './contextEvaluationRunner.ts'
import {
  DistilUseSemanticBenchmark,
  SEMANTIC_BENCHMARK_MODEL_ID,
  SEMANTIC_BENCHMARK_MODEL_REVISION,
  type SemanticBenchmarkInitResult,
  type SemanticProgress,
} from './semanticEmbeddingBenchmark.ts'

type VoiceContextEvaluationSpikePageProps = {
  ownerId: string
  onExit: () => void
}

type SemanticRun = {
  createdAt: string
  init: SemanticBenchmarkInitResult
  evaluationMs: number
  correct: number
  total: number
  accuracy: number
  averageQueryMs: number
  rows: Array<{
    id: string
    text: string
    expectedIntent: VoiceReadOnlyIntent
    actualIntent: VoiceReadOnlyIntent | null
    topScore: number | null
    correct: boolean
  }>
}

function formatMs(value: number) {
  if (!Number.isFinite(value)) return '—'
  return value < 1 ? `${value.toFixed(2)} ms` : `${value.toFixed(0)} ms`
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatBytes(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB']
  let result = value / 1024
  let unit = units[0]
  for (let index = 1; index < units.length && result >= 1024; index += 1) {
    result /= 1024
    unit = units[index]
  }
  return `${result.toFixed(result >= 100 ? 0 : 1)} ${unit}`
}

function liveCandidates(context: VoiceKitchenContext | null): VoiceContextCandidateSet {
  if (!context) return { products: [], recipes: [], locations: [] }
  return {
    products: context.recipes.inventory.products.map((product) => ({ id: product.id, label: product.name })),
    recipes: context.recipes.recipes.map((recipe) => ({ id: recipe.id, label: recipe.name })),
    locations: context.recipes.inventory.locations.map((location) => ({ id: location.id, label: location.name })),
  }
}

function semanticCorpus() {
  return VOICE_INTENT_HELD_OUT_CASES.filter((entry) => entry.category !== 'context')
}

export function VoiceContextEvaluationSpikePage({ ownerId, onExit }: VoiceContextEvaluationSpikePageProps) {
  const localReport = useMemo(() => runLocalContextEvaluation(), [])
  const engine = useMemo(() => new VoiceContextEnginePrototype(), [])
  const [context, setContext] = useState<VoiceKitchenContext | null>(null)
  const [contextError, setContextError] = useState<string | null>(null)
  const [probeText, setProbeText] = useState('I lebałam rzeczy na liście.')
  const [probeResult, setProbeResult] = useState<VoiceContextInterpretation | null>(null)
  const [semanticStatus, setSemanticStatus] = useState<'idle' | 'loading' | 'running' | 'ready' | 'error'>('idle')
  const [semanticProgress, setSemanticProgress] = useState<SemanticProgress | null>(null)
  const [semanticError, setSemanticError] = useState<string | null>(null)
  const [semanticRuns, setSemanticRuns] = useState<SemanticRun[]>([])
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const semanticBenchmarkRef = useRef<DistilUseSemanticBenchmark | null>(null)

  useEffect(() => {
    let active = true
    loadVoiceKitchenContext(ownerId)
      .then((value) => {
        if (!active) return
        setContext(value)
        setContextError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        setContextError(error instanceof Error ? error.message : 'Nie udało się wczytać read-only kontekstu Kitchen.')
      })
    return () => {
      active = false
      semanticBenchmarkRef.current?.dispose()
      semanticBenchmarkRef.current = null
    }
  }, [ownerId])

  function runProbe() {
    setProbeResult(engine.interpret({
      rawText: probeText,
      origin: 'speech',
      candidates: liveCandidates(context),
      conversation: EMPTY_VOICE_CONVERSATION_STATE,
    }))
  }

  async function runSemanticBenchmark() {
    if (semanticStatus === 'loading' || semanticStatus === 'running') return
    setSemanticError(null)
    setSemanticProgress(null)
    setSemanticStatus('loading')

    const benchmark = new DistilUseSemanticBenchmark()
    semanticBenchmarkRef.current?.dispose()
    semanticBenchmarkRef.current = benchmark
    const removeProgress = benchmark.onProgress((progress) => setSemanticProgress(progress))

    try {
      const init = await benchmark.initialize()
      setSemanticStatus('running')
      const cases = semanticCorpus()
      const started = performance.now()
      const results = await benchmark.scoreMany(cases.map((entry) => entry.text))
      const evaluationMs = performance.now() - started
      const rows = cases.map((entry, index) => {
        const top = results[index]?.[0]
        return {
          id: entry.id,
          text: entry.text,
          expectedIntent: entry.expectedIntent,
          actualIntent: top?.intent ?? null,
          topScore: top?.score ?? null,
          correct: top?.intent === entry.expectedIntent,
        }
      })
      const correct = rows.filter((row) => row.correct).length
      setSemanticRuns((current) => [{
        createdAt: new Date().toISOString(),
        init,
        evaluationMs,
        correct,
        total: rows.length,
        accuracy: rows.length > 0 ? correct / rows.length : 0,
        averageQueryMs: rows.length > 0 ? evaluationMs / rows.length : 0,
        rows,
      }, ...current].slice(0, 3))
      setSemanticStatus('ready')
    } catch (error) {
      setSemanticStatus('error')
      setSemanticError(error instanceof Error ? error.message : 'Benchmark semantyczny zakończył się błędem.')
    } finally {
      removeProgress()
      benchmark.dispose()
      if (semanticBenchmarkRef.current === benchmark) semanticBenchmarkRef.current = null
    }
  }

  async function copyJson() {
    const payload = {
      spike: 'Kitchen V6.1B-RO.2A Context Engine Evaluation',
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      local: localReport,
      liveContext: context ? {
        products: context.recipes.inventory.products.length,
        recipes: context.recipes.recipes.length,
        locations: context.recipes.inventory.locations.length,
      } : null,
      semanticRuns,
      probe: probeResult,
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopyStatus('JSON skopiowany.')
    } catch {
      setCopyStatus('Nie udało się skopiować JSON. Spróbuj ponownie.')
    }
  }

  const latestSemanticRun = semanticRuns[0]
  const progressPercent = semanticProgress?.total && semanticProgress.loaded
    ? Math.min(100, Math.round((semanticProgress.loaded / semanticProgress.total) * 100))
    : null

  return (
    <section className="voice-context-spike-page" aria-labelledby="voice-context-spike-title">
      <div className="voice-spike-heading">
        <div>
          <p className="eyebrow">V6.1B-RO.2A · Evaluation Spike</p>
          <h1 id="voice-context-spike-title">Kitchen Context Engine</h1>
          <p>Porównanie literalnego parsera, mikro-klasyfikatora, resolvera fonetycznego i opcjonalnego modelu semantycznego. Ten ekran niczego nie zapisuje.</p>
        </div>
        <button className="secondary-button voice-spike-exit" type="button" onClick={onExit}>Powrót</button>
      </div>

      <div className="voice-spike-warning" role="note">
        To jest osobna diagnostyka. Normalny Kitchen Voice nadal używa V6.1B-RO.1 i pozostaje read-only. Model semantyczny ma około 135 MB wag q8 i ładuje się wyłącznie po ręcznym uruchomieniu benchmarku.
      </div>

      <section className="voice-spike-card" aria-labelledby="context-local-title">
        <div className="voice-spike-section-title">
          <div>
            <p className="eyebrow">1. Lokalny kandydat</p>
            <h2 id="context-local-title">Literalny parser vs Micro AI</h2>
          </div>
          <span className="voice-spike-status voice-spike-status-ready">gotowe</span>
        </div>
        <dl className="voice-diagnostic-grid">
          <div><dt>Literalny</dt><dd>{localReport.literal.correct}/{localReport.literal.total} · {formatPercent(localReport.literal.accuracy)}</dd></div>
          <div><dt>Micro AI</dt><dd>{localReport.micro.correct}/{localReport.micro.total} · {formatPercent(localReport.micro.accuracy)}</dd></div>
          <div><dt>Trening</dt><dd>{localReport.trainingExampleCount} fraz</dd></div>
          <div><dt>Init</dt><dd>{formatMs(localReport.classifierInitMs)}</dd></div>
          <div><dt>Śr. query</dt><dd>{formatMs(localReport.perQueryMs.average)}</dd></div>
          <div><dt>P95 query</dt><dd>{formatMs(localReport.perQueryMs.p95)}</dd></div>
        </dl>
        <div className="context-gate-grid">
          <div className={localReport.actualPhoneCaseRecovered ? 'is-pass' : 'is-fail'}><strong>Realny błąd STT</strong><span>{localReport.actualPhoneCaseRecovered ? 'odzyskany' : 'nieodzyskany'}</span></div>
          <div className={localReport.writeShapedNoiseRejected ? 'is-pass' : 'is-fail'}><strong>Write-shaped noise</strong><span>{localReport.writeShapedNoiseRejected ? 'odrzucony' : 'błędnie przyjęty'}</span></div>
          <div className={localReport.entity.passed === localReport.entity.total ? 'is-pass' : 'is-fail'}><strong>Encje</strong><span>{localReport.entity.passed}/{localReport.entity.total}</span></div>
          <div className={localReport.context.passed === localReport.context.total ? 'is-pass' : 'is-fail'}><strong>Kontekst</strong><span>{localReport.context.passed}/{localReport.context.total}</span></div>
        </div>
        <details className="context-details">
          <summary>Pokaż przypadki held-out</summary>
          <div className="context-case-list">
            {localReport.rows.map((row) => (
              <div key={row.id} className={`context-case-row${row.microCorrect ? ' is-pass' : ' is-fail'}`}>
                <div><strong>{row.text}</strong><small>{row.category} · oczekiwano: {row.expectedIntent}</small></div>
                <span>literal: {row.literalIntent}<br />micro: {row.microIntent}</span>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="voice-spike-card" aria-labelledby="context-live-title">
        <div className="voice-spike-section-title">
          <div>
            <p className="eyebrow">2. Dynamiczne dane Kitchen</p>
            <h2 id="context-live-title">Próba interpretacji</h2>
          </div>
          <span className={`voice-spike-status ${context ? 'voice-spike-status-ready' : contextError ? 'voice-spike-status-error' : ''}`}>{context ? 'read model OK' : contextError ? 'błąd' : 'wczytuję'}</span>
        </div>
        {context && (
          <p className="context-meta-line">Kandydaci live: {context.recipes.inventory.products.length} produktów · {context.recipes.recipes.length} przepisów · {context.recipes.inventory.locations.length} lokalizacji</p>
        )}
        {contextError && <div className="notice notice-error" role="alert">{contextError}</div>}
        <label className="context-probe-field">
          <span>Raw transcript / tekst do próby</span>
          <textarea value={probeText} onChange={(event) => setProbeText(event.target.value)} rows={3} />
        </label>
        <button className="primary-button" type="button" onClick={runProbe} disabled={!probeText.trim()}>Interpretuj bez zapisu</button>
        {probeResult && (
          <div className="context-probe-result">
            <p><span>Raw:</span> {probeResult.rawText}</p>
            <p><span>Zrozumiałem:</span> {probeResult.interpretedSummary}</p>
            <dl className="voice-metrics-row">
              <div><dt>Intent</dt><dd>{probeResult.intent}</dd></div>
              <div><dt>Decyzja</dt><dd>{probeResult.decision}</dd></div>
              <div><dt>Confidence</dt><dd>{formatPercent(probeResult.confidence)}</dd></div>
            </dl>
            {probeResult.entity && <small>Encja: {probeResult.entity.label} · lexical {probeResult.entity.lexicalScore.toFixed(2)} · phonetic {probeResult.entity.phoneticScore.toFixed(2)}</small>}
          </div>
        )}
      </section>

      <section className="voice-spike-card" aria-labelledby="context-semantic-title">
        <div className="voice-spike-section-title">
          <div>
            <p className="eyebrow">3. Opcjonalny benchmark</p>
            <h2 id="context-semantic-title">DistilUSE multilingual q8</h2>
          </div>
          <span className={`voice-spike-status ${semanticStatus === 'ready' ? 'voice-spike-status-ready' : semanticStatus === 'error' ? 'voice-spike-status-error' : semanticStatus !== 'idle' ? 'voice-spike-status-loading-model' : ''}`}>{semanticStatus}</span>
        </div>
        <div className="voice-model-meta">
          <code>{SEMANTIC_BENCHMARK_MODEL_ID}</code>
          <small>revision {SEMANTIC_BENCHMARK_MODEL_REVISION} · WASM/q8 · model on-demand, nie PWA precache</small>
        </div>
        <p className="context-meta-line">Ten benchmark jest celowo ciężki. Uruchom go dopiero po sprawdzeniu lekkiego Micro AI. Powtórne uruchomienie mierzy warm browser cache.</p>
        {semanticProgress?.file && (
          <div className="voice-download-progress">
            <div className="voice-download-progress-bar"><span style={{ width: `${progressPercent ?? 5}%` }} /></div>
            <small>{semanticProgress.file} · {progressPercent === null ? semanticProgress.status ?? 'pobieranie' : `${progressPercent}%`}</small>
          </div>
        )}
        <button className="secondary-button" type="button" onClick={() => void runSemanticBenchmark()} disabled={semanticStatus === 'loading' || semanticStatus === 'running'}>
          {semanticRuns.length === 0 ? 'Uruchom benchmark ~135 MB' : 'Uruchom ponownie (warm cache)'}
        </button>
        {semanticError && <div className="notice notice-error" role="alert">{semanticError}</div>}
        {latestSemanticRun && (
          <>
            <dl className="voice-diagnostic-grid">
              <div><dt>Accuracy</dt><dd>{latestSemanticRun.correct}/{latestSemanticRun.total} · {formatPercent(latestSemanticRun.accuracy)}</dd></div>
              <div><dt>Model init</dt><dd>{formatMs(latestSemanticRun.init.loadMs)}</dd></div>
              <div><dt>Eval</dt><dd>{formatMs(latestSemanticRun.evaluationMs)}</dd></div>
              <div><dt>Śr. query</dt><dd>{formatMs(latestSemanticRun.averageQueryMs)}</dd></div>
              <div><dt>Storage przed</dt><dd>{formatBytes(latestSemanticRun.init.storageBefore.usage)}</dd></div>
              <div><dt>Storage po</dt><dd>{formatBytes(latestSemanticRun.init.storageAfter.usage)}</dd></div>
            </dl>
            <details className="context-details">
              <summary>Pokaż wynik semantyczny</summary>
              <div className="context-case-list">
                {latestSemanticRun.rows.map((row) => (
                  <div key={row.id} className={`context-case-row${row.correct ? ' is-pass' : ' is-fail'}`}>
                    <div><strong>{row.text}</strong><small>oczekiwano: {row.expectedIntent}</small></div>
                    <span>{row.actualIntent ?? 'brak'}<br />{row.topScore === null ? '—' : row.topScore.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </section>

      <section className="voice-spike-card" aria-labelledby="context-export-title">
        <div className="voice-spike-section-title">
          <div>
            <p className="eyebrow">4. Evidence</p>
            <h2 id="context-export-title">Eksport do audytu</h2>
          </div>
          <span className="voice-results-count">{semanticRuns.length}</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => void copyJson()}>Kopiuj JSON</button>
        {copyStatus && <p className="context-copy-status" role="status">{copyStatus}</p>}
      </section>
    </section>
  )
}
