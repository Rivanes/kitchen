import type { StorageSnapshot, VoiceSpikeResultRecord } from './localSttTypes'

export const VOICE_SPIKE_RESULTS_KEY = 'kitchen.v6.1a.voice-spike-results'
export const VOICE_SPIKE_RESULT_LIMIT = 24

export const POLISH_VOICE_SPIKE_PHRASES = [
  'Dodaj dwa opakowania mleka do lodówki.',
  'Dodaj passatę Mutti do zakupów.',
  'Kupiłem cztery jajka.',
  'Dodaj trzy butelki wody.',
  'Mam pieprz.',
  'Nie mam papryki słodkiej.',
  'Dodaj dwa opakowania mięsa mielonego.',
  'Jedno opakowanie ma czterysta gramów.',
] as const

export async function readStorageSnapshot(): Promise<StorageSnapshot> {
  if (!navigator.storage?.estimate) {
    return { usage: null, quota: null, persisted: null }
  }

  const [estimate, persisted] = await Promise.all([
    navigator.storage.estimate().catch(() => ({ usage: undefined, quota: undefined })),
    navigator.storage.persisted?.().catch(() => null) ?? Promise.resolve(null),
  ])

  return {
    usage: typeof estimate.usage === 'number' ? estimate.usage : null,
    quota: typeof estimate.quota === 'number' ? estimate.quota : null,
    persisted: typeof persisted === 'boolean' ? persisted : null,
  }
}

export function readStoredVoiceSpikeResults(): VoiceSpikeResultRecord[] {
  try {
    const raw = window.localStorage.getItem(VOICE_SPIKE_RESULTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, VOICE_SPIKE_RESULT_LIMIT) : []
  } catch {
    return []
  }
}

export function storeVoiceSpikeResult(record: VoiceSpikeResultRecord) {
  const current = readStoredVoiceSpikeResults()
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, VOICE_SPIKE_RESULT_LIMIT)
  window.localStorage.setItem(VOICE_SPIKE_RESULTS_KEY, JSON.stringify(next))
  return next
}

export function clearVoiceSpikeResults() {
  window.localStorage.removeItem(VOICE_SPIKE_RESULTS_KEY)
}

export function formatBytes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—'
  if (value < 1024) return `${Math.round(value)} B`
  const kb = value / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export function formatDuration(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—'
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(2)} s`
}
