export type ExpiryTone = 'overdue' | 'today' | 'soon' | 'later' | 'none'

export type ExpiryMeta = {
  date: string | null
  daysUntil: number | null
  tone: ExpiryTone
  label: string
  exactLabel: string
  needsAttention: boolean
}

const DAY_MS = 86_400_000

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = Date.UTC(year, month - 1, day)
  const parsed = new Date(utc)

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day, utc }
}

function todayUtc(now: Date) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

export function isValidDateOnly(value: string) {
  return dateParts(value) !== null
}

export function formatDateOnly(value: string) {
  const parts = dateParts(value)
  if (!parts) return value
  return `${String(parts.day).padStart(2, '0')}.${String(parts.month).padStart(2, '0')}.${parts.year}`
}

export function daysUntilDate(value: string, now = new Date()) {
  const parts = dateParts(value)
  if (!parts) return null
  return Math.round((parts.utc - todayUtc(now)) / DAY_MS)
}

export function getExpiryMeta(value: string | null, now = new Date()): ExpiryMeta {
  if (!value) {
    return {
      date: null,
      daysUntil: null,
      tone: 'none',
      label: '',
      exactLabel: '',
      needsAttention: false,
    }
  }

  const daysUntil = daysUntilDate(value, now)
  const exactLabel = formatDateOnly(value)
  if (daysUntil === null) {
    return {
      date: value,
      daysUntil: null,
      tone: 'later',
      label: `Do ${exactLabel}`,
      exactLabel,
      needsAttention: false,
    }
  }

  if (daysUntil < 0) {
    return {
      date: value,
      daysUntil,
      tone: 'overdue',
      label: daysUntil === -1 ? '1 dzień po terminie' : `${Math.abs(daysUntil)} dni po terminie`,
      exactLabel,
      needsAttention: true,
    }
  }

  if (daysUntil === 0) {
    return { date: value, daysUntil, tone: 'today', label: 'Dzisiaj', exactLabel, needsAttention: true }
  }

  if (daysUntil === 1) {
    return { date: value, daysUntil, tone: 'today', label: 'Jutro', exactLabel, needsAttention: true }
  }

  if (daysUntil <= 7) {
    return {
      date: value,
      daysUntil,
      tone: 'soon',
      label: `Za ${daysUntil} dni`,
      exactLabel,
      needsAttention: true,
    }
  }

  return {
    date: value,
    daysUntil,
    tone: 'later',
    label: `Do ${exactLabel}`,
    exactLabel,
    needsAttention: false,
  }
}

export function compareExpiryDates(a: string | null, b: string | null) {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}
