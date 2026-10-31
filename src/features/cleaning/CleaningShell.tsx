import { useEffect, useState, type FormEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { CleaningTaskBoard } from './CleaningTaskBoard'
import { CleaningStartTasks } from './CleaningStartTasks'
import { toUserErrorMessage } from '../../lib/userError'
import { supabase } from '../../lib/supabase/client'
import {
  createCleaningRoom,
  loadCleaningRooms,
  renameCleaningRoom,
  setCleaningRoomArchived,
  sortCleaningRooms,
  validateCleaningRoomName,
  type CleaningRoom,
} from './cleaningRooms'

type CleaningView = 'start' | 'rooms' | 'schedule'
type EditorMode = 'create' | 'rename' | null
type RoomsLoad = 'loading' | 'ready' | 'error'

type CleaningShellProps = {
  ownerId: string
  onExit: () => void
}

/** H3: owner-scoped one-off task UI; H4 recurrence and H5 schedule are separate stages. */
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
  const [showArchived, setShowArchived] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [taskRevision, setTaskRevision] = useState(0)

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

  const activeRooms = rooms.filter((room) => !room.isArchived)
  const archivedRooms = rooms.filter((room) => room.isArchived)
  const selectedRoom = selectedRoomId ? rooms.find((room) => room.id === selectedRoomId) ?? null : null

  function changeView(next: CleaningView) {
    setView(next)
    setSelectedRoomId(null)
    setEditor(null)
    setConfirmArchive(false)
    setActionError('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function openRoom(room: CleaningRoom) {
    setSelectedRoomId(room.id)
    setEditor(null)
    setConfirmArchive(false)
    setActionError('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function openEditor(mode: Exclude<EditorMode, null>) {
    setName(mode === 'rename' ? selectedRoom?.name ?? '' : '')
    setEditor(mode)
    setActionError('')
    setConfirmArchive(false)
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
      const updated = editor === 'rename' && selectedRoom && !selectedRoom.isArchived
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

  async function updateArchive(room: CleaningRoom, archived: boolean) {
    if (saving || roomsLoad !== 'ready') return
    setSaving(true)
    setActionError('')
    try {
      const updated = await setCleaningRoomArchived(ownerId, room.id, archived)
      upsertRoom(updated)
      setEditor(null)
      setConfirmArchive(false)
      setSelectedRoomId(null)
      if (!archived) setShowArchived(false)
    } catch (error: unknown) {
      setActionError(toUserErrorMessage(error, 'Nie udało się zmienić statusu pomieszczenia.'))
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
    <form className="cleaning-room-editor" onSubmit={(event) => { void saveRoom(event) }}>
      <h2>{editor === 'create' ? 'Nowe pomieszczenie' : 'Zmień nazwę'}</h2>
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
      {actionErrorBanner}
      <div className="cleaning-editor-actions">
        <button type="button" className="cleaning-secondary-button" onClick={() => { setEditor(null); setActionError('') }} disabled={saving}>Anuluj</button>
        <button type="submit" className="cleaning-action" disabled={saving || !name.trim()}>{saving ? 'Zapisywanie…' : 'Zapisz'}</button>
      </div>
    </form>
  )

  return (
    <main className="app-layout cleaning-shell">
      <header className="app-header cleaning-header">
        <div className="app-brand">
          <div className="brand-mark brand-mark-small cleaning-brand-mark" aria-hidden="true"><KitchenIcon name="cleaning" size={23} /></div>
          <div><p className="brand-kicker">Porządki</p><p className="app-greeting">Twój dom, Twój rytm</p></div>
        </div>
        <div className="module-header-actions">
          <button className="module-home-button" type="button" onClick={onExit} aria-label="Wróć do strony głównej Dom"><KitchenIcon name="home" size={19} /><span>Dom</span></button>
          <button className="icon-button" type="button" onClick={() => { void supabase?.auth.signOut() }} aria-label="Wyloguj" title="Wyloguj"><KitchenIcon name="logout" /></button>
        </div>
      </header>

      {view === 'start' && (
        <section className="cleaning-page" aria-labelledby="cleaning-start-title">
          <div className="cleaning-hero">
            <div><p className="eyebrow">TWÓJ DOM</p><h1 id="cleaning-start-title">Spokojnie, po kolei.</h1><p>Zaplanuj zadania w swoich pomieszczeniach i oznaczaj je jako wykonane.</p></div>
            <span className="cleaning-hero-icon" aria-hidden="true"><KitchenIcon name="check" size={27} /></span>
          </div>
          <section className="cleaning-section" aria-labelledby="cleaning-start-rooms-title">
            <div className="cleaning-section-title"><h2 id="cleaning-start-rooms-title">Pomieszczenia</h2>{roomsLoad === 'ready' && <span className="cleaning-section-note">{activeRooms.length} aktywnych</span>}</div>
            {renderLoadStatus()}
            {roomsLoad === 'ready' && (
              <div className="cleaning-start-panel">
                <span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="room" size={24} /></span>
                <div><strong>{activeRooms.length === 0 ? 'Zacznij od pierwszego pomieszczenia' : 'Twoje pomieszczenia są gotowe'}</strong><p>{activeRooms.length === 0 ? 'Dodaj np. łazienkę, salon lub sypialnię.' : 'Możesz dodawać kolejne miejsca i zmieniać ich nazwy.'}</p></div>
                <button type="button" className="cleaning-action" onClick={() => changeView('rooms')}>Pomieszczenia <KitchenIcon name="chevronRight" size={17} /></button>
              </div>
            )}
          </section>
          {roomsLoad === 'ready' && <CleaningStartTasks key={taskRevision} ownerId={ownerId} rooms={rooms} onOpenRoom={(room) => { setView('rooms'); openRoom(room) }} />}
        </section>
      )}

      {view === 'rooms' && (
        <section className="cleaning-page" aria-labelledby="cleaning-rooms-title">
          {selectedRoom ? (
            <>
              <button type="button" className="cleaning-back-button" onClick={() => { setSelectedRoomId(null); setEditor(null); setConfirmArchive(false); setActionError('') }}><KitchenIcon name="chevronLeft" size={18} /> Wszystkie pomieszczenia</button>
              <div className="cleaning-page-heading"><p className="eyebrow">POMIESZCZENIE</p><h1 id="cleaning-rooms-title">{selectedRoom.name}</h1><p>{selectedRoom.isArchived ? 'To pomieszczenie jest w archiwum.' : 'Dodaj zadania i zaznacz, co udało Ci się zrobić.'}</p></div>
              {editor === 'rename' ? roomEditor : (
                <>
                  {!selectedRoom.isArchived && (
                    <div className="cleaning-room-actions"><button type="button" className="cleaning-secondary-button" onClick={() => openEditor('rename')} disabled={saving}><KitchenIcon name="edit" size={17} /> Zmień nazwę</button><button type="button" className="cleaning-subtle-danger" onClick={() => { setConfirmArchive(true); setActionError('') }} disabled={saving}>Archiwizuj</button></div>
                  )}
                  {selectedRoom.isArchived && <button type="button" className="cleaning-action" onClick={() => { void updateArchive(selectedRoom, false) }} disabled={saving}>{saving ? 'Przywracanie…' : 'Przywróć pomieszczenie'}</button>}
                  {confirmArchive && (
                    <div className="cleaning-archive-confirm" role="group" aria-label="Potwierdź archiwizację">
                      <strong>Przenieść do archiwum?</strong><p>Pomieszczenie nie zostanie usunięte. Możesz je później przywrócić.</p>
                      <div className="cleaning-editor-actions"><button type="button" className="cleaning-secondary-button" onClick={() => setConfirmArchive(false)} disabled={saving}>Anuluj</button><button type="button" className="cleaning-subtle-danger" onClick={() => { void updateArchive(selectedRoom, true) }} disabled={saving}>{saving ? 'Archiwizowanie…' : 'Archiwizuj'}</button></div>
                    </div>
                  )}
                  {actionErrorBanner}
                  <CleaningTaskBoard key={selectedRoom.id} ownerId={ownerId} room={selectedRoom} onChanged={() => setTaskRevision((n) => n + 1)} />
                </>
              )}
            </>
          ) : (
            <>
              <div className="cleaning-page-heading"><p className="eyebrow">TWÓJ DOM</p><h1 id="cleaning-rooms-title">Pomieszczenia</h1><p>Wszystkie miejsca, o które chcesz zadbać.</p></div>
              {renderLoadStatus()}
              {roomsLoad === 'ready' && (
                <>
                  {editor === 'create' ? roomEditor : <button className="cleaning-action cleaning-add-room" type="button" onClick={() => openEditor('create')}><KitchenIcon name="plus" size={18} /> Dodaj pomieszczenie</button>}
                  {editor !== 'create' && actionErrorBanner}
                  {activeRooms.length === 0 ? (
                    <div className="cleaning-empty-state cleaning-empty-spacious"><span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="room" size={28} /></span><h2>Jeszcze nie ma pomieszczeń</h2><p>Dodaj łazienkę, kuchnię, salon lub dowolne miejsce w domu. Pomieszczenia zostaną zapisane na Twoim koncie.</p></div>
                  ) : (
                    <div className="cleaning-room-list" aria-label="Aktywne pomieszczenia">{activeRooms.map((room) => (
                      <button type="button" className="cleaning-room-card" onClick={() => openRoom(room)} key={room.id}>
                        <span className="cleaning-room-card-icon" aria-hidden="true"><KitchenIcon name="room" size={21} /></span><span className="cleaning-room-card-copy"><strong>{room.name}</strong><span>Zobacz zadania i historię wykonań</span></span><KitchenIcon name="chevronRight" size={19} />
                      </button>
                    ))}</div>
                  )}
                  {archivedRooms.length > 0 && (
                    <section className="cleaning-archived-section" aria-label="Archiwum pomieszczeń">
                      <button className="cleaning-archived-toggle" type="button" aria-expanded={showArchived} onClick={() => setShowArchived((old) => !old)}>{showArchived ? 'Ukryj archiwum' : `Archiwum (${archivedRooms.length})`} <KitchenIcon name={showArchived ? 'chevronUp' : 'chevronDown'} size={17} /></button>
                      {showArchived && <div className="cleaning-room-list">{archivedRooms.map((room) => (
                        <button type="button" className="cleaning-room-card is-archived" onClick={() => openRoom(room)} key={room.id}><span className="cleaning-room-card-icon" aria-hidden="true"><KitchenIcon name="room" size={21} /></span><span className="cleaning-room-card-copy"><strong>{room.name}</strong><span>W archiwum · dotknij, aby przywrócić</span></span><KitchenIcon name="chevronRight" size={19} /></button>
                      ))}</div>}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {view === 'schedule' && (
        <section className="cleaning-page" aria-labelledby="cleaning-schedule-title">
          <div className="cleaning-page-heading"><p className="eyebrow">PLAN DNIA</p><h1 id="cleaning-schedule-title">Harmonogram</h1><p>W jednym miejscu zobaczysz, co jest do zrobienia i kiedy.</p></div>
          <div className="cleaning-empty-state cleaning-empty-spacious"><span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="calendar" size={29} /></span><h2>Twój harmonogram jest pusty</h2><p>Jednorazowe zadania są dostępne w pomieszczeniach i na ekranie Start. Cykle dodamy w H4, a kalendarz i harmonogram w H5.</p></div>
        </section>
      )}

      <nav className="bottom-nav cleaning-bottom-nav" aria-label="Nawigacja Porządki">
        <button className={`nav-item${view === 'start' ? ' is-active' : ''}`} type="button" onClick={() => changeView('start')} aria-current={view === 'start' ? 'page' : undefined}><KitchenIcon name="home" /><span>Start</span></button>
        <button className={`nav-item${view === 'rooms' ? ' is-active' : ''}`} type="button" onClick={() => changeView('rooms')} aria-current={view === 'rooms' ? 'page' : undefined}><KitchenIcon name="room" /><span>Pomieszczenia</span></button>
        <button className={`nav-item${view === 'schedule' ? ' is-active' : ''}`} type="button" onClick={() => changeView('schedule')} aria-current={view === 'schedule' ? 'page' : undefined}><KitchenIcon name="calendar" /><span>Harmonogram</span></button>
      </nav>
    </main>
  )
}
