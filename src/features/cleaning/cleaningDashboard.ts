import { addCalendarDays } from './cleaningSchedule.ts'
import type { CleaningTask } from './cleaningTasks'
import type { CleaningOccurrence } from './cleaningOccurrences'

/** H6.4.3: the server is the ONLY authority for future dates.
 * The current open cursor is separately retained for overdue obligations that
 * predate the seven-day calendar window. A definition never creates a future
 * occurrence on the client.
 */
export type DashboardOccurrence = { task: CleaningTask; occurrence: CleaningOccurrence }

export function cleaningDashboardGroups(
  tasks: CleaningTask[], occurrences: CleaningOccurrence[], activeRoomIds: ReadonlySet<string>,
  today: string, upcomingDays = 7,
): { due: DashboardOccurrence[]; upcoming: DashboardOccurrence[] } {
  const eligible = tasks.filter((task) => !task.isArchived && !task.isCompleted && activeRoomIds.has(task.roomId))
  const taskById = new Map(eligible.map((task) => [task.id, task]))
  const cutoff = addCalendarDays(today, upcomingDays)
  const scheduled = occurrences.flatMap((occurrence) => {
    const task = taskById.get(occurrence.taskId)
    if (!task || occurrence.isDone || occurrence.scheduledDueDate <= today || occurrence.scheduledDueDate > cutoff
      || occurrence.roomId !== task.roomId || occurrence.scheduleRevision !== task.scheduleRevision
      || occurrence.cycleGeneration !== task.cycleGeneration) return []
    return [{ task, occurrence }]
  })
  // A network replay could return duplicates; one card per task + scheduled day.
  const seen = new Set<string>()
  const upcoming = scheduled.filter(({ task, occurrence }) => {
    const key = `${task.id}:${occurrence.scheduledDueDate}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => a.occurrence.scheduledDueDate.localeCompare(b.occurrence.scheduledDueDate)
    || a.task.title.localeCompare(b.task.title, 'pl') || a.task.id.localeCompare(b.task.id))

  // This list deliberately uses the current SERVER cursor, including old
  // overdue tasks. Do not accidentally delete obligations with history retention.
  const due = eligible.filter((task) => task.nextDueDate <= today)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)
      || a.title.localeCompare(b.title, 'pl') || a.id.localeCompare(b.id))
    .map((task) => ({ task, occurrence: {
      taskId: task.id, roomId: task.roomId, scheduledDueDate: task.nextDueDate,
      completedLocalDate: null, isDone: false, isActionable: true,
      scheduleRevision: task.scheduleRevision, cycleGeneration: task.cycleGeneration,
    } }))
  return { due, upcoming }
}
