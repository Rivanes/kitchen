import { supabase } from '../../lib/supabase/client'
import type { CleaningTask } from './cleaningTasks'

/** H6.4 anchored schedule: only the server may project/complete occurrences. */
export type CleaningOccurrence = {
  taskId: string
  roomId: string
  scheduledDueDate: string
  completedLocalDate: string | null
  isDone: boolean
  isActionable: boolean
  scheduleRevision: number
  cycleGeneration: number
}

type OccurrenceRow = {
  task_id: string; room_id: string; scheduled_due_date: string
  completed_local_date: string | null; is_done: boolean; is_actionable: boolean
  schedule_revision: number; cycle_generation: number
}

function client() {
  if (!supabase) throw new Error('Brak połączenia z Supabase.')
  return supabase
}

function rpcError(error: { code?: string; message: string } | null): never {
  if (error?.code === 'P0001') throw new Error('Termin został już zmieniony. Odśwież harmonogram.')
  if (error?.code === 'P0002') throw new Error('Zadanie nie jest już dostępne. Odśwież harmonogram.')
  if (error?.code === '42501') throw new Error('Brak uprawnień do wykonania zadania.')
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    throw new Error('Brakuje funkcji H6.4 w Supabase. Sprawdź wdrożenie SQL.')
  }
  throw new Error(`Nie udało się pobrać lub zapisać harmonogramu. ${error?.message ?? ''}`.trim())
}

export async function loadCleaningOccurrences(from: string, to: string): Promise<CleaningOccurrence[]> {
  const { data, error } = await client().rpc('h64_list_cleaning_occurrences', { p_from: from, p_to: to })
  if (error) rpcError(error)
  return ((data ?? []) as OccurrenceRow[]).map((row) => ({
    taskId: row.task_id,
    roomId: row.room_id,
    scheduledDueDate: row.scheduled_due_date,
    completedLocalDate: row.completed_local_date,
    isDone: row.is_done,
    isActionable: row.is_actionable,
    scheduleRevision: row.schedule_revision,
    cycleGeneration: row.cycle_generation,
  }))
}

/** One operation UUID is retained for ambiguous retries of the same occurrence. */
export async function completeCleaningOccurrence(occurrence: CleaningOccurrence, operationId: string): Promise<CleaningTask> {
  const { data, error } = await client().rpc('h64_complete_cleaning_occurrence', {
    p_task_id: occurrence.taskId,
    p_expected_generation: occurrence.cycleGeneration,
    p_operation_id: operationId,
    p_scheduled_due_date: occurrence.scheduledDueDate,
    p_schedule_revision: occurrence.scheduleRevision,
  })
  if (error) rpcError(error)
  if (!data) throw new Error('Brak potwierdzenia wykonania zadania.')
  const row = data as {
    id: string; owner_id: string; room_id: string; title: string; notes: string; next_due_date: string
    recurrence_kind: CleaningTask['recurrenceKind']; recurrence_interval: number | null
    cycle_generation: number; schedule_revision: number; is_completed: boolean; is_archived: boolean; last_completed_at: string | null
    created_at: string
  }
  return {
    id: row.id, ownerId: row.owner_id, roomId: row.room_id, title: row.title, notes: row.notes,
    nextDueDate: row.next_due_date, recurrenceKind: row.recurrence_kind,
    recurrenceInterval: row.recurrence_interval, cycleGeneration: row.cycle_generation, scheduleRevision: row.schedule_revision,
    isCompleted: row.is_completed, isArchived: row.is_archived,
    lastCompletedAt: row.last_completed_at, createdAt: row.created_at,
  }
}

/** H6.3 undo remains latest-only. Read limited retained snapshots in ONE owner-scoped query,
 * and match completed_at to tasks.last_completed_at before enabling the checked box.
 * Never offer undo of an earlier occurrence that would instead revert a newer one.
 */
export type CleaningRecentCompletion = { taskId: string; dueDate: string; completedAt: string }
export async function loadRecentCleaningCompletions(ownerId: string, from: string): Promise<CleaningRecentCompletion[]> {
  const { data, error } = await client().from('cleaning_task_completions')
    .select('task_id,scheduled_due_date,completed_at')
    .eq('owner_id', ownerId).gte('completed_local_date', from).is('undone_at', null)
    .order('completed_at', { ascending: false }).limit(1000)
  if (error) rpcError(error)
  return ((data ?? []) as { task_id: string; scheduled_due_date: string; completed_at: string }[])
    .map((row) => ({ taskId: row.task_id, dueDate: row.scheduled_due_date, completedAt: row.completed_at }))
}
