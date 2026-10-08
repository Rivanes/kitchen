import type { LocalSpeechToTextAdapter, LocalSttBackend } from './localSttTypes'
import { TransformersLocalSttAdapter } from './transformersLocalSttAdapter'

// V6.1A has not locked the final production model yet. The read-only Voice shell
// deliberately depends on this one provider boundary so the STT runtime can be
// swapped after phone QA without changing Kitchen query/NLU logic.
export const VOICE_READONLY_STT_BACKEND: LocalSttBackend = 'wasm'

export function createVoiceSpeechToTextAdapter(): LocalSpeechToTextAdapter {
  return new TransformersLocalSttAdapter()
}
