import { useCallback, useEffect, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus, recurrenceLabel } from './cleaningRecurrence'
import {
  addCalendarDays, daysOfWeek, dueOn, mondayOfWeek,
  overdueBefore, scheduleDateLabel, visibleScheduleTasks,
} from './cleaningSchedule'
import {
  completeCleaningTask, formatCleaningDate, loadCleaningTasks,
  todayWarsaw, type CleaningTask,
} from './cleaningTasks'

type Props = {
  ownerId: string
  rooms: CleaningRoom[]
  onOpenRoom: (room: CleaningRoom) => void
  onChanged: () => void
}
type Mode = 'day' | 'week'

const shortWeekdays = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.']

/** H5 reads H4's owner-scoped tasks and completes through the SAME idempotent H4 RPC.
 * No schedule-specific DB tables, writes, or projections of uncommitted future cycles.
 */
export function CleaningSchedule({ ownerId, rooms, onOpenRoom, onChanged }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayWarsaw)
  const [today, setToday] = useState(todayWarsaw)
  const [mode, setMode] = useState<Mode>('week')
  const [selectedRoomId, setSelectedRoomId] = useState('all')
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [completedFeedback, setCompletedFeedback] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const busyRef = useRef(false)
  const pendingOperations = useRef(new Map<string, { id: string; generation: number }>())
  const requestNumber = useRef(0)

  const refresh = useCallback(async (initial = false) => {
    const requestId = ++requestNumber.current
    if (initial) setLoading(true)
    try {
      const latest = await loadCleaningTasks(ownerId)
      if (requestId !== requestNumber.current) return
      setTasks(latest)
      setError('')
    } catch (cause: unknown) {
      if (requestId !== requestNumber.current) return
      setError(toUserErrorMessage(cause, 'Nie udało się pobrać harmonogramu.'))
    } finally {
      if (requestId === requestNumber.current) setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    void refresh(true)
    const sync = () => {
      if (document.visibilityState === 'hidden') return
      setToday(todayWarsaw())
      if (!busyRef.current) void refresh()
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    // Also update the civil-day label if the screen stays open through midnight.
    const interval = window.setInterval(() => setToday(todayWarsaw()), 60_000)
    return () => {
      requestNumber.current += 1
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
      window.clearInterval(interval)
    }
  }, [refresh])

  const activeRooms = rooms.filter((room) => !room.isArchived)
  const activeRoomIds = new Set(activeRooms.map((room) => room.id))
  const filter = selectedRoomId === 'all' || activeRoomIds.has(selectedRoomId) ? selectedRoomId : 'all'
  const visible = visibleScheduleTasks(tasks, activeRoomIds, filter)
  const dates = daysOfWeek(selectedDate)
  const weekStart = mondayOfWeek(selectedDate)
  const weekEnd = dates[6]
  const due = dueOn(visible, selectedDate)
  const overdue = overdueBefore(visible, today)
  const showOverdue = mode === 'day' ? selectedDate === today : (weekStart <= today && today <= weekEnd)
  // The week's overdue tasks remain in their own day group; only older backlog
  // goes in the extra section, so no task is displayed twice.
  const overdueExtras = mode === 'week' ? overdue.filter((task) => task.nextDueDate < weekStart) : overdue
  const inWeek = visible.filter((task) => weekStart <= task.nextDueDate && task.nextDueDate <= weekEnd)
  const periodCount = mode === 'day' ? due.length : inWeek.length

  async function complete(task: CleaningTask) {
    if (busyRef.current || task.isArchived || task.isCompleted || !activeRoomIds.has(task.roomId)) return
    busyRef.current = true
    setBusyId(task.id)
    setActionError('')
    setCompletedFeedback('')
    let operation = pendingOperations.current.get(task.id)
    if (operation && operation.generation !== task.cycleGeneration) {
      // A previous response may have been lost, but another refresh already saw
      // a newer generation. Never submit a SECOND completion for that new cycle.
      pendingOperations.current.delete(task.id)
      setActionError('Cykl zadania zmienił się od ostatniej próby. Sprawdź aktualny termin przed kolejnym wykonaniem.')
      busyRef.current = false
      setBusyId(null)
      return
    }
    if (!operation) {
      operation = { id: crypto.randomUUID(), generation: task.cycleGeneration }
      pendingOperations.current.set(task.id, operation)
    }
    try {
      const saved = await completeCleaningTask(task.id, operation.generation, operation.id)
      pendingOperations.current.delete(task.id)
      requestNumber.current += 1 // Invalidate a stale in-flight focus refresh.
      setLoading(false)
      setTasks((current) => current.map((item) => item.id === task.id ? saved : item))
      setCompletedFeedback(saved.isCompleted
        ? `Wykonano: ${task.title}`
        : `Zrobione! ${task.title} — kolejny termin ${formatCleaningDate(saved.nextDueDate)}.`)
      onChanged()
    } catch (cause: unknown) {
      setActionError(toUserErrorMessage(cause, 'Nie udało się zapisać wykonania. Spróbuj ponownie.'))
      // Preserve the SAME operation UUID on retry after an ambiguous network failure.
    } finally {
      busyRef.current = false
      setBusyId(null)
    }
  }

  function renderTask(task: CleaningTask) {
    const room = activeRooms.find((item) => item.id === task.roomId)
    const status = cleaningDueStatus(task.nextDueDate, today)
    return <article className={`cleaning-task-card cleaning-schedule-task${task.isCompleted ? ' is-done' : ''}`} key={task.id}>
      <label className="cleaning-task-main">
        <input type="checkbox" checked={task.isCompleted} disabled={busyId !== null || task.isCompleted}
          aria-label={`Oznacz jako wykonane: ${task.title}`}
          onChange={() => { void complete(task) }} />
        <span className="cleaning-task-description">
          <strong>{task.title}</strong>
          <span>{room?.name ?? 'Pomieszczenie'} · {recurrenceLabel(task.recurrenceKind, task.recurrenceInterval)}</span>
          {task.notes && <span>{task.notes}</span>}
          <small>Termin: {formatCleaningDate(task.nextDueDate)}</small>
          {task.isCompleted ? <small>Wykonane</small> : <span className={`cleaning-due-status is-${status.kind}`}>{status.text}</span>}
        </span>
      </label>
      {room && <div className="cleaning-task-actions"><button type="button" className="cleaning-task-link" onClick={() => onOpenRoom(room)}>
        Otwórz pomieszczenie <KitchenIcon name="chevronRight" size={15} />
      </button></div>}
    </article>
  }

  function renderDateGroup(date: string) {
    const tasksOnDate = dueOn(visible, date)
    if (tasksOnDate.length === 0) return null
    const title = scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })
    return <section className="cleaning-schedule-group" key={date} aria-label={title}>
      <div className="cleaning-section-title"><h2>{title}</h2><span className="cleaning-section-note">{tasksOnDate.length} {tasksOnDate.length === 1 ? 'zadanie' : 'zadań'}</span></div>
      <div className="cleaning-task-list">{tasksOnDate.map(renderTask)}</div>
    </section>
  }

  return <section className="cleaning-page cleaning-schedule" aria-labelledby="cleaning-schedule-title">
    <div className="cleaning-page-heading"><p className="eyebrow">TWÓJ PLAN</p><h1 id="cleaning-schedule-title">Harmonogram</h1>
      <p>Terminy i zadania w jednym miejscu. Odhaczaj je tak samo jak w pomieszczeniach.</p></div>

    <div className="cleaning-schedule-toolbar">
      <div className="cleaning-schedule-mode" role="group" aria-label="Widok harmonogramu">
        <button type="button" className={mode === 'day' ? 'is-active' : ''} aria-pressed={mode === 'day'} onClick={() => setMode('day')}>Dzień</button>
        <button type="button" className={mode === 'week' ? 'is-active' : ''} aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Tydzień</button>
      </div>
      <button type="button" className="cleaning-schedule-today" onClick={() => { setSelectedDate(todayWarsaw()); setToday(todayWarsaw()) }}>Dzisiaj</button>
    </div>

    <div className="cleaning-schedule-calendar">
      <div className="cleaning-schedule-period">
        <button type="button" aria-label={mode === 'day' ? 'Poprzedni dzień' : 'Poprzedni tydzień'}
          onClick={() => setSelectedDate((date) => addCalendarDays(date, mode === 'day' ? -1 : -7))}>
          <KitchenIcon name="chevronLeft" size={20}/>
        </button>
        <strong>{mode === 'day' ? scheduleDateLabel(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })
          : `${formatCleaningDate(weekStart)} – ${formatCleaningDate(weekEnd)}`}</strong>
        <button type="button" aria-label={mode === 'day' ? 'Następny dzień' : 'Następny tydzień'}
          onClick={() => setSelectedDate((date) => addCalendarDays(date, mode === 'day' ? 1 : 7))}>
          <KitchenIcon name="chevronRight" size={20}/>
        </button>
      </div>
      <div className="cleaning-schedule-weekdays" aria-label="Wybierz dzień tygodnia">
        {dates.map((date, index) => {
          const count = dueOn(visible, date).length
          return <button type="button" key={date}
            className={`${date === selectedDate ? 'is-selected' : ''} ${date === today ? 'is-today' : ''}`.trim()}
            aria-pressed={date === selectedDate} aria-label={`${scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count} zadań`}
            onClick={() => { setSelectedDate(date); setMode('day') }}>
            <span>{shortWeekdays[index]}</span><strong>{Number(date.slice(8))}</strong>{count > 0 && <i aria-hidden="true"/>}
          </button>
        })}
      </div>
      <div className="cleaning-schedule-date-picker">
        <label htmlFor="cleaning-schedule-date">Przejdź do daty</label>
        <div className="cleaning-date-field"><input id="cleaning-schedule-date" type="date" value={selectedDate}
          onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value) }} />
          <span className="cleaning-date-icon" aria-hidden="true"><KitchenIcon name="calendar" size={19}/></span></div>
      </div>
    </div>

    <div className="cleaning-schedule-filter">
      <label htmlFor="cleaning-schedule-room">Pomieszczenie</label>
      <select id="cleaning-schedule-room" value={filter} onChange={(event) => setSelectedRoomId(event.target.value)}>
        <option value="all">Wszystkie pomieszczenia</option>
        {activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
      </select>
    </div>

    <div className="cleaning-section-title"><h2>{mode === 'day' ? 'Plan dnia' : 'Plan tygodnia'}</h2>
      {!loading && !error && <span className="cleaning-section-note">{periodCount} {periodCount === 1 ? 'zadanie' : 'zadań'}</span>}
    </div>
    {loading && <div className="cleaning-status-message" role="status">Wczytywanie harmonogramu…</div>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button type="button" className="cleaning-task-link" onClick={() => { void refresh(true) }}>Spróbuj ponownie</button></div>}
    {actionError && <div className="cleaning-inline-error" role="alert">{actionError} <button type="button" className="cleaning-task-link" onClick={() => { void refresh() }}>Odśwież</button></div>}
    {completedFeedback && <div className="cleaning-schedule-feedback" role="status">{completedFeedback}</div>}
    {!loading && !error && <>
      {showOverdue && overdueExtras.length > 0 && <section className="cleaning-schedule-group is-overdue" aria-labelledby="cleaning-overdue-title">
        <div className="cleaning-section-title"><h2 id="cleaning-overdue-title">Zaległe</h2><span className="cleaning-section-note">{overdueExtras.length} do wykonania</span></div>
        <div className="cleaning-task-list">{overdueExtras.map(renderTask)}</div>
      </section>}
      {mode === 'day' ? (due.length > 0 ? <div className="cleaning-task-list">{due.map(renderTask)}</div>
        : <div className="cleaning-empty-state"><span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="calendar" size={24}/></span>
          <h3>Brak zadań na wybrany dzień</h3><p>Sprawdź inną datę lub dodaj zadanie w pomieszczeniu.</p></div>)
      : inWeek.length > 0 ? <div className="cleaning-schedule-groups">{dates.map(renderDateGroup)}</div>
        : <div className="cleaning-empty-state"><span className="cleaning-empty-icon" aria-hidden="true"><KitchenIcon name="calendar" size={24}/></span>
          <h3>Spokojny tydzień</h3><p>Nie ma zaplanowanych zadań na ten tydzień. Zobacz inne daty lub dodaj zadanie.</p></div>}
    </>}
    <p className="cleaning-schedule-hint">Dla zadań cyklicznych widzisz tylko najbliższy termin zapisany w Kitchen. Po wykonaniu baza wyznaczy następny termin i harmonogram się zaktualizuje.</p>
  </section>
}
