import type { CleaningTask } from './cleaningTasks'
import type { CleaningOccurrence } from './cleaningOccurrences'

/** Civil date arithmetic: UTC noon prevents device-timezone and DST drift. */
export function calendarDateMillis(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Niepoprawna data kalendarza.')
  const [year, month, day] = date.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day, 12)
  const test = new Date(utc)
  if (test.getUTCFullYear() !== year || test.getUTCMonth() !== month - 1 || test.getUTCDate() !== day) {
    throw new Error('Nieistniejąca data kalendarza.')
  }
  return utc
}

export function addCalendarDays(date: string, offset: number): string {
  if (!Number.isInteger(offset) || Math.abs(offset) > 3660) throw new Error('Niepoprawne przesunięcie kalendarza.')
  const next = new Date(calendarDateMillis(date))
  next.setUTCDate(next.getUTCDate() + offset)
  return next.toISOString().slice(0, 10)
}

export function mondayOfWeek(date: string): string {
  const day = new Date(calendarDateMillis(date)).getUTCDay()
  return addCalendarDays(date, -(day === 0 ? 6 : day - 1))
}

export function daysOfWeek(date: string): string[] {
  const monday = mondayOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(monday, index))
}

export function earliestScheduleDay(today: string): string { return addCalendarDays(today, -7) }

export function clampScheduleDay(date: string, today: string): string {
  const floor = earliestScheduleDay(today)
  return date < floor ? floor : date
}

/** The first visible date is independent from the selected agenda date. */
export function rollingScheduleDays(start: string, count = 7): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 42) throw new Error('Niepoprawny zakres dni.')
  return Array.from({ length: count }, (_, index) => addCalendarDays(start, index))
}

export function shortCalendarWeekday(date: string): string {
  return ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'][new Date(calendarDateMillis(date)).getUTCDay()]
}

/** A 35-day request can be reused for many 1-day shifts; RPC accepts <= 42 days. */
export function scheduleQueryRange(start: string, today: string): { from: string; to: string } {
  const floor = earliestScheduleDay(today)
  const index = Math.floor((calendarDateMillis(start) - calendarDateMillis(floor)) / (14 * 86_400_000))
  const anchor = addCalendarDays(floor, Math.max(0, index) * 14)
  return { from: clampScheduleDay(addCalendarDays(anchor, -7), today), to: addCalendarDays(anchor, 27) }
}

export function rollingScheduleHeader(start: string): string {
  const end = addCalendarDays(start, 6)
  const a = scheduleDateLabel(start, { month: 'long', year: 'numeric' })
  if (start.slice(0, 7) === end.slice(0, 7)) return a
  const b = scheduleDateLabel(end, { month: 'long', year: 'numeric' })
  if (start.slice(0, 4) === end.slice(0, 4)) {
    return `${scheduleDateLabel(start, { month: 'long' })} – ${b}`
  }
  return `${a} – ${b}`
}

export function calendarDayDistance(from: string, to: string): number {
  return Math.round((calendarDateMillis(to) - calendarDateMillis(from)) / 86_400_000)
}

/** Native scroll position translated into an integer daily shift; 7 extra cells per side. */
export function rollingScrollShift(scrollLeft: number, width: number, start: string, today: string): number {
  if (!Number.isFinite(scrollLeft) || !(width > 0)) return 0
  const offset = Math.round((scrollLeft - width) / (width / 7))
  const back = Math.min(7, Math.max(0, calendarDayDistance(earliestScheduleDay(today), start)))
  const shift = Math.max(-back, Math.min(7, offset))
  return shift === 0 ? 0 : shift
}

export type ScheduleEntry = { occurrence: CleaningOccurrence; task: CleaningTask }

/** A completion belongs to its actual local day; original due date is retained for RPC/undo identity. */
export function occurrenceCalendarDay(occurrence: CleaningOccurrence): string {
  return occurrence.isDone && occurrence.completedLocalDate
    ? occurrence.completedLocalDate : occurrence.scheduledDueDate
}

export function scheduleEntries(occurrences: CleaningOccurrence[], tasks: CleaningTask[], activeRoomIds: ReadonlySet<string>): ScheduleEntry[] {
  const byId = new Map(tasks.map((task) => [task.id, task]))
  return occurrences.flatMap((occurrence) => {
    const task = byId.get(occurrence.taskId)
    if (!task || task.isArchived || !activeRoomIds.has(task.roomId)) return []
    return [{ occurrence, task }]
  }).sort((a, b) => occurrenceCalendarDay(a.occurrence).localeCompare(occurrenceCalendarDay(b.occurrence))
    || Number(a.occurrence.isDone) - Number(b.occurrence.isDone)
    || a.task.title.localeCompare(b.task.title, 'pl'))
}

export function entriesOn(entries: ScheduleEntry[], date: string) {
  return entries.filter((entry) => occurrenceCalendarDay(entry.occurrence) === date)
}

/** Open backlog remains actionable even when its original date has aged out of the calendar. */
export function overdueBacklog(tasks: CleaningTask[], activeRoomIds: ReadonlySet<string>, today: string): CleaningTask[] {
  return tasks.filter((task) => !task.isArchived && !task.isCompleted && task.nextDueDate < today
    && activeRoomIds.has(task.roomId))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate) || a.title.localeCompare(b.title, 'pl'))
}

export function scheduleDateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  const format = new Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', ...options })
  return format.format(new Date(calendarDateMillis(date)))
}

/** Strict latest-only undo eligibility; older history rows are never clickable. */
export function canUndoOccurrence(occurrence: CleaningOccurrence, task: CleaningTask,
  latest: { dueDate: string; completedAt: string } | undefined): boolean {
  return occurrence.isDone && Boolean(task.lastCompletedAt && latest
    && latest.completedAt === task.lastCompletedAt
    && latest.dueDate === occurrence.scheduledDueDate)
}
