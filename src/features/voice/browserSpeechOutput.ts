export interface SpeechOutputAdapter {
  supported: boolean
  speak(text: string): Promise<void>
  cancel(): void
}

export class BrowserSpeechOutputAdapter implements SpeechOutputAdapter {
  get supported() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  }

  cancel() {
    if (!this.supported) return
    window.speechSynthesis.cancel()
  }

  speak(text: string) {
    if (!this.supported) return Promise.reject(new Error('Synteza mowy nie jest dostępna na tym urządzeniu.'))
    const clean = text.trim()
    if (!clean) return Promise.resolve()

    this.cancel()
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'pl-PL'
    utterance.rate = 1
    utterance.pitch = 1

    const voices = window.speechSynthesis.getVoices()
    const polishVoice = voices.find((voice) => voice.lang.toLocaleLowerCase().startsWith('pl'))
    if (polishVoice) utterance.voice = polishVoice

    return new Promise<void>((resolve, reject) => {
      utterance.onend = () => resolve()
      utterance.onerror = (event) => reject(new Error(event.error || 'Nie udało się odczytać odpowiedzi głosem.'))
      window.speechSynthesis.speak(utterance)
    })
  }
}
