import { addCalendarDays } from './cleaningSchedule.ts'
import type { CleaningTask } from './cleaningTasks'

/** Derived, read-only projections: never invent future recurrence occurrences. */
export function cleaningDashboardGroups(
  tasks: CleaningTask[], activeRoomIds: Set<string>, today: string, upcomingDays = 7,
) {
  const open = tasks.filter((task) =>
    !task.isArchived && !task.isCompleted && activeRoomIds.has(task.roomId))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate) || a.title.localeCompare(b.title, 'pl'))
  const cutoff = addCalendarDays(today, upcomingDays)
  return {
    due: open.filter((task) => task.nextDueDate <= today),
    upcoming: open.filter((task) => task.nextDueDate > today && task.nextDueDate <= cutoff),
  }
}
