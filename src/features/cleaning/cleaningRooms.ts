import { supabase } from '../../lib/supabase/client'

export type CleaningRoom = {
  id: string
  ownerId: string
  name: string
  sortOrder: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

type CleaningRoomRow = {
  id: string
  owner_id: string
  name: string
  sort_order: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

const roomProjection = 'id, owner_id, name, sort_order, is_archived, created_at, updated_at'

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
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function sortCleaningRooms(rooms: CleaningRoom[]): CleaningRoom[] {
  return [...rooms].sort((a, b) => (
    Number(a.isArchived) - Number(b.isArchived)
    || a.sortOrder - b.sortOrder
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
    .eq('is_archived', false)
    .select(roomProjection)
    .maybeSingle()

  if (error) mapRoomWriteError(error, 'zmienić nazwy pomieszczenia')
  if (!data) throw new Error('Nie znaleziono aktywnego pomieszczenia do edycji.')
  return parseRoom(data as CleaningRoomRow)
}

export async function setCleaningRoomArchived(ownerId: string, roomId: string, archived: boolean): Promise<CleaningRoom> {
  const { data, error } = await requireClient()
    .from('cleaning_rooms')
    .update({ is_archived: archived })
    .eq('id', roomId)
    .eq('owner_id', ownerId)
    .eq('is_archived', !archived)
    .select(roomProjection)
    .maybeSingle()

  if (error) mapRoomWriteError(error, archived ? 'zarchiwizować pomieszczenia' : 'przywrócić pomieszczenia')
  if (!data) throw new Error('Pomieszczenie zmieniło już swój status. Odśwież listę.')
  return parseRoom(data as CleaningRoomRow)
}
