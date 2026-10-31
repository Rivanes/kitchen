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

export function scheduleRange(date: string, mode: 'day' | 'week', today: string) {
  // Always fetch visible week for dots; a partial historical week is clipped to today-7.
  const days = daysOfWeek(date)
  return { from: clampScheduleDay(days[0], today), to: days[6], days,
    activeFrom: mode === 'day' ? date : clampScheduleDay(days[0], today),
    activeTo: mode === 'day' ? date : days[6] }
}

export type ScheduleEntry = { occurrence: CleaningOccurrence; task: CleaningTask }

export function scheduleEntries(occurrences: CleaningOccurrence[], tasks: CleaningTask[], activeRoomIds: ReadonlySet<string>, roomFilter: string): ScheduleEntry[] {
  const byId = new Map(tasks.map((task) => [task.id, task]))
  return occurrences.flatMap((occurrence) => {
    const task = byId.get(occurrence.taskId)
    if (!task || task.isArchived || !activeRoomIds.has(task.roomId) ||
        (roomFilter !== 'all' && task.roomId !== roomFilter)) return []
    return [{ occurrence, task }]
  }).sort((a, b) => a.occurrence.scheduledDueDate.localeCompare(b.occurrence.scheduledDueDate)
    || Number(a.occurrence.isDone) - Number(b.occurrence.isDone)
    || a.task.title.localeCompare(b.task.title, 'pl'))
}

export function entriesOn(entries: ScheduleEntry[], date: string) {
  return entries.filter((entry) => entry.occurrence.scheduledDueDate === date)
}

/** Open backlog remains actionable even when its original date has aged out of the calendar. */
export function overdueBacklog(tasks: CleaningTask[], activeRoomIds: ReadonlySet<string>, roomFilter: string, today: string, rangeStart: string): CleaningTask[] {
  return tasks.filter((task) => !task.isArchived && !task.isCompleted && task.nextDueDate < today
    && task.nextDueDate < rangeStart && activeRoomIds.has(task.roomId)
    && (roomFilter === 'all' || task.roomId === roomFilter))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate) || a.title.localeCompare(b.title, 'pl'))
}

export function scheduleDateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  const format = new Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', ...options })
  return format.format(new Date(calendarDateMillis(date)))
}

/** Horizontal intent must exceed vertical movement, so native vertical scrolling remains fluid. */
export function swipeDirection(deltaX: number, deltaY: number, startX: number, viewportWidth: number): -1 | 0 | 1 {
  if (startX < 25 || startX > viewportWidth - 25 || Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return 0
  return deltaX < 0 ? 1 : -1
}

/** Strict latest-only undo eligibility; older history rows are never clickable. */
export function canUndoOccurrence(occurrence: CleaningOccurrence, task: CleaningTask,
  latest: { dueDate: string; completedAt: string } | undefined): boolean {
  return occurrence.isDone && Boolean(task.lastCompletedAt && latest
    && latest.completedAt === task.lastCompletedAt
    && latest.dueDate === occurrence.scheduledDueDate)
}
