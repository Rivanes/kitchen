import { useRef, useState } from 'react'
import { undoLastCleaningCompletion, type CleaningTask } from './cleaningTasks'

/** Shared H6.3 undo authority for Rooms, Start and Schedule.
 * A network-ambiguous retry reuses the same UUID; never reverts a newer generation.
 */
export function useCleaningTaskUndo() {
  const [undoBusyId, setUndoBusyId] = useState<string | null>(null)
  const inFlightUndo = useRef(false)
  const pending = useRef(new Map<string, { id: string; generation: number }>())

  async function undo(task: CleaningTask): Promise<CleaningTask | null> {
    if (inFlightUndo.current || task.isArchived || !task.lastCompletedAt) return null
    const previous = pending.current.get(task.id)
    if (previous && previous.generation !== task.cycleGeneration) {
      pending.current.delete(task.id)
      throw new Error('Cykl zadania zmienił się. Odśwież listę.')
    }
    const operation = previous ?? { id: crypto.randomUUID(), generation: task.cycleGeneration }
    pending.current.set(task.id, operation)
    setUndoBusyId(task.id)
    inFlightUndo.current = true
    try {
      const saved = await undoLastCleaningCompletion(task, operation.id)
      pending.current.delete(task.id)
      return saved
    } finally {
      inFlightUndo.current = false
      setUndoBusyId(null)
    }
  }

  function clear(taskId: string) { pending.current.delete(taskId) }
  return { undo, clear, undoBusyId, inFlightUndo }
}
