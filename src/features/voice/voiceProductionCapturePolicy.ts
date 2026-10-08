export const VOICE_PRODUCT_MAX_DURATION_MS = 30_000
export const VOICE_PRODUCT_MIN_UTTERANCE_MS = 300
export const VOICE_PRODUCT_MIN_PEAK = 0.003

export function isVoiceProductUtteranceLongEnough(durationMs: number) {
  return Number.isFinite(durationMs) && durationMs >= VOICE_PRODUCT_MIN_UTTERANCE_MS
}
