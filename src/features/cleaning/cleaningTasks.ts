import { supabase } from '../../lib/supabase/client'
import { validateCleaningRecurrence, type CleaningRecurrenceKind } from './cleaningRecurrence'

/** H4: server owns recurrence generation; client never advances persisted dates. */
export type CleaningTask = {
  id: string
  ownerId: string
  roomId: string
  title: string
  notes: string
  nextDueDate: string
  recurrenceKind: CleaningRecurrenceKind
  recurrenceInterval: number | null
  cycleGeneration: number
  isCompleted: boolean
  isArchived: boolean
  lastCompletedAt: string | null
  createdAt: string
}

export type CleaningCompletion = {
  id: string
  completedAt: string
  completedLocalDate: string
  dueDateBefore: string
  dueDateAfter: string | null
  cycleGeneration: number
}

type TaskRow = {
  id: string; owner_id: string; room_id: string; title: string; notes: string
  next_due_date: string; recurrence_kind: CleaningRecurrenceKind; recurrence_interval: number | null; cycle_generation: number; is_completed: boolean
  is_archived: boolean; last_completed_at: string | null; created_at: string
}

type CompletionRow = {
  id: string; completed_at: string; completed_local_date: string
  due_date_before: string; due_date_after: string | null; cycle_generation: number
}

const taskColumns = 'id,owner_id,room_id,title,notes,next_due_date,recurrence_kind,recurrence_interval,cycle_generation,is_completed,is_archived,last_completed_at,created_at'
const completionColumns = 'id,completed_at,completed_local_date,due_date_before,due_date_after,cycle_generation'

function requireClient() {
  if (!supabase) throw new Error('Brak połączenia z Supabase.')
  return supabase
}

function parseTask(row: TaskRow): CleaningTask {
  return {
    id: row.id, ownerId: row.owner_id, roomId: row.room_id,
    title: row.title, notes: row.notes, nextDueDate: row.next_due_date,
    recurrenceKind: row.recurrence_kind, recurrenceInterval: row.recurrence_interval,
    cycleGeneration: row.cycle_generation, isCompleted: row.is_completed,
    isArchived: row.is_archived, lastCompletedAt: row.last_completed_at, createdAt: row.created_at,
  }
}

function fail(error: { code?: string; message: string } | null, defaultMessage: string): never {
  if (error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === 'PGRST202' || error?.code === '42883') {
    throw new Error('Brak tabel lub funkcji Porządki H4 w Supabase. Sprawdź migrację.')
  }
  if (error?.code === 'P0001') throw new Error('Zadanie zostało już zmienione. Odśwież listę.')
  if (error?.code === 'P0002') throw new Error('Pomieszczenie lub zadanie jest niedostępne. Odśwież listę.')
  if (error?.code === '42501') throw new Error('Brak uprawnień do wykonania operacji.')
  throw new Error(`${defaultMessage}${error ? ` ${error.message}` : ''}`)
}

export function validateCleaningTask(title: string, notes: string, dueDate: string) {
  const cleanTitle = title.trim().replace(/\s+/g, ' ')
  const cleanNotes = notes.trim().replace(/\r\n?/g, '\n')
  if (!cleanTitle || cleanTitle.length > 120 || /[\x00-\x1f\x7f]/.test(cleanTitle)) {
    throw new Error('Nazwa zadania musi mieć 1–120 znaków.')
  }
  if (cleanNotes.length > 500 || /[\x00-\x09\x0b-\x1f\x7f]/.test(cleanNotes)) {
    throw new Error('Opis może mieć maksymalnie 500 znaków i nie może zawierać znaków sterujących.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Wybierz prawidłową datę zadania.')
  const date = new Date(`${dueDate}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate) {
    throw new Error('Wybierz istniejącą datę.')
  }
  return { title: cleanTitle, notes: cleanNotes, dueDate }
}

export function todayWarsaw(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = (part: string) => parts.find((p) => p.type === part)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function formatCleaningDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`
}

export function sortCleaningTasks(tasks: CleaningTask[]) {
  return [...tasks].sort((a, b) => (
    Number(a.isArchived) - Number(b.isArchived)
    || Number(a.isCompleted) - Number(b.isCompleted)
    || a.nextDueDate.localeCompare(b.nextDueDate)
    || a.title.localeCompare(b.title, 'pl')
    || a.id.localeCompare(b.id)
  ))
}

export async function loadCleaningTasks(ownerId: string, roomId?: string): Promise<CleaningTask[]> {
  let query = requireClient().from('cleaning_tasks').select(taskColumns).eq('owner_id', ownerId)
  if (roomId) query = query.eq('room_id', roomId)
  const { data, error } = await query.order('next_due_date', { ascending: true })
  if (error) fail(error, 'Nie udało się pobrać zadań.')
  return sortCleaningTasks(((data ?? []) as TaskRow[]).map(parseTask))
}

async function taskRpc(name: string, params: Record<string, unknown>): Promise<CleaningTask> {
  // Only server-side, owner-guarded RPCs can write. No client-side table INSERT/UPDATE/DELETE.
  const { data, error } = await requireClient().rpc(name, params)
  if (error) fail(error, 'Nie udało się zapisać zadania.')
  if (!data) throw new Error('Supabase nie potwierdził zmiany zadania.')
  return parseTask(data as TaskRow)
}

export async function createCleaningTask(roomId: string, title: string, notes: string, dueDate: string,
  recurrenceKind: CleaningRecurrenceKind, recurrenceInterval: number | null) {
  const v = validateCleaningTask(title, notes, dueDate)
  const cycle = validateCleaningRecurrence(recurrenceKind, recurrenceInterval)
  return taskRpc('h4_create_cleaning_task', {
    p_room_id: roomId, p_title: v.title, p_notes: v.notes, p_due_date: v.dueDate,
    p_recurrence_kind: cycle.kind, p_recurrence_interval: cycle.interval,
  })
}

export async function updateCleaningTask(taskId: string, expectedGeneration: number,
  title: string, notes: string, dueDate: string,
  recurrenceKind: CleaningRecurrenceKind, recurrenceInterval: number | null) {
  const v = validateCleaningTask(title, notes, dueDate)
  const cycle = validateCleaningRecurrence(recurrenceKind, recurrenceInterval)
  return taskRpc('h4_update_cleaning_task', {
    p_task_id: taskId, p_expected_generation: expectedGeneration,
    p_title: v.title, p_notes: v.notes, p_due_date: v.dueDate,
    p_recurrence_kind: cycle.kind, p_recurrence_interval: cycle.interval,
  })
}

export async function archiveCleaningTask(taskId: string, archived: boolean) {
  return taskRpc('h3_archive_cleaning_task', { p_task_id: taskId, p_archive: archived })
}

export async function completeCleaningTask(taskId: string, expectedGeneration: number, operationId: string) {
  return taskRpc('h4_complete_cleaning_task', {
    p_task_id: taskId, p_expected_generation: expectedGeneration, p_operation_id: operationId,
  })
}

export async function loadCleaningCompletions(ownerId: string, taskId: string): Promise<CleaningCompletion[]> {
  const { data, error } = await requireClient().from('cleaning_task_completions')
    .select(completionColumns).eq('owner_id', ownerId).eq('task_id', taskId)
    .order('completed_at', { ascending: false }).limit(50)
  if (error) fail(error, 'Nie udało się pobrać historii.')
  return ((data ?? []) as CompletionRow[]).map((row) => ({
    id: row.id, completedAt: row.completed_at, completedLocalDate: row.completed_local_date,
    dueDateBefore: row.due_date_before, dueDateAfter: row.due_date_after, cycleGeneration: row.cycle_generation,
  }))
}

/** H6.1: destructive owner-guarded RPC, intentionally not table DELETE. */
export async function deleteCompletedOneoffTask(taskId: string): Promise<void> {
  const { data, error } = await requireClient().rpc('h6_delete_completed_oneoff_task', { p_task_id: taskId })
  if (error) fail(error, 'Nie udało się usunąć zadania.')
  // false means already absent for this owner: safe, idempotent response after a lost HTTP reply.
  if (data !== true && data !== false) throw new Error('Supabase nie potwierdził usunięcia. Odśwież listę.')
}

/** H6.3: undo only the latest completion; RPC enforces generation and history invariants. */
export async function undoLastCleaningCompletion(task: CleaningTask, operationId: string): Promise<CleaningTask> {
  return taskRpc('h63_undo_last_cleaning_completion', {
    p_task_id: task.id, p_expected_generation: task.cycleGeneration, p_operation_id: operationId,
  })
}

/** Owner-guarded hard deletion of any task and all its completions. */
export async function deleteCleaningTask(taskId: string): Promise<void> {
  const { data, error } = await requireClient().rpc('h63_delete_cleaning_task', { p_task_id: taskId })
  if (error) fail(error, 'Nie udało się usunąć zadania.')
  if (data !== true && data !== false) throw new Error('Brak potwierdzenia usunięcia. Odśwież zadania.')
}
