export type ExpiryTone = 'critical' | 'warning' | 'good' | 'none'
export type EffectiveExpirySource = 'declared' | 'opened' | 'none'

export type ExpiryMeta = {
  date: string | null
  daysUntil: number | null
  tone: ExpiryTone
  label: string
  exactLabel: string
  needsAttention: boolean
  isMissing: boolean
}

export type InventoryExpiryMeta = ExpiryMeta & {
  declaredDate: string | null
  openedUseByDate: string | null
  effectiveSource: EffectiveExpirySource
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

export function addDaysDateOnly(value: string, days: number) {
  const parts = dateParts(value)
  if (!parts || !Number.isInteger(days)) return null
  const next = new Date(parts.utc + days * DAY_MS)
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

export function daysUntilDate(value: string, now = new Date()) {
  const parts = dateParts(value)
  if (!parts) return null
  return Math.round((parts.utc - todayUtc(now)) / DAY_MS)
}

export function getEffectiveExpiryDate(expiryDate: string | null, openedUseByDate: string | null) {
  if (!expiryDate) return openedUseByDate
  if (!openedUseByDate) return expiryDate
  return expiryDate.localeCompare(openedUseByDate) <= 0 ? expiryDate : openedUseByDate
}

export function getExpiryMeta(value: string | null, now = new Date()): ExpiryMeta {
  if (!value) {
    return {
      date: null,
      daysUntil: null,
      tone: 'none',
      label: 'Nie podano',
      exactLabel: '',
      needsAttention: false,
      isMissing: true,
    }
  }

  const daysUntil = daysUntilDate(value, now)
  const exactLabel = formatDateOnly(value)

  if (daysUntil === null) {
    return {
      date: value,
      daysUntil: null,
      tone: 'none',
      label: 'Nieprawidłowa data',
      exactLabel,
      needsAttention: true,
      isMissing: false,
    }
  }

  if (daysUntil < 0) {
    return {
      date: value,
      daysUntil,
      tone: 'critical',
      label: daysUntil === -1 ? '1 dzień po terminie' : `${Math.abs(daysUntil)} dni po terminie`,
      exactLabel,
      needsAttention: true,
      isMissing: false,
    }
  }

  if (daysUntil === 0) {
    return { date: value, daysUntil, tone: 'critical', label: 'Dzisiaj', exactLabel, needsAttention: true, isMissing: false }
  }

  if (daysUntil === 1) {
    return { date: value, daysUntil, tone: 'critical', label: 'Jutro', exactLabel, needsAttention: true, isMissing: false }
  }

  if (daysUntil <= 3) {
    return {
      date: value,
      daysUntil,
      tone: 'critical',
      label: `Za ${daysUntil} dni`,
      exactLabel,
      needsAttention: true,
      isMissing: false,
    }
  }

  if (daysUntil <= 10) {
    return {
      date: value,
      daysUntil,
      tone: 'warning',
      label: `Za ${daysUntil} dni`,
      exactLabel,
      needsAttention: true,
      isMissing: false,
    }
  }

  return {
    date: value,
    daysUntil,
    tone: 'good',
    label: `Do ${exactLabel}`,
    exactLabel,
    needsAttention: false,
    isMissing: false,
  }
}

export function getInventoryExpiryMeta(
  expiryDate: string | null,
  openedUseByDate: string | null,
  now = new Date(),
): InventoryExpiryMeta {
  const effectiveDate = getEffectiveExpiryDate(expiryDate, openedUseByDate)
  const meta = getExpiryMeta(effectiveDate, now)

  let effectiveSource: EffectiveExpirySource = 'none'
  if (effectiveDate && openedUseByDate && effectiveDate === openedUseByDate && (!expiryDate || openedUseByDate.localeCompare(expiryDate) < 0)) {
    effectiveSource = 'opened'
  } else if (effectiveDate) {
    effectiveSource = 'declared'
  }

  return {
    ...meta,
    declaredDate: expiryDate,
    openedUseByDate,
    effectiveSource,
  }
}

export function compareExpiryDates(a: string | null, b: string | null) {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}
