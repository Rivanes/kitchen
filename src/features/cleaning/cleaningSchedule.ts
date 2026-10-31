import type { CleaningTask } from './cleaningTasks'

/** H5 projects the ONE persisted next_due_date for each task, not imagined future cycles.
 * Calendar math always operates on civil dates (UTC noon), never local device midnight.
 */
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

type ScheduleItem = Pick<CleaningTask, 'id' | 'nextDueDate' | 'roomId' | 'isArchived' | 'isCompleted'>

export function visibleScheduleTasks<T extends ScheduleItem>(
  tasks: T[], activeRoomIds: ReadonlySet<string>, selectedRoomId: string,
): T[] {
  return tasks.filter((task) => !task.isArchived && activeRoomIds.has(task.roomId)
    && (selectedRoomId === 'all' || task.roomId === selectedRoomId))
}

export function dueOn<T extends ScheduleItem>(tasks: T[], date: string): T[] {
  return tasks.filter((task) => task.nextDueDate === date)
}

export function overdueBefore<T extends ScheduleItem>(tasks: T[], today: string): T[] {
  return tasks.filter((task) => !task.isCompleted && task.nextDueDate < today)
}

export function scheduleDateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  const format = new Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', ...options })
  return format.format(new Date(calendarDateMillis(date)))
}
