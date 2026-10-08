import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import { VoicePcmCapture } from './audioCapture'
import { BrowserSpeechOutputAdapter } from './browserSpeechOutput'
import type { LocalSpeechToTextAdapter, LocalSttProgress } from './localSttTypes'
import { loadVoiceKitchenContext, type VoiceKitchenContext } from './voiceKitchenContext'
import {
  isVoiceProductUtteranceLongEnough,
  VOICE_PRODUCT_MAX_DURATION_MS,
  VOICE_PRODUCT_MIN_PEAK,
} from './voiceProductionCapturePolicy'
import { answerReadOnlyKitchenQuery, type VoiceAssistantReply } from './voiceReadOnlyAssistant'
import { foldPolishText } from './voiceTextMatch'
import { createVoiceSpeechToTextAdapter, VOICE_READONLY_STT_BACKEND } from './voiceSttProvider'

type VoiceAssistantSheetProps = {
  ownerId: string
  onClose: () => void
  onOpenRecipe: (recipeId: string) => void
}

type AssistantStatus = 'loading-context' | 'idle' | 'arming' | 'recording' | 'transcribing' | 'error'
type VoiceModelStatus = 'preparing' | 'ready' | 'error'
type HoldSession =
  | { token: number; kind: 'pointer'; pointerId: number }
  | { token: number; kind: 'keyboard'; key: ' ' | 'Enter' }

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
  const adapterInitPromiseRef = useRef<Promise<LocalSpeechToTextAdapter> | null>(null)
  const captureRef = useRef<VoicePcmCapture | null>(null)
  const speechRef = useRef<BrowserSpeechOutputAdapter | null>(null)
  const modelReadyRef = useRef(false)
  const mountedRef = useRef(true)
  const autoStopInFlightRef = useRef(false)
  const holdRef = useRef<HoldSession | null>(null)
  const nextHoldTokenRef = useRef(0)
  const stopRecordingAndAskRef = useRef<(quietIfShort?: boolean) => Promise<void>>(async () => undefined)
  const conversationScrollRef = useRef<HTMLDivElement | null>(null)

  const [context, setContext] = useState<VoiceKitchenContext | null>(null)
  const [status, setStatus] = useState<AssistantStatus>('loading-context')
  const [error, setError] = useState<string | null>(null)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [lastReply, setLastReply] = useState<VoiceAssistantReply | null>(null)
  const [modelStatus, setModelStatus] = useState<VoiceModelStatus>('preparing')
  const [modelProgress, setModelProgress] = useState<string>('Przygotowuję lokalny model mowy…')
  const [modelError, setModelError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [speakEnabled, setSpeakEnabled] = useState(true)
  const [textComposerOpen, setTextComposerOpen] = useState(false)
  const [interactionHint, setInteractionHint] = useState('Przytrzymaj, aby mówić')

  useEffect(() => {
    mountedRef.current = true
    const capture = new VoicePcmCapture()
    const speech = new BrowserSpeechOutputAdapter()
    captureRef.current = capture
    speechRef.current = speech

    capture.setElapsedListener((value) => {
      if (mountedRef.current) setElapsedMs(value)
    })
    capture.setAutoStopListener(() => {
      if (autoStopInFlightRef.current) return
      autoStopInFlightRef.current = true
      holdRef.current = null
      if (mountedRef.current) setInteractionHint('Osiągnięto limit bezpieczeństwa nagrania. Rozpoznaję pytanie…')
      void stopRecordingAndAskRef.current(false).finally(() => {
        autoStopInFlightRef.current = false
      })
    })

    void refreshContext()
    void prepareModel().catch(() => undefined)

    return () => {
      mountedRef.current = false
      holdRef.current = null
      speech.cancel()
      void capture.cancel()
      adapterUnsubscribeRef.current?.()
      adapterRef.current?.dispose()
      adapterInitPromiseRef.current = null
      adapterRef.current = null
      captureRef.current = null
      speechRef.current = null
      modelReadyRef.current = false
    }
    // One assistant sheet owns one capture/context/model lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId])

  useEffect(() => {
    const node = conversationScrollRef.current
    if (!node) return
    const frame = window.requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [turns, lastTranscript, status])

  async function refreshContext() {
    if (mountedRef.current) {
      setStatus('loading-context')
      setError(null)
    }
    try {
      const next = await loadVoiceKitchenContext(ownerId)
      if (!mountedRef.current) return
      setContext(next)
      setStatus('idle')
    } catch (nextError) {
      if (!mountedRef.current) return
      setError(toUserErrorMessage(nextError, 'Nie udało się wczytać danych Kitchen do asystenta.'))
      setStatus('error')
    }
  }

  function ensureAdapter() {
    if (adapterRef.current) return adapterRef.current
    const adapter = createVoiceSpeechToTextAdapter()
    adapterUnsubscribeRef.current = adapter.onProgress((progress: LocalSttProgress) => {
      if (!mountedRef.current) return
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

  function prepareModel() {
    if (modelReadyRef.current) return Promise.resolve(ensureAdapter())
    if (adapterInitPromiseRef.current) return adapterInitPromiseRef.current

    if (mountedRef.current) {
      setModelStatus('preparing')
      setModelError(null)
      setModelProgress('Sprawdzam lokalne rozpoznawanie mowy…')
    }

    const adapter = ensureAdapter()
    const promise = (async () => {
      const capability = await adapter.getCapability(VOICE_READONLY_STT_BACKEND)
      if (!capability.supported) {
        if (!capability.secureContext) throw new Error('Mikrofon Kitchen wymaga bezpiecznego połączenia HTTPS.')
        if (!capability.microphoneSupported) throw new Error('Ta przeglądarka nie udostępnia mikrofonu.')
        if (!capability.audioWorkletSupported) throw new Error('Ta przeglądarka nie obsługuje wymaganego AudioWorklet.')
        throw new Error('Lokalne rozpoznawanie mowy nie jest dostępne na tym urządzeniu.')
      }

      if (mountedRef.current) {
        setModelProgress(capability.modelCached ? 'Uruchamiam model z pamięci urządzenia…' : 'Pobieram model mowy na to urządzenie…')
      }
      await adapter.initialize(VOICE_READONLY_STT_BACKEND)
      modelReadyRef.current = true
      if (mountedRef.current) {
        setModelStatus('ready')
        setModelProgress('Model mowy gotowy')
      }
      return adapter
    })()

    adapterInitPromiseRef.current = promise
    void promise.catch((nextError) => {
      modelReadyRef.current = false
      if (!mountedRef.current) return
      setModelStatus('error')
      setModelError(toUserErrorMessage(nextError, 'Nie udało się przygotować lokalnego rozpoznawania mowy.'))
      setModelProgress('Model mowy niedostępny')
    }).finally(() => {
      adapterInitPromiseRef.current = null
    })

    return promise
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
      setInteractionHint('Przytrzymaj, aby mówić')
      return
    }

    if (isRepeatRequest(clean) && lastReply) {
      setQuery('')
      await speakReply(lastReply)
      setInteractionHint('Przytrzymaj, aby zadać kolejne pytanie')
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
    setInteractionHint('Przytrzymaj, aby zadać kolejne pytanie')
    await speakReply(reply)
  }

  function createHold(kind: HoldSession['kind'], value: number | ' ' | 'Enter') {
    const token = ++nextHoldTokenRef.current
    holdRef.current = kind === 'pointer'
      ? { token, kind, pointerId: value as number }
      : { token, kind, key: value as ' ' | 'Enter' }
    return token
  }

  function isHoldActive(token: number) {
    return holdRef.current?.token === token
  }

  function clearHold(token: number) {
    if (holdRef.current?.token === token) holdRef.current = null
  }

  async function beginPushToTalk(token: number) {
    const capture = captureRef.current
    if (!capture || !context || !modelReadyRef.current) return

    setError(null)
    setSpeechError(null)
    setLastTranscript(null)
    setElapsedMs(0)
    setInteractionHint('Uruchamiam mikrofon…')
    speechRef.current?.cancel()
    setStatus('arming')

    try {
      await capture.start(VOICE_PRODUCT_MAX_DURATION_MS)
      if (!isHoldActive(token)) {
        await capture.cancel()
        if (mountedRef.current) {
          setStatus('idle')
          setInteractionHint('Przytrzymaj, aby mówić')
        }
        return
      }
      setStatus('recording')
      setInteractionHint('Słucham… Puść, aby wysłać')
    } catch (nextError) {
      clearHold(token)
      setError(describeMicrophoneError(nextError))
      setStatus('idle')
      setInteractionHint('Przytrzymaj, aby spróbować ponownie')
    }
  }

  async function stopRecordingAndAsk(quietIfShort = true) {
    const capture = captureRef.current
    if (!capture?.active) {
      if (status === 'arming') setStatus('idle')
      return
    }

    setStatus('transcribing')
    setError(null)
    setInteractionHint('Rozpoznaję pytanie lokalnie…')

    try {
      const captured = await capture.stop()
      setElapsedMs(captured.durationMs)

      if (!isVoiceProductUtteranceLongEnough(captured.durationMs)) {
        setStatus('idle')
        setInteractionHint('Przytrzymaj mikrofon trochę dłużej, aby mówić')
        if (!quietIfShort) setError('Nagranie było zbyt krótkie. Przytrzymaj mikrofon i powiedz całe pytanie.')
        return
      }

      if (captured.peak < VOICE_PRODUCT_MIN_PEAK) {
        throw new Error('Nagranie jest praktycznie bezgłośne. Sprawdź mikrofon i spróbuj ponownie.')
      }

      const adapter = await prepareModel()
      const result = await adapter.transcribe(captured.samples, captured.durationMs)
      const transcript = result.text.trim()
      if (!transcript) throw new Error('Nie udało się rozpoznać żadnego tekstu.')
      setLastTranscript(transcript)
      setStatus('idle')
      await ask(transcript)
    } catch (nextError) {
      setError(describeMicrophoneError(nextError))
      setStatus('idle')
      setInteractionHint('Przytrzymaj, aby spróbować ponownie')
    }
  }

  useEffect(() => {
    stopRecordingAndAskRef.current = stopRecordingAndAsk
  })

  async function cancelHeldRecording(token: number, message = 'Nagranie anulowane') {
    clearHold(token)
    await captureRef.current?.cancel()
    if (!mountedRef.current) return
    setElapsedMs(0)
    setStatus('idle')
    setInteractionHint(message)
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false || holdRef.current) return
    event.preventDefault()
    if (!context || status === 'loading-context' || status === 'transcribing') return
    if (!modelReadyRef.current) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const token = createHold('pointer', event.pointerId)
    void beginPushToTalk(token)
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const hold = holdRef.current
    if (!hold || hold.kind !== 'pointer' || hold.pointerId !== event.pointerId) return
    event.preventDefault()
    const token = hold.token
    clearHold(token)
    void stopRecordingAndAsk(true)
  }

  function handlePointerCancel(event: PointerEvent<HTMLButtonElement>) {
    const hold = holdRef.current
    if (!hold || hold.kind !== 'pointer' || hold.pointerId !== event.pointerId) return
    event.preventDefault()
    void cancelHeldRecording(hold.token, 'Nagranie anulowane. Przytrzymaj, aby spróbować ponownie')
  }

  function handleLostPointerCapture(event: PointerEvent<HTMLButtonElement>) {
    const hold = holdRef.current
    if (!hold || hold.kind !== 'pointer' || hold.pointerId !== event.pointerId) return
    void cancelHeldRecording(hold.token, 'Nagranie anulowane. Przytrzymaj, aby spróbować ponownie')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat || holdRef.current) return
    event.preventDefault()
    if (!context || status === 'loading-context' || status === 'transcribing' || !modelReadyRef.current) return
    const token = createHold('keyboard', event.key)
    void beginPushToTalk(token)
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    const hold = holdRef.current
    if (!hold || hold.kind !== 'keyboard' || hold.key !== event.key) return
    event.preventDefault()
    const token = hold.token
    clearHold(token)
    void stopRecordingAndAsk(true)
  }

  function handleMicrophoneBlur() {
    const hold = holdRef.current
    if (!hold || hold.kind !== 'keyboard') return
    void cancelHeldRecording(hold.token, 'Nagranie anulowane. Przytrzymaj, aby spróbować ponownie')
  }

  function handleClose() {
    holdRef.current = null
    speechRef.current?.cancel()
    const capture = captureRef.current
    if (!capture) {
      onClose()
      return
    }
    void capture.cancel().finally(onClose)
  }

  function handleOpenRecipe(recipeId: string) {
    speechRef.current?.cancel()
    onOpenRecipe(recipeId)
    onClose()
  }

  const latestTurn = turns.at(-1) ?? null
  const speechSupported = speechRef.current?.supported ?? ('speechSynthesis' in window)
  const voiceBusy = status === 'arming' || status === 'recording' || status === 'transcribing'
  const queryBusy = !context || status === 'loading-context' || voiceBusy
  const microphoneDisabled = !context || status === 'loading-context' || status === 'transcribing' || modelStatus !== 'ready'

  let pushToTalkStatus = interactionHint
  if (status === 'loading-context') pushToTalkStatus = 'Wczytuję aktualny stan Kitchen…'
  else if (modelStatus === 'preparing') pushToTalkStatus = modelProgress
  else if (status === 'arming') pushToTalkStatus = 'Uruchamiam mikrofon… Trzymaj przycisk'
  else if (status === 'recording') pushToTalkStatus = `Słucham… Puść, aby wysłać · ${(elapsedMs / 1000).toFixed(1)} s`
  else if (status === 'transcribing') pushToTalkStatus = 'Rozpoznaję pytanie lokalnie…'
  else if (modelStatus === 'error') pushToTalkStatus = 'Głos chwilowo niedostępny. Możesz wpisać pytanie.'

  return (
    <div className="sheet-backdrop voice-assistant-backdrop" role="presentation" onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && !voiceBusy) handleClose()
    }}>
      <section className="inventory-sheet voice-assistant-sheet" role="dialog" aria-modal="true" aria-labelledby="voice-assistant-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header voice-assistant-header">
          <div>
            <p className="eyebrow">Kitchen Voice · odczyt danych</p>
            <h2 id="voice-assistant-title">O co chcesz zapytać?</h2>
            <p>Zapasy, zakupy i przepisy. Ta wersja niczego nie zmienia.</p>
          </div>
          <div className="voice-assistant-header-actions">
            <button
              className={`icon-button voice-header-action${speakEnabled ? ' is-active' : ''}`}
              type="button"
              onClick={() => {
                speechRef.current?.cancel()
                setSpeakEnabled((value) => !value)
              }}
              disabled={!speechSupported}
              aria-label={speakEnabled ? 'Wyłącz odpowiedzi głosowe' : 'Włącz odpowiedzi głosowe'}
              aria-pressed={speakEnabled}
              title={speakEnabled ? 'Głos włączony' : 'Głos wyłączony'}
            >
              <KitchenIcon name="volume" size={18} />
            </button>
            <button
              className="icon-button voice-header-action"
              type="button"
              onClick={() => void refreshContext()}
              disabled={voiceBusy}
              aria-label="Odśwież dane Kitchen"
              title="Odśwież dane"
            >
              <KitchenIcon name="refresh" size={18} />
            </button>
            <button className="icon-button" type="button" onClick={handleClose} aria-label="Zamknij asystenta" disabled={status === 'transcribing'}>
              <KitchenIcon name="close" />
            </button>
          </div>
        </header>

        <div className="voice-assistant-scroll" ref={conversationScrollRef}>
          {status === 'loading-context' && (
            <div className="voice-assistant-state" aria-live="polite">
              <div className="loading-dot" aria-hidden="true" />
              <strong>Wczytuję aktualny stan Kitchen…</strong>
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

          {!latestTurn && status !== 'loading-context' && (
            <div className="voice-assistant-examples" aria-label="Przykładowe pytania">
              <button type="button" onClick={() => void ask('Ile mam mleka?')}>Ile mam mleka?</button>
              <button type="button" onClick={() => void ask('Co mam w lodówce?')}>Co mam w lodówce?</button>
              <button type="button" onClick={() => void ask('Co jest na liście zakupów?')}>Co jest na liście zakupów?</button>
              <button type="button" onClick={() => void ask('Co mogę ugotować?')}>Co mogę ugotować?</button>
            </div>
          )}
        </div>

        <footer className="voice-assistant-footer">
          {error && <div className="notice notice-error voice-footer-notice" role="alert">{error}</div>}
          {speechError && <div className="notice notice-warning voice-footer-notice" role="status">{speechError}</div>}
          {modelError && (
            <div className="voice-model-error" role="status">
              <span>{modelError}</span>
              <button type="button" onClick={() => void prepareModel().catch(() => undefined)} disabled={modelStatus === 'preparing'}>Spróbuj ponownie</button>
            </div>
          )}

          {textComposerOpen && (
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
                  disabled={queryBusy}
                  autoComplete="off"
                />
                <button className="secondary-button" type="submit" disabled={!query.trim() || queryBusy}>Wyślij</button>
              </div>
            </form>
          )}

          <div className="voice-ptt-status" id="voice-ptt-status" aria-live="polite">{pushToTalkStatus}</div>
          <div className="voice-microphone-zone">
            <button
              className={`voice-microphone-button${status === 'recording' ? ' is-recording' : ''}${status === 'arming' ? ' is-arming' : ''}`}
              type="button"
              disabled={microphoneDisabled}
              aria-label="Przytrzymaj, aby mówić do Kitchen"
              aria-describedby="voice-ptt-status"
              aria-pressed={status === 'arming' || status === 'recording'}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handleLostPointerCapture}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onBlur={handleMicrophoneBlur}
              onContextMenu={(event) => event.preventDefault()}
            >
              <KitchenIcon name="microphone" size={29} strokeWidth={2} />
            </button>
            <span>{status === 'recording' ? 'Trzymaj, żeby mówić' : 'Przytrzymaj mikrofon'}</span>
          </div>

          <button
            className={`voice-text-toggle${textComposerOpen ? ' is-active' : ''}`}
            type="button"
            onClick={() => setTextComposerOpen((value) => !value)}
            aria-expanded={textComposerOpen}
            aria-controls="voice-query-input"
            disabled={status === 'recording' || status === 'arming'}
          >
            <KitchenIcon name="edit" size={16} />
            <span>{textComposerOpen ? 'Ukryj wpisywanie' : 'Wpisz pytanie'}</span>
          </button>
        </footer>
      </section>
    </div>
  )
}
