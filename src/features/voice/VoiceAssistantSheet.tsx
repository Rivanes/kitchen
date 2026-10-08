import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import { VoicePcmCapture, VOICE_SPIKE_MAX_DURATION_MS } from './audioCapture'
import { BrowserSpeechOutputAdapter } from './browserSpeechOutput'
import type { LocalSpeechToTextAdapter, LocalSttProgress } from './localSttTypes'
import { loadVoiceKitchenContext, type VoiceKitchenContext } from './voiceKitchenContext'
import { answerReadOnlyKitchenQuery, type VoiceAssistantReply } from './voiceReadOnlyAssistant'
import { foldPolishText } from './voiceTextMatch'
import { createVoiceSpeechToTextAdapter, VOICE_READONLY_STT_BACKEND } from './voiceSttProvider'

type VoiceAssistantSheetProps = {
  ownerId: string
  onClose: () => void
  onOpenRecipe: (recipeId: string) => void
}

type AssistantStatus = 'loading-context' | 'idle' | 'loading-model' | 'recording' | 'transcribing' | 'error'

type ConversationTurn = {
  id: string
  query: string
  reply: VoiceAssistantReply
}

function describeMicrophoneError(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Dostęp do mikrofonu został odrzucony. Zezwól Kitchen na mikrofon w ustawieniach witryny i spróbuj ponownie.'
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'Nie znaleziono mikrofonu na tym urządzeniu.'
  }
  return toUserErrorMessage(error, 'Nie udało się użyć mikrofonu.')
}

function isRepeatRequest(value: string) {
  const text = foldPolishText(value)
  return ['powtorz', 'powiedz jeszcze raz', 'co powiedziales', 'powtorz odpowiedz'].includes(text)
}

function isCancelRequest(value: string) {
  const text = foldPolishText(value)
  return ['anuluj', 'niewazne', 'nieważne', 'zamknij'].map(foldPolishText).includes(text)
}

export function VoiceAssistantSheet({ ownerId, onClose, onOpenRecipe }: VoiceAssistantSheetProps) {
  const adapterRef = useRef<LocalSpeechToTextAdapter | null>(null)
  const adapterUnsubscribeRef = useRef<(() => void) | null>(null)
  const captureRef = useRef<VoicePcmCapture | null>(null)
  const speechRef = useRef<BrowserSpeechOutputAdapter | null>(null)
  const autoStopInFlightRef = useRef(false)
  const stopRecordingAndAskRef = useRef<() => Promise<void>>(async () => undefined)

  const [context, setContext] = useState<VoiceKitchenContext | null>(null)
  const [status, setStatus] = useState<AssistantStatus>('loading-context')
  const [error, setError] = useState<string | null>(null)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [lastReply, setLastReply] = useState<VoiceAssistantReply | null>(null)
  const [modelReady, setModelReady] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [modelProgress, setModelProgress] = useState<string | null>(null)
  const [speakEnabled, setSpeakEnabled] = useState(true)

  useEffect(() => {
    const capture = new VoicePcmCapture()
    const speech = new BrowserSpeechOutputAdapter()
    captureRef.current = capture
    speechRef.current = speech

    capture.setElapsedListener((value) => setElapsedMs(value))
    capture.setAutoStopListener(() => {
      if (autoStopInFlightRef.current) return
      autoStopInFlightRef.current = true
      void stopRecordingAndAskRef.current().finally(() => {
        autoStopInFlightRef.current = false
      })
    })

    void refreshContext()

    return () => {
      speech.cancel()
      void capture.cancel()
      adapterUnsubscribeRef.current?.()
      adapterRef.current?.dispose()
      adapterRef.current = null
      captureRef.current = null
      speechRef.current = null
    }
    // One assistant sheet owns one capture/context lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId])

  async function refreshContext() {
    setStatus('loading-context')
    setError(null)
    try {
      const next = await loadVoiceKitchenContext(ownerId)
      setContext(next)
      setStatus('idle')
    } catch (nextError) {
      setError(toUserErrorMessage(nextError, 'Nie udało się wczytać danych Kitchen do asystenta.'))
      setStatus('error')
    }
  }

  function ensureAdapter() {
    if (adapterRef.current) return adapterRef.current
    const adapter = createVoiceSpeechToTextAdapter()
    adapterUnsubscribeRef.current = adapter.onProgress((progress: LocalSttProgress) => {
      if (progress.phase === 'model-download') {
        const percent = progress.total && progress.total > 0
          ? Math.round(progress.loaded / progress.total * 100)
          : null
        setModelProgress(percent === null ? 'Pobieram lokalny model mowy…' : `Pobieram lokalny model mowy… ${percent}%`)
      } else if (progress.phase === 'model-load') {
        setModelProgress('Uruchamiam lokalny model mowy…')
      }
    })
    adapterRef.current = adapter
    return adapter
  }

  async function ensureModelReady() {
    if (modelReady) return ensureAdapter()
    const adapter = ensureAdapter()
    setStatus('loading-model')
    setError(null)
    setModelProgress('Sprawdzam lokalne rozpoznawanie mowy…')

    const capability = await adapter.getCapability(VOICE_READONLY_STT_BACKEND)
    if (!capability.supported) {
      if (!capability.secureContext) throw new Error('Mikrofon Kitchen wymaga bezpiecznego połączenia HTTPS.')
      if (!capability.microphoneSupported) throw new Error('Ta przeglądarka nie udostępnia mikrofonu.')
      if (!capability.audioWorkletSupported) throw new Error('Ta przeglądarka nie obsługuje wymaganego AudioWorklet.')
      throw new Error('Lokalne rozpoznawanie mowy nie jest dostępne na tym urządzeniu.')
    }

    setModelProgress(capability.modelCached ? 'Uruchamiam model z pamięci urządzenia…' : 'Pobieram model mowy na to urządzenie…')
    await adapter.initialize(VOICE_READONLY_STT_BACKEND)
    setModelReady(true)
    setModelProgress(null)
    setStatus('idle')
    return adapter
  }

  async function speakReply(reply: VoiceAssistantReply) {
    if (!speakEnabled) return
    const speech = speechRef.current
    if (!speech?.supported) return
    setSpeechError(null)
    try {
      await speech.speak(reply.spokenText)
    } catch (nextError) {
      setSpeechError(toUserErrorMessage(nextError, 'Nie udało się odczytać odpowiedzi głosem.'))
    }
  }

  async function ask(rawQuery: string) {
    const clean = rawQuery.trim()
    if (!clean || !context) return
    setError(null)

    if (isCancelRequest(clean)) {
      speechRef.current?.cancel()
      setQuery('')
      setLastTranscript(null)
      setLastReply(null)
      return
    }

    if (isRepeatRequest(clean) && lastReply) {
      setQuery('')
      await speakReply(lastReply)
      return
    }

    const reply = answerReadOnlyKitchenQuery(context, clean)
    const turn: ConversationTurn = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      query: clean,
      reply,
    }
    setTurns((current) => [...current, turn].slice(-4))
    setLastReply(reply)
    setQuery('')
    await speakReply(reply)
  }

  async function startRecording() {
    const capture = captureRef.current
    if (!capture || status === 'recording' || status === 'transcribing') return
    setError(null)
    setSpeechError(null)
    setLastTranscript(null)
    speechRef.current?.cancel()

    try {
      await ensureModelReady()
      setElapsedMs(0)
      await capture.start(VOICE_SPIKE_MAX_DURATION_MS)
      setStatus('recording')
    } catch (nextError) {
      setError(describeMicrophoneError(nextError))
      setStatus(modelReady ? 'idle' : 'error')
    }
  }

  async function stopRecordingAndAsk() {
    const capture = captureRef.current
    if (!capture?.active) return
    setStatus('transcribing')
    setError(null)

    try {
      const adapter = await ensureModelReady()
      const captured = await capture.stop()
      setElapsedMs(captured.durationMs)
      if (captured.durationMs < 350 || captured.samples.length < 4_000) {
        throw new Error('Nagranie jest zbyt krótkie. Powiedz całe pytanie i spróbuj ponownie.')
      }
      if (captured.peak < 0.003) {
        throw new Error('Nagranie jest praktycznie bezgłośne. Sprawdź mikrofon i spróbuj ponownie.')
      }

      const result = await adapter.transcribe(captured.samples, captured.durationMs)
      const transcript = result.text.trim()
      if (!transcript) throw new Error('Nie udało się rozpoznać żadnego tekstu.')
      setLastTranscript(transcript)
      setStatus('idle')
      await ask(transcript)
    } catch (nextError) {
      setError(describeMicrophoneError(nextError))
      setStatus('idle')
    }
  }

  useEffect(() => {
    stopRecordingAndAskRef.current = stopRecordingAndAsk
  })

  async function cancelRecording() {
    const capture = captureRef.current
    if (!capture?.active) return
    await capture.cancel()
    setElapsedMs(0)
    setStatus('idle')
  }

  function handleOpenRecipe(recipeId: string) {
    speechRef.current?.cancel()
    onOpenRecipe(recipeId)
    onClose()
  }

  const busy = status === 'loading-context' || status === 'loading-model' || status === 'transcribing'
  const latestTurn = turns.at(-1) ?? null
  const speechSupported = speechRef.current?.supported ?? ('speechSynthesis' in window)

  return (
    <div className="sheet-backdrop voice-assistant-backdrop" role="presentation" onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && status !== 'recording') onClose()
    }}>
      <section className="inventory-sheet voice-assistant-sheet" role="dialog" aria-modal="true" aria-labelledby="voice-assistant-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header voice-assistant-header">
          <div>
            <p className="eyebrow">Kitchen Voice · odczyt danych</p>
            <h2 id="voice-assistant-title">O co chcesz zapytać?</h2>
            <p>Zapasy, zakupy i przepisy. Ta wersja niczego nie zmienia.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Zamknij asystenta" disabled={status === 'recording'}>
            <KitchenIcon name="close" />
          </button>
        </header>

        <div className="voice-assistant-toolbar">
          <button className="voice-toolbar-button" type="button" onClick={() => void refreshContext()} disabled={busy || status === 'recording'}>
            <KitchenIcon name="refresh" size={17} />
            <span>Odśwież dane</span>
          </button>
          <button className={`voice-toolbar-button${speakEnabled ? ' is-active' : ''}`} type="button" onClick={() => {
            speechRef.current?.cancel()
            setSpeakEnabled((value) => !value)
          }} disabled={!speechSupported} aria-pressed={speakEnabled}>
            <KitchenIcon name="volume" size={17} />
            <span>{speakEnabled ? 'Głos włączony' : 'Głos wyłączony'}</span>
          </button>
        </div>

        {status === 'loading-context' && (
          <div className="voice-assistant-state" aria-live="polite">
            <div className="loading-dot" aria-hidden="true" />
            <strong>Wczytuję aktualny stan Kitchen…</strong>
          </div>
        )}

        {modelProgress && status === 'loading-model' && (
          <div className="voice-assistant-state" aria-live="polite">
            <div className="loading-dot" aria-hidden="true" />
            <strong>{modelProgress}</strong>
            <small>Pierwsze użycie może chwilę potrwać. Model pozostaje lokalnie w cache przeglądarki.</small>
          </div>
        )}

        {lastTranscript && (
          <div className="voice-heard-card" aria-live="polite">
            <span>Usłyszałem</span>
            <strong>{lastTranscript}</strong>
          </div>
        )}

        {turns.length > 0 && (
          <div className="voice-conversation" aria-live="polite">
            {turns.map((turn) => (
              <div className="voice-conversation-turn" key={turn.id}>
                <div className="voice-user-bubble">{turn.query}</div>
                <div className="voice-kitchen-bubble">
                  <strong>{turn.reply.title}</strong>
                  <p>{turn.reply.text}</p>
                  {turn.reply.details && turn.reply.details.length > 0 && (
                    <ul>
                      {turn.reply.details.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  )}
                  {turn.reply.choices && turn.reply.choices.length > 0 && (
                    <div className="voice-choice-row">
                      {turn.reply.choices.map((choice) => (
                        <button key={choice.id} type="button" onClick={() => void ask(choice.query)}>{choice.label}</button>
                      ))}
                    </div>
                  )}
                  {turn.reply.action?.kind === 'open-recipe' && (
                    <button className="secondary-button voice-open-recipe" type="button" onClick={() => handleOpenRecipe(turn.reply.action!.recipeId)}>
                      {turn.reply.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!latestTurn && status === 'idle' && (
          <div className="voice-assistant-examples">
            <button type="button" onClick={() => void ask('Ile mam mleka?')}>Ile mam mleka?</button>
            <button type="button" onClick={() => void ask('Co mam w lodówce?')}>Co mam w lodówce?</button>
            <button type="button" onClick={() => void ask('Co jest na liście zakupów?')}>Co jest na liście zakupów?</button>
            <button type="button" onClick={() => void ask('Co mogę ugotować?')}>Co mogę ugotować?</button>
          </div>
        )}

        {status === 'recording' && (
          <div className="voice-listening-state" aria-live="polite">
            <span className="voice-listening-pulse" aria-hidden="true" />
            <strong>Słucham…</strong>
            <small>{Math.min(10, elapsedMs / 1000).toFixed(1)} / 10.0 s</small>
          </div>
        )}

        {status === 'transcribing' && (
          <div className="voice-assistant-state" aria-live="polite">
            <div className="loading-dot" aria-hidden="true" />
            <strong>Rozpoznaję pytanie lokalnie…</strong>
          </div>
        )}

        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {speechError && <div className="notice notice-warning" role="status">{speechError}</div>}

        <form className="voice-query-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          void ask(query)
        }}>
          <label htmlFor="voice-query-input">Możesz też wpisać pytanie</label>
          <div className="voice-query-row">
            <input
              id="voice-query-input"
              type="text"
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Np. czy mam wszystko do lasagne?"
              disabled={!context || busy || status === 'recording'}
              autoComplete="off"
            />
            <button className="secondary-button" type="submit" disabled={!query.trim() || !context || busy || status === 'recording'}>Wyślij</button>
          </div>
        </form>

        <div className="voice-microphone-zone">
          {status !== 'recording' ? (
            <button className="voice-microphone-button" type="button" onClick={() => void startRecording()} disabled={!context || busy} aria-label="Zacznij mówić">
              <KitchenIcon name="microphone" size={28} strokeWidth={2} />
            </button>
          ) : (
            <button className="voice-microphone-button is-recording" type="button" onClick={() => void stopRecordingAndAsk()} aria-label="Zatrzymaj nagrywanie i zapytaj">
              <KitchenIcon name="stop" size={24} strokeWidth={2} />
            </button>
          )}
          <span>{status === 'recording' ? 'Dotknij, aby zakończyć' : modelReady ? 'Dotknij i zapytaj' : 'Dotknij, aby uruchomić głos'}</span>
          {status === 'recording' && <button className="voice-cancel-recording" type="button" onClick={() => void cancelRecording()}>Anuluj nagranie</button>}
        </div>
      </section>
    </div>
  )
}
