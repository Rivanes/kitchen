import { useEffect, useState } from 'react'
import type { CleaningRoom } from './cleaningRooms'
import { formatCleaningDate, loadCleaningTasks, todayWarsaw, type CleaningTask } from './cleaningTasks'
import { cleaningDueStatus } from './cleaningRecurrence'
import { cleaningDashboardGroups } from './cleaningDashboard'
import { useCleaningTaskCompletion } from './useCleaningTaskCompletion'
import { useCleaningTaskUndo } from './useCleaningTaskUndo'
import { toUserErrorMessage } from '../../lib/userError'

interface Props {
  ownerId: string
  rooms: CleaningRoom[]
  onOpenRoom: (room: CleaningRoom) => void
  onShowToday: () => void
  onChanged: () => void
}

export function CleaningStartTasks({ ownerId, rooms, onOpenRoom, onShowToday, onChanged }: Props) {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const { run, busyId } = useCleaningTaskCompletion()
  const { undo: runUndo, undoBusyId } = useCleaningTaskUndo()
  const [lastCompleted, setLastCompleted] = useState<CleaningTask | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    loadCleaningTasks(ownerId)
      .then((rows) => { if (active) { setTasks(rows); setError(''); setLoading(false) } })
      .catch((cause: unknown) => { if (active) { setError(toUserErrorMessage(cause, 'Błąd pobierania zadań.')); setLoading(false) } })
    return () => { active = false }
  }, [ownerId, reload])

  const today = todayWarsaw()
  const activeRoomIds = new Set(rooms.filter((room) => !room.isArchived).map((room) => room.id))
  const { due, upcoming } = cleaningDashboardGroups(tasks, activeRoomIds, today)

  async function complete(task: CleaningTask) {
    setError('')
    try {
      const saved = await run(task)
      if (!saved) return
      setTasks((old) => old.map((row) => row.id === saved.id ? saved : row))
      setLastCompleted(saved); setStatus(`Zrobiono: ${task.title}`)
      onChanged()
    } catch (cause: unknown) {
      setError(toUserErrorMessage(cause, 'Nie udało się zapisać wykonania. Spróbuj ponownie.'))
    }
  }

  async function undoRecent() {
    if (!lastCompleted) return
    setError('')
    try {
      const restored = await runUndo(lastCompleted)
      if (!restored) return
      setTasks((old) => old.map((row) => row.id === restored.id ? restored : row))
      setStatus(`Cofnięto: ${restored.title}`); setLastCompleted(null)
      onChanged()
    } catch (cause: unknown) { setError(toUserErrorMessage(cause, 'Nie udało się cofnąć wykonania.')) }
  }

  function renderTask(task: CleaningTask, isDue: boolean) {
    const room = rooms.find((item) => item.id === task.roomId)
    const status = cleaningDueStatus(task.nextDueDate, today)
    return <article className="cleaning-task-card cleaning-dashboard-task" key={task.id}>
      <label className="cleaning-dashboard-check" aria-label={`Zrobione: ${task.title}`}>
        <input type="checkbox" checked={false} disabled={busyId !== null || undoBusyId !== null} onChange={() => { void complete(task) }} />
      </label>
      <button type="button" className="cleaning-dashboard-task-detail" onClick={() => { if (room) onOpenRoom(room) }}>
        <strong>{task.title}</strong>
        <span>{room?.name ?? 'Pomieszczenie'} · {formatCleaningDate(task.nextDueDate)}</span>
      </button>
      {isDue && <span className={`cleaning-due-status is-${status.kind}`}>{status.text}</span>}
    </article>
  }

  return <div className="cleaning-dashboard" aria-label="Najbliższe zadania">
    {loading && <div className="cleaning-status-message" role="status">Wczytywanie zadań…</div>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button className="cleaning-task-link" type="button" onClick={() => { setError(''); setReload((v) => v + 1) }}>Odśwież</button></div>}
    {status && !error && <p className="cleaning-feedback" role="status">{status}
      {lastCompleted && <button className="cleaning-task-link" type="button" disabled={busyId !== null || undoBusyId !== null} onClick={() => { void undoRecent() }}>Cofnij</button>}
    </p>}
    {!loading && !error && <>
      <section className="cleaning-section" aria-labelledby="cleaning-start-due-title">
        <div className="cleaning-section-title">
          <h1 id="cleaning-start-due-title">Do zrobienia</h1>
          <button type="button" className="cleaning-task-link" onClick={onShowToday}>Pokaż wszystkie</button>
        </div>
        {due.length > 0 ? <div className="cleaning-task-list">{due.slice(0, 3).map((task) => renderTask(task, true))}</div>
          : !loading && <p className="cleaning-dashboard-empty">Na dziś wszystko zrobione.</p>}
      </section>
      <section className="cleaning-section" aria-labelledby="cleaning-start-soon-title">
        <div className="cleaning-section-title"><h2 id="cleaning-start-soon-title">Nadchodzące</h2><span className="cleaning-section-note">Najbliższe 7 dni</span></div>
        {upcoming.length > 0 ? <div className="cleaning-task-list">{upcoming.slice(0, 3).map((task) => renderTask(task, false))}</div>
          : <p className="cleaning-dashboard-empty">Brak zadań na najbliższe dni.</p>}
      </section>
    </>}
  </div>
}
