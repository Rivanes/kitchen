import { useEffect, useState, type FormEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { ModulePageHeader } from '../../components/ModulePageHeader'
import { AppFormSheet } from '../../components/AppFormSheet'
import { CleaningTaskBoard } from './CleaningTaskBoard'
import { CleaningStartTasks } from './CleaningStartTasks'
import { CleaningSchedule } from './CleaningSchedule'
import { loadCleaningTasks } from './cleaningTasks'
import { countCleaningRoomTasks } from './cleaningRoomCounts'
import { toUserErrorMessage } from '../../lib/userError'
import { supabase } from '../../lib/supabase/client'
import {
  createCleaningRoom,
  deleteCleaningRoom,
  loadCleaningRooms,
  renameCleaningRoom,
  sortCleaningRooms,
  validateCleaningRoomName,
  type CleaningRoom,
} from './cleaningRooms'

type CleaningView = 'start' | 'rooms' | 'schedule'
type EditorMode = 'create' | 'rename' | null
type RoomsLoad = 'loading' | 'ready' | 'error'
type CountsLoad = 'loading' | 'ready' | 'error'

type CleaningShellProps = {
  ownerId: string
  onExit: () => void
}

/** H5: isolated Cleaning module; schedule reuses H4 owner-scoped read and completion authority. */
export function CleaningShell({ ownerId, onExit }: CleaningShellProps) {
  const [view, setView] = useState<CleaningView>('start')
  const [rooms, setRooms] = useState<CleaningRoom[]>([])
  const [roomsLoad, setRoomsLoad] = useState<RoomsLoad>('loading')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorMode>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ roomId: string; taskCount: number } | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [taskRevision, setTaskRevision] = useState(0)
  const [countsLoad, setCountsLoad] = useState<CountsLoad>('loading')
  const [roomCounts, setRoomCounts] = useState<Map<string, number>>(new Map())
  const [countsError, setCountsError] = useState('')
  const [countsRefresh, setCountsRefresh] = useState(0)
  const [showTodayIntent, setShowTodayIntent] = useState(0)

  useEffect(() => {
    let active = true
    setRoomsLoad('loading')
    setLoadError('')
    loadCleaningRooms(ownerId).then((result) => {
      if (!active) return
      setRooms(result)
      setRoomsLoad('ready')
    }).catch((error: unknown) => {
      if (!active) return
      setLoadError(toUserErrorMessage(error, 'Nie udało się pobrać pomieszczeń.'))
      setRoomsLoad('error')
    })
    return () => { active = false }
  }, [ownerId, reloadToken])

  // H6.2: one owner-scoped task read for the entire Rooms overview, never N+1 per room.
  // Re-fetch after returning from a room / schedule, task mutations and foreground resume.
  useEffect(() => {
    if (view !== 'rooms' || selectedRoomId !== null || roomsLoad !== 'ready') return
    let active = true
    setCountsLoad('loading')
    setCountsError('')
    setRoomCounts(new Map()) // Never present stale numbers or a false zero while loading.
    loadCleaningTasks(ownerId).then((tasks) => {
      if (!active) return
      setRoomCounts(countCleaningRoomTasks(tasks))
      setCountsLoad('ready')
    }).catch((error: unknown) => {
      if (!active) return
      setCountsError(toUserErrorMessage(error, 'Nie udało się pobrać liczby zadań.'))
      setCountsLoad('error')
    })
    return () => { active = false }
  }, [ownerId, view, selectedRoomId, roomsLoad, taskRevision, countsRefresh])

  useEffect(() => {
    if (view !== 'rooms' || selectedRoomId !== null) return
    const refresh = () => {
      if (document.visibilityState !== 'hidden') setCountsRefresh((old) => old + 1)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [view, selectedRoomId])

  const activeRooms = rooms
  const selectedRoom = selectedRoomId ? rooms.find((room) => room.id === selectedRoomId) ?? null : null
  const pageTitle = view === 'rooms' ? selectedRoom?.name ?? 'Pomieszczenia' : view === 'schedule' ? 'Harmonogram' : 'Start'

  function changeView(next: CleaningView) {
    setView(next)
    setSelectedRoomId(null)
    setEditor(null)
    setConfirmDelete(null)
    setActionError('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function openRoom(room: CleaningRoom) {
    setSelectedRoomId(room.id)
    setEditor(null)
    setConfirmDelete(null)
    setActionError('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function openEditor(mode: Exclude<EditorMode, null>) {
    setName(mode === 'rename' ? selectedRoom?.name ?? '' : '')
    setEditor(mode)
    setActionError('')
    setConfirmDelete(null)
  }

  function upsertRoom(updated: CleaningRoom) {
    setRooms((current) => sortCleaningRooms([
      ...current.filter((room) => room.id !== updated.id),
      updated,
    ]))
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || roomsLoad !== 'ready') return
    let normalized: string
    try {
      normalized = validateCleaningRoomName(name)
    } catch (error: unknown) {
      setActionError(toUserErrorMessage(error, 'Nieprawidłowa nazwa.'))
      return
    }
    if (editor === 'rename' && normalized === selectedRoom?.name) {
      setEditor(null)
      return
    }
    setSaving(true)
    setActionError('')
    try {
      const updated = editor === 'rename' && selectedRoom
        ? await renameCleaningRoom(ownerId, selectedRoom.id, normalized)
        : editor === 'create'
          ? await createCleaningRoom(ownerId, normalized)
          : null
      if (!updated) throw new Error('Nie można zapisać zmian w tym pomieszczeniu.')
      upsertRoom(updated)
      setEditor(null)
      setName('')
      setSelectedRoomId(updated.id)
    } catch (error: unknown) {
      setActionError(toUserErrorMessage(error, 'Nie udało się zapisać pomieszczenia.'))
    } finally {
      setSaving(false)
    }
  }

  async function prepareRoomDelete(room: CleaningRoom) {
    if (saving || roomsLoad !== 'ready') return
    setSaving(true)
    setActionError('')
    try {
      const tasks = await loadCleaningTasks(ownerId, room.id)
      setConfirmDelete({ roomId: room.id, taskCount: tasks.length })
    } catch (error: unknown) {
      setActionError(toUserErrorMessage(error, 'Nie udało się sprawdzić zadań pomieszczenia.'))
    } finally {
      setSaving(false)
    }
  }

  async function removeRoom(room: CleaningRoom) {
    if (saving || roomsLoad !== 'ready' || confirmDelete?.roomId !== room.id) return
    setSaving(true)
    setActionError('')
    try {
      await deleteCleaningRoom(room.id)
      setRooms((current) => current.filter((item) => item.id !== room.id))
      setSelectedRoomId(null)
      setConfirmDelete(null)
      setTaskRevision((value) => value + 1)
      setCountsRefresh((value) => value + 1)
    } catch (error: unknown) {
      // A dropped HTTP response may hide a committed deletion. Reconcile without replay.
      try {
        const latest = await loadCleaningRooms(ownerId)
        setRooms(latest)
        if (!latest.some((item) => item.id === room.id)) {
          setSelectedRoomId(null)
          setConfirmDelete(null)
          setTaskRevision((value) => value + 1)
          setCountsRefresh((value) => value + 1)
          return
        }
      } catch { /* Do not assume the room has been removed. */ }
      setActionError(toUserErrorMessage(error, 'Nie udało się usunąć pomieszczenia.'))
    } finally {
      setSaving(false)
    }
  }

  function renderLoadStatus() {
    if (roomsLoad === 'loading') {
      return <div className="cleaning-status-message" role="status">Wczytywanie pomieszczeń…</div>
    }
    if (roomsLoad === 'error') {
      return <div className="cleaning-status-message cleaning-status-error" role="alert"><p>{loadError}</p><button type="button" className="cleaning-link-button" onClick={() => setReloadToken((value) => value + 1)}>Spróbuj ponownie</button></div>
    }
    return null
  }

  const actionErrorBanner = actionError
    ? <div className="cleaning-inline-error" role="alert">{actionError}</div>
    : null

  const roomEditor = editor && (
    <AppFormSheet
      titleId="cleaning-room-editor-title"
      title={editor === 'create' ? 'Nowe pomieszczenie' : 'Zmień nazwę'}
      kicker="POMIESZCZENIA"
      busy={saving}
      onClose={() => { setEditor(null); setActionError('') }}
      className="cleaning-editor-sheet"
    >
      <form className="cleaning-room-editor inventory-form" onSubmit={(event) => { void saveRoom(event) }}>
        <div className="form-field">
          <label htmlFor="cleaning-room-name">Nazwa pomieszczenia</label>
          <input
            id="cleaning-room-name"
            type="text"
            name="room-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="np. Łazienka"
            maxLength={80}
            autoComplete="off"
            disabled={saving}
            required
          />
        </div>
        {actionError && <p className="form-error" role="alert">{actionError}</p>}
        <div className="sheet-actions">
          <button type="button" className="secondary-button" onClick={() => { setEditor(null); setActionError('') }} disabled={saving}>Anuluj</button>
          <button type="submit" className="primary-button" disabled={saving || !name.trim()}>{saving ? 'Zapisywanie…' : 'Zapisz'}</button>
        </div>
      </form>
    </AppFormSheet>
  )

  return (
    <main className="app-layout cleaning-shell">
      <ModulePageHeader title={pageTitle} module="cleaning" onExit={onExit} onLogout={() => { void supabase?.auth.signOut() }} titleId="cleaning-page-title" />

      {view === 'start' && (
        <section className="cleaning-page cleaning-start" aria-label="Start Porządków">
          {renderLoadStatus()}
          {roomsLoad === 'ready' && (activeRooms.length === 0
            ? <div className="cleaning-empty-state"><h2>Dodaj pierwsze pomieszczenie</h2><button type="button" className="cleaning-action" onClick={() => changeView('rooms')}>Pomieszczenia</button></div>
            : <CleaningStartTasks ownerId={ownerId} rooms={rooms}
                onChanged={() => setTaskRevision((n) => n + 1)}
                onShowToday={() => { setShowTodayIntent((n) => n + 1); changeView('schedule') }}
                onOpenRoom={(room) => { setView('rooms'); openRoom(room) }} />)}
        </section>
      )}

      {view === 'rooms' && (
        <section className={`cleaning-page${selectedRoom ? '' : ' cleaning-rooms-overview'}`} aria-labelledby="cleaning-page-title">
          {selectedRoom ? (
            <>
              <div className="page-heading-row cleaning-room-detail-heading">
                <button type="button" className="cleaning-back-button" onClick={() => { setSelectedRoomId(null); setEditor(null); setConfirmDelete(null); setActionError('') }}><KitchenIcon name="chevronLeft" size={18} /> Wszystkie pomieszczenia</button>
                <div className="page-actions">
                  <button type="button" className="icon-button" onClick={() => openEditor('rename')} disabled={saving} aria-label="Zmień nazwę pomieszczenia" title="Zmień nazwę"><KitchenIcon name="edit" size={19}/></button>
                  <details className="cleaning-room-options"><summary className="icon-button" aria-label="Opcje pomieszczenia" title="Opcje pomieszczenia"><KitchenIcon name="chevronDown" size={19}/></summary>
                    <div className="cleaning-room-options-menu">
                      <button type="button" disabled={saving} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void prepareRoomDelete(selectedRoom) }}>Usuń pomieszczenie</button>
                    </div>
                  </details>
                </div>
              </div>
              <>
                  {confirmDelete?.roomId === selectedRoom.id && (
                    <div className="cleaning-delete-confirm cleaning-room-delete-confirm" role="group" aria-label="Potwierdź usunięcie pomieszczenia">
                      <strong>Usunąć pomieszczenie „{selectedRoom.name}”?</strong>
                      <p>{confirmDelete.taskCount === 0
                        ? 'Pomieszczenie zostanie trwale usunięte.'
                        : `Usuniesz także ${confirmDelete.taskCount} ${confirmDelete.taskCount === 1 ? 'zadanie' : confirmDelete.taskCount % 10 >= 2 && confirmDelete.taskCount % 10 <= 4 && (confirmDelete.taskCount % 100 < 12 || confirmDelete.taskCount % 100 > 14) ? 'zadania' : 'zadań'} i historię ich wykonań.`} Tej operacji nie można cofnąć.</p>
                      <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setConfirmDelete(null)} disabled={saving}>Anuluj</button><button type="button" className="cleaning-subtle-danger" onClick={() => { void removeRoom(selectedRoom) }} disabled={saving}>{saving ? 'Usuwanie…' : 'Usuń na stałe'}</button></div>
                    </div>
                  )}
                  {actionErrorBanner}
                  <CleaningTaskBoard key={selectedRoom.id} ownerId={ownerId} room={selectedRoom} onChanged={() => setTaskRevision((n) => n + 1)} />
              </>
            </>
          ) : (
            <>
              {renderLoadStatus()}
              {roomsLoad === 'ready' && (
                <>
                  {!editor && actionErrorBanner}
                  {activeRooms.length > 0 && (
                    <button className="cleaning-add-room-row" type="button" onClick={() => openEditor('create')} disabled={saving}>
                      <KitchenIcon name="plus" size={20} />Dodaj pomieszczenie
                    </button>
                  )}
                  {countsLoad === 'error' && <div className="cleaning-inline-error" role="alert">{countsError} <button className="cleaning-link-button" type="button" onClick={() => setCountsRefresh((n) => n + 1)}>Ponów</button></div>}
                  {activeRooms.length === 0 ? (
                    <div className="cleaning-empty-state cleaning-empty-spacious"><span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="room" size={28} /></span><h2>Jeszcze nie ma pomieszczeń</h2><button className="cleaning-action" type="button" onClick={() => openEditor('create')} disabled={saving}><KitchenIcon name="plus" size={18} />Dodaj pomieszczenie</button></div>
                  ) : (
                    <div className="cleaning-room-list" aria-label="Aktywne pomieszczenia">{activeRooms.map((room) => (
                      <button type="button" className="cleaning-room-card" onClick={() => openRoom(room)} key={room.id}>
                        <span className="cleaning-room-card-icon" aria-hidden="true"><KitchenIcon name="room" size={21} /></span><span className="cleaning-room-card-copy"><strong>{room.name}</strong></span>
                        <span className="cleaning-room-card-end">
                          {countsLoad === 'ready' && <span className="location-count-badge" aria-label={`Liczba zadań: ${roomCounts.get(room.id) ?? 0}`}>{roomCounts.get(room.id) ?? 0}</span>}
                          {countsLoad === 'loading' && <span className="cleaning-room-count-loading" role="status" aria-label="Wczytywanie liczby zadań">…</span>}
                          <KitchenIcon name="chevronRight" size={19} />
                        </span>
                      </button>
                    ))}</div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {view === 'schedule' && <CleaningSchedule ownerId={ownerId} rooms={rooms} jumpToToday={showTodayIntent}
        onOpenRoom={(room) => { setView('rooms'); openRoom(room) }}
        onChanged={() => setTaskRevision((revision) => revision + 1)} />}

      {roomEditor}
      <nav className="bottom-nav cleaning-bottom-nav" aria-label="Nawigacja Porządki">
        <button className={`nav-item${view === 'start' ? ' is-active' : ''}`} type="button" onClick={() => changeView('start')} aria-current={view === 'start' ? 'page' : undefined}><KitchenIcon name="home" /><span>Start</span></button>
        <button className={`nav-item${view === 'rooms' ? ' is-active' : ''}`} type="button" onClick={() => changeView('rooms')} aria-current={view === 'rooms' ? 'page' : undefined}><KitchenIcon name="room" /><span>Pomieszczenia</span></button>
        <button className={`nav-item${view === 'schedule' ? ' is-active' : ''}`} type="button" onClick={() => changeView('schedule')} aria-current={view === 'schedule' ? 'page' : undefined}><KitchenIcon name="calendar" /><span>Harmonogram</span></button>
      </nav>
    </main>
  )
}
