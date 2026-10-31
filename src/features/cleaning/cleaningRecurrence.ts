/** Calendar-date semantics, independent of Inventory expiry and device timezone.
 * Server (Postgres) owns committed next_due_date; these helpers only validate/show it.
 */
export type CleaningRecurrenceKind = 'once' | 'every_days' | 'every_weeks' | 'every_months'

export const cleaningRecurrenceOptions: { value: CleaningRecurrenceKind; label: string }[] = [
  { value: 'once', label: 'Jednorazowo' },
  { value: 'every_days', label: 'Dni' },
  { value: 'every_weeks', label: 'Tygodnie' },
  { value: 'every_months', label: 'Miesiące' },
]

export function recurrenceBounds(kind: CleaningRecurrenceKind): { min: number; max: number } | null {
  switch (kind) {
    case 'once': return null
    case 'every_days': return { min: 1, max: 365 }
    case 'every_weeks': return { min: 1, max: 52 }
    case 'every_months': return { min: 1, max: 24 }
  }
}

export function validateCleaningRecurrence(kind: CleaningRecurrenceKind, interval: number | null) {
  const bounds = recurrenceBounds(kind)
  if (!bounds) {
    if (interval !== null) throw new Error('Jednorazowe zadanie nie ma interwału.')
    return { kind, interval: null }
  }
  if (interval === null || !Number.isInteger(interval) || interval < bounds.min || interval > bounds.max) {
    throw new Error(`Ustaw liczbę od ${bounds.min} do ${bounds.max} dla wybranego cyklu.`)
  }
  return { kind, interval }
}

export function recurrenceLabel(kind: CleaningRecurrenceKind, interval: number | null): string {
  if (kind === 'once') return 'Jednorazowo'
  if (!interval) return 'Cykl nieustawiony'
  const few = interval % 10 >= 2 && interval % 10 <= 4 && (interval % 100 < 12 || interval % 100 > 14)
  const unit = kind === 'every_days' ? 'dni' : kind === 'every_weeks' ? (few ? 'tygodnie' : 'tygodni') : (few ? 'miesiące' : 'miesięcy')
  if (interval === 1) return kind === 'every_days' ? 'Codziennie' : kind === 'every_weeks' ? 'Co tydzień' : 'Co miesiąc'
  return `Co ${interval} ${unit}`
}

function dateAtUtcNoon(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Niepoprawna data.')
  const [year, month, day] = date.split('-').map(Number)
  const time = Date.UTC(year, month - 1, day, 12)
  const parsed = new Date(time)
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error('Nieistniejąca data.')
  }
  return time
}

export function cleaningDaysUntil(dueDate: string, today: string): number {
  return Math.round((dateAtUtcNoon(dueDate) - dateAtUtcNoon(today)) / 86_400_000)
}

export type CleaningDueStatus = { kind: 'overdue' | 'today' | 'upcoming'; text: string; daysUntil: number }

export function cleaningDueStatus(dueDate: string, today: string): CleaningDueStatus {
  const daysUntil = cleaningDaysUntil(dueDate, today)
  if (daysUntil < 0) return { kind: 'overdue', text: `Zaległe · ${-daysUntil} ${-daysUntil === 1 ? 'dzień' : 'dni'}`, daysUntil }
  if (daysUntil === 0) return { kind: 'today', text: 'Na dziś', daysUntil }
  return { kind: 'upcoming', text: daysUntil === 1 ? 'Jutro' : `Za ${daysUntil} dni`, daysUntil }
}

/** Client-side preview ONLY; actual next_due_date is committed by PostgreSQL. */
export function previewNextCleaningDue(completedLocalDate: string, kind: CleaningRecurrenceKind, interval: number | null): string | null {
  const valid = validateCleaningRecurrence(kind, interval)
  if (valid.kind === 'once' || valid.interval === null) return null
  const time = dateAtUtcNoon(completedLocalDate)
  const d = new Date(time)
  if (valid.kind === 'every_days') d.setUTCDate(d.getUTCDate() + valid.interval)
  else if (valid.kind === 'every_weeks') d.setUTCDate(d.getUTCDate() + 7 * valid.interval)
  else {
    const originalDay = d.getUTCDate()
    const year = d.getUTCFullYear()
    const targetMonth = d.getUTCMonth() + valid.interval
    const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0, 12)).getUTCDate()
    d.setUTCDate(1)
    d.setUTCMonth(targetMonth)
    d.setUTCDate(Math.min(originalDay, lastDay))
  }
  return d.toISOString().slice(0, 10)
}
