import { useRef, useState } from 'react'
import { completeCleaningOccurrence, type CleaningOccurrence } from './cleaningOccurrences'
import type { CleaningTask } from './cleaningTasks'

/** H6.4 shared current-cursor execution for Start and Harmonogram.
 * Retries keep the same UUID + revision + generation + scheduled date.
 * Server RPC verifies ownership and rejects stale/future cursors.
 */
export function useCleaningOccurrenceCompletion() {
  const [busyId, setBusyId] = useState<string | null>(null)
  const inFlight = useRef(false)
  const pending = useRef(new Map<string, { id: string; generation: number; revision: number; date: string }>())

  async function run(occurrence: CleaningOccurrence, task: CleaningTask): Promise<CleaningTask | null> {
    if (inFlight.current || task.isArchived || task.isCompleted || occurrence.isDone || !occurrence.isActionable) return null
    const previous = pending.current.get(task.id)
    if (previous && (previous.generation !== occurrence.cycleGeneration
      || previous.revision !== occurrence.scheduleRevision || previous.date !== occurrence.scheduledDueDate)) {
      pending.current.delete(task.id)
      throw new Error('Termin zadania zmienił się. Odśwież harmonogram.')
    }
    const operation = previous ?? {
      id: crypto.randomUUID(), generation: occurrence.cycleGeneration,
      revision: occurrence.scheduleRevision, date: occurrence.scheduledDueDate,
    }
    pending.current.set(task.id, operation)
    inFlight.current = true
    setBusyId(task.id)
    try {
      const saved = await completeCleaningOccurrence(occurrence, operation.id)
      if (saved.cycleGeneration !== occurrence.cycleGeneration + 1 || !saved.lastCompletedAt
        || (task.recurrenceKind === 'once' && !saved.isCompleted)) {
        pending.current.delete(task.id)
        throw new Error('Wykonanie zostało już cofnięte lub termin się zmienił. Odśwież zadania.')
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
