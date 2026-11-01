import { useCallback, useEffect, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus } from './cleaningRecurrence'
import { cleaningDashboardGroups, type DashboardOccurrence } from './cleaningDashboard'
import { loadCleaningOccurrences, type CleaningOccurrence } from './cleaningOccurrences'
import { addCalendarDays } from './cleaningSchedule'
import { useCleaningOccurrenceCompletion } from './useCleaningOccurrenceCompletion'
import { useCleaningTaskUndo } from './useCleaningTaskUndo'
import { loadCleaningTasks, todayWarsaw, type CleaningTask } from './cleaningTasks'

type Props = {
  ownerId: string
  rooms: CleaningRoom[]
  onOpenRoom: (room: CleaningRoom) => void
  onShowToday: () => void
  onChanged: () => void
}

/** H6.4.3: Start and Harmonogram consume exactly the same server occurrence authority.
 * The open task cursor supplies past-due obligations, NOT guessed future cycles.
 */
export function CleaningStartTasks({ ownerId, rooms, onOpenRoom, onShowToday, onChanged }: Props) {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [occurrences, setOccurrences] = useState<CleaningOccurrence[]>([])
  const [today, setToday] = useState(todayWarsaw)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const request = useRef(0)
  const { run: runCompletion, busyId, inFlight } = useCleaningOccurrenceCompletion()
  const { undo: runUndo, undoBusyId, inFlightUndo } = useCleaningTaskUndo()
  const [lastCompleted, setLastCompleted] = useState<CleaningTask | null>(null)
  const [status, setStatus] = useState('')
  const busy = busyId !== null || undoBusyId !== null

  const refresh = useCallback(async (initial = false) => {
    const id = ++request.current
    if (initial) setLoading(true)
    const date = todayWarsaw()
    try {
      const [rows, events] = await Promise.all([
        loadCleaningTasks(ownerId), loadCleaningOccurrences(date, addCalendarDays(date, 7)),
      ])
      if (id !== request.current) return
      setToday(date)
      setTasks(rows)
      setOccurrences(events)
      setError('')
    } catch (cause: unknown) {
      if (id !== request.current) return
      setError(toUserErrorMessage(cause, 'Nie udało się pobrać najbliższych zadań.'))
    } finally {
      if (id === request.current) setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    void refresh(true)
    const onResume = () => {
      if (document.visibilityState === 'hidden' || inFlight.current || inFlightUndo.current) return
      void refresh()
    }
    const timer = window.setInterval(() => {
      if (todayWarsaw() !== today) onResume()
    }, 60_000)
    window.addEventListener('focus', onResume)
    document.addEventListener('visibilitychange', onResume)
    return () => {
      request.current += 1
      window.clearInterval(timer)
      window.removeEventListener('focus', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, [refresh, today, inFlight, inFlightUndo])

  useEffect(() => {
    if (reload > 0) void refresh(true)
  }, [reload, refresh])

  const roomById = new Map(rooms.filter((room) => !room.isArchived).map((room) => [room.id, room]))
  const activeRoomIds = new Set(roomById.keys())
  const { due, upcoming } = cleaningDashboardGroups(tasks, occurrences, activeRoomIds, today)

  async function complete(entry: DashboardOccurrence) {
    if (busy || inFlight.current) return
    setError('')
    setStatus('')
    try {
      const saved = await runCompletion(entry.occurrence, entry.task)
      if (!saved) return
      setLastCompleted(saved)
      setStatus(`Zrobiono: ${entry.task.title}`)
      onChanged()
      await refresh()
    } catch (cause: unknown) {
      setError(toUserErrorMessage(cause, 'Nie udało się zapisać wykonania. Spróbuj ponownie.'))
    }
  }

  async function undoRecent() {
    if (!lastCompleted || busy || inFlightUndo.current) return
    setError('')
    try {
      const restored = await runUndo(lastCompleted)
      if (!restored) return
      setStatus(`Cofnięto: ${restored.title}`)
      setLastCompleted(null)
      onChanged()
      await refresh()
    } catch (cause: unknown) {
      setError(toUserErrorMessage(cause, 'Nie udało się cofnąć wykonania.'))
    }
  }

  function renderTask(entry: DashboardOccurrence) {
    const { task, occurrence } = entry
    const room = roomById.get(task.roomId)
    const dueStatus = cleaningDueStatus(occurrence.scheduledDueDate, today)
    const actionable = occurrence.isActionable && !occurrence.isDone && !task.isCompleted
    const disabledReason = 'Najpierw wykonaj wcześniejszy termin tego zadania.'
    return <article className="cleaning-task-card cleaning-dashboard-task" key={`${task.id}:${occurrence.scheduledDueDate}:${occurrence.scheduleRevision}`}>
      <label className="cleaning-dashboard-check" title={actionable ? undefined : disabledReason}>
        <input type="checkbox" checked={false} disabled={busy || !actionable}
          aria-label={`Wykonaj: ${task.title}`}
          aria-describedby={!actionable ? `start-blocked-${task.id}-${occurrence.scheduledDueDate}` : undefined}
          onChange={() => { void complete(entry) }} />
      </label>
      <button type="button" className="cleaning-dashboard-task-detail" onClick={() => { if (room) onOpenRoom(room) }}>
        <strong>{task.title}</strong>
        {task.notes && <span className="cleaning-dashboard-task-notes">{task.notes}</span>}
        <span className="cleaning-dashboard-task-meta">
          <span>{room?.name ?? 'Pomieszczenie'}</span>
          <span className={`cleaning-due-status is-${dueStatus.kind}`}>{dueStatus.text}</span>
        </span>
        {room && <span className="cleaning-dashboard-task-arrow" aria-hidden="true"><KitchenIcon name="chevronRight" size={17} /></span>}
      </button>
      {!actionable && <span className="sr-only" id={`start-blocked-${task.id}-${occurrence.scheduledDueDate}`}>{disabledReason}</span>}
    </article>
  }

  return <div className="cleaning-dashboard" aria-label="Najbliższe zadania">
    {loading && <div className="cleaning-status-message" role="status">Wczytywanie zadań…</div>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button className="cleaning-task-link" type="button" onClick={() => { setError(''); setReload((v) => v + 1) }}>Odśwież</button></div>}
    {status && !error && <p className="cleaning-feedback" role="status">{status}
      {lastCompleted && <button className="cleaning-task-link" type="button" disabled={busy} onClick={() => { void undoRecent() }}>Cofnij</button>}
    </p>}
    {!loading && !error && <>
      <section className="cleaning-section" aria-labelledby="cleaning-start-due-title">
        <div className="cleaning-section-title">
          <h2 id="cleaning-start-due-title">Do zrobienia</h2>
          <button type="button" className="cleaning-task-link" onClick={onShowToday}>Pokaż wszystkie</button>
        </div>
        {due.length ? <div className="cleaning-task-list">{due.slice(0, 3).map(renderTask)}</div>
          : <p className="cleaning-dashboard-empty">Na dziś wszystko zrobione.</p>}
      </section>
      <section className="cleaning-section" aria-labelledby="cleaning-start-soon-title">
        <div className="cleaning-section-title"><h2 id="cleaning-start-soon-title">Nadchodzące</h2><span className="cleaning-section-note">Najbliższe 7 dni</span></div>
        {upcoming.length ? <div className="cleaning-task-list">{upcoming.slice(0, 3).map(renderTask)}</div>
          : <p className="cleaning-dashboard-empty">Brak zadań na najbliższe dni.</p>}
      </section>
    </>}
  </div>
}
