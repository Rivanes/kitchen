import type { CleaningTask } from './cleaningTasks'

/** H6.2: a room is a task catalogue, not a dashboard.
 * Count all persisted non-archived tasks exactly once, including completed one-offs.
 * Completion event rows are never part of this count.
 */
export function countCleaningRoomTasks(tasks: ReadonlyArray<Pick<CleaningTask, 'roomId' | 'isArchived'>>) {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    if (task.isArchived) continue
    counts.set(task.roomId, (counts.get(task.roomId) ?? 0) + 1)
  }
  return counts
}
