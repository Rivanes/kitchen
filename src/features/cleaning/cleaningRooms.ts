import { supabase } from '../../lib/supabase/client'

export type CleaningRoom = {
  id: string
  ownerId: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

type CleaningRoomRow = {
  id: string
  owner_id: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

const roomProjection = 'id, owner_id, name, sort_order, created_at, updated_at'

function requireClient() {
  if (!supabase) throw new Error('Brak połączenia z Supabase.')
  return supabase
}

export function validateCleaningRoomName(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ')
  if (!cleaned || cleaned.length > 80 || /[\x00-\x1f\x7f]/.test(cleaned)) {
    throw new Error('Podaj nazwę pomieszczenia od 1 do 80 znaków.')
  }
  return cleaned
}

function parseRoom(row: CleaningRoomRow): CleaningRoom {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function sortCleaningRooms(rooms: CleaningRoom[]): CleaningRoom[] {
  return [...rooms].sort((a, b) => (
    a.sortOrder - b.sortOrder
    || a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' })
    || a.id.localeCompare(b.id)
  ))
}

function mapRoomWriteError(error: { code?: string; message: string }, operation: string): never {
  if (error.code === '23505') throw new Error('Pomieszczenie o tej nazwie już istnieje. Wybierz inną nazwę.')
  if (error.code === '23514') throw new Error('Nazwa pomieszczenia nie spełnia wymagań.')
  if (error.code === '42P01' || error.code === 'PGRST205') {
    throw new Error('Moduł Porządki nie jest jeszcze przygotowany w bazie. Uruchom migrację H2.')
  }
  throw new Error(`Nie udało się ${operation}: ${error.message}`)
}

export async function loadCleaningRooms(ownerId: string): Promise<CleaningRoom[]> {
  const { data, error } = await requireClient()
    .from('cleaning_rooms')
    .select(roomProjection)
    .eq('owner_id', ownerId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) mapRoomWriteError(error, 'pobrać pomieszczeń')
  return sortCleaningRooms(((data ?? []) as CleaningRoomRow[]).map(parseRoom))
}

export async function createCleaningRoom(ownerId: string, rawName: string): Promise<CleaningRoom> {
  const name = validateCleaningRoomName(rawName)
  const { data, error } = await requireClient()
    .from('cleaning_rooms')
    .insert({ owner_id: ownerId, name })
    .select(roomProjection)
    .single()

  if (error) mapRoomWriteError(error, 'dodać pomieszczenia')
  if (!data) throw new Error('Nie udało się potwierdzić dodania pomieszczenia.')
  return parseRoom(data as CleaningRoomRow)
}

export async function renameCleaningRoom(ownerId: string, roomId: string, rawName: string): Promise<CleaningRoom> {
  const name = validateCleaningRoomName(rawName)
  const { data, error } = await requireClient()
    .from('cleaning_rooms')
    .update({ name })
    .eq('id', roomId)
    .eq('owner_id', ownerId)
    .select(roomProjection)
    .maybeSingle()

  if (error) mapRoomWriteError(error, 'zmienić nazwy pomieszczenia')
  if (!data) throw new Error('Nie znaleziono aktywnego pomieszczenia do edycji.')
  return parseRoom(data as CleaningRoomRow)
}

/** H7.6E: only the owner-checked atomic RPC can delete a room and its task history. */
export async function deleteCleaningRoom(roomId: string): Promise<void> {
  const { data, error } = await requireClient()
    .rpc('h76_delete_cleaning_room', { p_room_id: roomId })

  if (error?.code === '42501') throw new Error('Brak uprawnień do usunięcia pomieszczenia.')
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    throw new Error('Brakuje funkcji usuwania pomieszczeń w Supabase. Najpierw wdroż SQL H7.6E.')
  }
  if (error) mapRoomWriteError(error, 'usunąć pomieszczenia')
  // false is an idempotent success after a lost HTTP reply; the caller reconciles its list.
  if (data !== true && data !== false) throw new Error('Nie udało się potwierdzić usunięcia pomieszczenia.')
}
