import { useEffect, useState } from 'react'
import type { CleaningRoom } from './cleaningRooms'
import { formatCleaningDate, loadCleaningTasks, type CleaningTask } from './cleaningTasks'
import { toUserErrorMessage } from '../../lib/userError'

type Props = { ownerId: string; rooms: CleaningRoom[]; onOpenRoom: (room: CleaningRoom) => void }

export function CleaningStartTasks({ ownerId, rooms, onOpenRoom }: Props) {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    loadCleaningTasks(ownerId).then((rows) => { if (active) { setTasks(rows); setLoading(false) } })
      .catch((cause: unknown) => { if (active) { setError(toUserErrorMessage(cause, 'Błąd pobierania zadań.')); setLoading(false) } })
    return () => { active = false }
  }, [ownerId, reload])
  const activeIds = new Set(rooms.filter((room) => !room.isArchived).map((room) => room.id))
  const open = tasks.filter((task) => !task.isArchived && !task.isCompleted && activeIds.has(task.roomId))
  const completed = tasks.filter((task) => !task.isArchived && task.isCompleted && activeIds.has(task.roomId)).length
  return <section className="cleaning-section" aria-labelledby="cleaning-start-tasks-title">
    <div className="cleaning-section-title"><h2 id="cleaning-start-tasks-title">Zadania</h2>{!loading && !error && <span className="cleaning-section-note">{open.length} do zrobienia · {completed} wykonanych</span>}</div>
    {loading && <div className="cleaning-status-message" role="status">Wczytywanie zadań…</div>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button className="cleaning-task-link" type="button" onClick={() => { setError(''); setLoading(true); setReload((v) => v + 1) }}>Spróbuj ponownie</button></div>}
    {!loading && !error && (open.length === 0 ? <div className="cleaning-start-panel"><strong>Brak otwartych zadań</strong><p>Dodaj zadanie w wybranym pomieszczeniu.</p></div> :
      <div className="cleaning-task-list">{open.slice(0, 5).map((task) => {
        const room = rooms.find((item) => item.id === task.roomId)
        return <button type="button" className="cleaning-room-card cleaning-start-task-row" key={task.id} onClick={() => { if (room) onOpenRoom(room) }}>
          <span className="cleaning-room-card-copy"><strong>{task.title}</strong><span>{room?.name ?? 'Pomieszczenie'} · {formatCleaningDate(task.nextDueDate)}</span></span>
          <span className="cleaning-task-go">Otwórz</span>
        </button>
      })}</div>
    )}
  </section>
}
