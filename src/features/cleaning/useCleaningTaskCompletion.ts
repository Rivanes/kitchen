import { useRef, useState } from 'react'
import { completeCleaningTask, type CleaningTask } from './cleaningTasks'

/** One H4 idempotency authority for Start, Rooms and Schedule.
 * A network-ambiguous retry retains the operation UUID; a generation change
 * requires an explicit refresh rather than completing the next cycle.
 */
export function useCleaningTaskCompletion() {
  const [busyId, setBusyId] = useState<string | null>(null)
  const inFlight = useRef(false)
  const pending = useRef(new Map<string, { id: string; generation: number }>())

  async function run(task: CleaningTask): Promise<CleaningTask | null> {
    if (inFlight.current || task.isArchived || task.isCompleted) return null
    const previous = pending.current.get(task.id)
    if (previous && previous.generation !== task.cycleGeneration) {
      pending.current.delete(task.id)
      throw new Error('Cykl zadania zmienił się. Odśwież listę przed kolejnym wykonaniem.')
    }
    const operation = previous ?? { id: crypto.randomUUID(), generation: task.cycleGeneration }
    pending.current.set(task.id, operation)
    inFlight.current = true
    setBusyId(task.id)
    try {
      const saved = await completeCleaningTask(task.id, operation.generation, operation.id)
      // H6.3: a late replay of an UNDONE operation returns the current row from H4,
      // but it must never be presented as a newly successful completion.
      if (saved.cycleGeneration !== operation.generation + 1 || !saved.lastCompletedAt ||
          (task.recurrenceKind === 'once' && !saved.isCompleted)) {
        pending.current.delete(task.id)
        throw new Error('Wykonanie zostało cofnięte albo cykl zmienił się. Odśwież zadanie.')
      }
      pending.current.delete(task.id)
      return saved
    } finally {
      inFlight.current = false
      setBusyId(null)
    }
  }

  return { run, busyId, inFlight }
}
