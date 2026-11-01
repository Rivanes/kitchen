import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { useCleaningTaskUndo } from './useCleaningTaskUndo'
import { useCleaningOccurrenceCompletion } from './useCleaningOccurrenceCompletion'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus } from './cleaningRecurrence'
import { loadCleaningOccurrences, loadRecentCleaningCompletions, type CleaningOccurrence, type CleaningRecentCompletion } from './cleaningOccurrences'
import {
  addCalendarDays, canUndoOccurrence, clampScheduleDay, earliestScheduleDay, entriesOn, overdueBacklog,
  scheduleDateLabel, scheduleEntries, scheduleRange, swipeDirection, swipeDragIntent, constrainedDrag,
  type ScheduleEntry,
} from './cleaningSchedule'
import { loadCleaningTasks, todayWarsaw, type CleaningTask } from './cleaningTasks'

type Props = {
  ownerId: string
  rooms: CleaningRoom[]
  onOpenRoom: (room: CleaningRoom) => void
  onChanged: () => void
  jumpToToday?: number
}

const shortWeekdays = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.']

/** H6.4.2: anchored server occurrences; schedule is an execution surface, not an editor.
 * Never infer future recurrence locally or complete a non-actionable projection.
 */
export function CleaningSchedule({ ownerId, rooms, onOpenRoom, onChanged, jumpToToday = 0 }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayWarsaw)
  const [today, setToday] = useState(todayWarsaw)
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [occurrences, setOccurrences] = useState<CleaningOccurrence[]>([])
  const [recentCompletions, setRecentCompletions] = useState<CleaningRecentCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [feedback, setFeedback] = useState('')
  const { run: runCompletion, busyId, inFlight } = useCleaningOccurrenceCompletion()
  const [lastCompleted, setLastCompleted] = useState<CleaningTask | null>(null)
  const { undo: runUndo, undoBusyId, inFlightUndo } = useCleaningTaskUndo()
  const requestNumber = useRef(0)
  // Pointer Events also work when a drag starts directly on a clickable date.
  // Do not bind gestures to the agenda: scrolling the task list must remain native.
  const gesture = useRef<{ pointerId: number; startX: number; startY: number; axis: 'pending' | 'horizontal' | 'vertical'; width: number } | null>(null)
  const swallowSwipeClick = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const floor = earliestScheduleDay(today)
  const currentDate = clampScheduleDay(selectedDate, today)
  const range = scheduleRange(currentDate, today)
  const { from, to, days } = range

  const refresh = useCallback(async (initial = false) => {
    const requestId = ++requestNumber.current
    if (initial) setLoading(true)
    try {
      const [latestTasks, latestOccurrences, latestCompletions] = await Promise.all([
        loadCleaningTasks(ownerId), loadCleaningOccurrences(from, to),
        loadRecentCleaningCompletions(ownerId, earliestScheduleDay(today)),
      ])
      if (requestId !== requestNumber.current) return
      setTasks(latestTasks)
      setOccurrences(latestOccurrences)
      setRecentCompletions(latestCompletions)
      setError('')
    } catch (cause: unknown) {
      if (requestId !== requestNumber.current) return
      setError(toUserErrorMessage(cause, 'Nie udało się pobrać harmonogramu.'))
    } finally {
      if (requestId === requestNumber.current) setLoading(false)
    }
  }, [ownerId, from, to, today])

  useEffect(() => {
    void refresh(true)
    const sync = () => {
      if (document.visibilityState === 'hidden') return
      setToday(todayWarsaw())
      if (!inFlight.current && !inFlightUndo.current) void refresh()
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    const interval = window.setInterval(() => setToday(todayWarsaw()), 60_000)
    return () => {
      requestNumber.current += 1
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
      window.clearInterval(interval)
    }
  }, [refresh, inFlightUndo])

  useEffect(() => {
    if (jumpToToday > 0) {
      setToday(todayWarsaw())
      setSelectedDate(todayWarsaw())
    }
  }, [jumpToToday])

  const activeRooms = rooms.filter((room) => !room.isArchived)
  const roomById = new Map(activeRooms.map((room) => [room.id, room]))
  const activeRoomIds = new Set(roomById.keys())
  const entries = scheduleEntries(occurrences, tasks, activeRoomIds)
  const recentByTask = new Map<string, CleaningRecentCompletion>()
  for (const item of recentCompletions) {
    if (!recentByTask.has(item.taskId)) recentByTask.set(item.taskId, item)
  }
  const backlog = currentDate === today ? overdueBacklog(tasks, activeRoomIds, today) : []
  const canPrevious = addCalendarDays(days[0], -1) >= floor
  const busy = busyId !== null || undoBusyId !== null

  function navigate(direction: -1 | 1) {
    if (busy || (direction === -1 && !canPrevious)) return
    setSelectedDate((date) => clampScheduleDay(addCalendarDays(clampScheduleDay(date, today), 7 * direction), today))
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || busy) return
    // Do not steal iOS Safari's back/forward gesture from either screen edge.
    swallowSwipeClick.current = false
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width, axis: 'pending' }
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const dx = event.clientX - active.startX
    const dy = event.clientY - active.startY
    if (active.axis === 'pending') {
      const intent = swipeDragIntent(dx, dy, active.startX, window.innerWidth)
      if (intent === 'pending') return
      active.axis = intent
      if (intent === 'horizontal') {
        // Capturing only after horizontal intent keeps ordinary date taps native.
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }
    }
    if (active.axis !== 'horizontal') return
    setDragOffset(constrainedDrag(dx, active.width))
  }

  function resetGesture() {
    gesture.current = null
    setDragging(false)
    setDragOffset(0)
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const isHorizontal = active.axis === 'horizontal'
    const dx = event.clientX - active.startX
    const dy = event.clientY - active.startY
    // Prevent the synthetic click on the date button after a completed drag.
    if (isHorizontal) swallowSwipeClick.current = true
    resetGesture()
    if (!isHorizontal) return
    const direction = swipeDirection(dx, dy, active.startX, window.innerWidth)
    if (direction !== 0) navigate(direction)
  }

  function pointerCancel() {
    resetGesture() // iOS vertical scrolling and interrupted touches must not navigate.
  }

  async function complete(entry: ScheduleEntry) {
    const { task, occurrence } = entry
    if (busy || inFlight.current) return
    setActionError('')
    setFeedback('')
    try {
      const saved = await runCompletion(occurrence, task)
      if (!saved) return
      setLastCompleted(saved)
      setFeedback(`Zrobione: ${task.title}`)
      onChanged()
      await refresh()
    } catch (cause: unknown) {
      setActionError(toUserErrorMessage(cause, 'Nie udało się wykonać zadania.'))
    }
  }

  async function undoRecent(taskOverride?: CleaningTask) {
    const taskToUndo = taskOverride ?? lastCompleted
    if (!taskToUndo || busy || inFlight.current) return
    setActionError('')
    try {
      const saved = await runUndo(taskToUndo)
      if (!saved) return
      setLastCompleted(null)
      setFeedback(`Cofnięto: ${saved.title}`)
      onChanged()
      await refresh()
    } catch (cause: unknown) {
      setActionError(toUserErrorMessage(cause, 'Nie udało się cofnąć wykonania.'))
    }
  }

  function renderCard(entry: ScheduleEntry) {
    const { task, occurrence } = entry
    const room = roomById.get(task.roomId)
    const latest = recentByTask.get(task.id)
    const canUndoHere = canUndoOccurrence(occurrence, task, latest)
    const canComplete = occurrence.isActionable && !occurrence.isDone && !task.isCompleted
    const status = cleaningDueStatus(occurrence.scheduledDueDate, today)
    const tentative = !occurrence.isActionable && !occurrence.isDone && task.nextDueDate < today
      && !(task.recurrenceKind === 'every_days' && task.recurrenceInterval === 1)
    const disabledReason = occurrence.isDone
      ? 'Można cofnąć tylko ostatnie wykonanie zadania.'
      : 'Najpierw wykonaj wcześniejszy termin tego zadania.'
    return <article key={`${task.id}:${occurrence.scheduledDueDate}:${occurrence.scheduleRevision}`}
      className={`cleaning-schedule-item${occurrence.isDone ? ' is-done' : ''}`}>
      <label className="cleaning-schedule-check" title={!canComplete && !canUndoHere ? disabledReason : undefined}>
        <input type="checkbox" checked={occurrence.isDone}
          disabled={busy || (!canComplete && !canUndoHere)}
          aria-label={occurrence.isDone ? `Wykonano: ${task.title}` : `Wykonaj: ${task.title}`}
          aria-describedby={!canComplete && !canUndoHere ? `schedule-blocked-${task.id}-${occurrence.scheduledDueDate}` : undefined}
          onChange={() => { if (canUndoHere) void undoRecent(task); else if (canComplete) void complete(entry) }} />
      </label>
      <div className="cleaning-schedule-item-body">
        {!canComplete && !canUndoHere && <span className="sr-only" id={`schedule-blocked-${task.id}-${occurrence.scheduledDueDate}`}>{disabledReason}</span>}
        <strong>{task.title}</strong>
        {task.notes && <p>{task.notes}</p>}
        <div className="cleaning-schedule-item-meta">
          {room && <span className="cleaning-schedule-room-name">{room.name}</span>}
          <span className={`cleaning-due-status ${occurrence.isDone ? 'is-done' : `is-${status.kind}`}`}>
            {occurrence.isDone ? 'Zrobione' : status.text}
          </span>
          {!occurrence.isDone && !canComplete && <span className="cleaning-schedule-future-note"
            title={tentative ? 'Termin orientacyjny: po wykonaniu zaległego zadania cykl przesunie się na nową datę.' : disabledReason}>
            {tentative ? 'Termin orientacyjny' : 'Najpierw wcześniejszy termin'}
          </span>}
        </div>
      </div>
      {room && <button type="button" className="cleaning-schedule-open-room"
        onClick={() => onOpenRoom(room)} aria-label={`Otwórz pomieszczenie: ${room.name}`}>
        <KitchenIcon name="chevronRight" size={18} />
      </button>}
    </article>
  }

  function renderBacklog(task: CleaningTask) {
    const room = roomById.get(task.roomId)
    const overdue = cleaningDueStatus(task.nextDueDate, today)
    // The original date is older than the 7-day history window, but the obligation survives.
    // It is actionable only through the same H4 cursor authority (handled by the schedule RPC).
    const synthetic: ScheduleEntry = {
      task,
      occurrence: {
        taskId: task.id, roomId: task.roomId, scheduledDueDate: task.nextDueDate,
        completedLocalDate: null, isDone: false, isActionable: true,
        scheduleRevision: task.scheduleRevision, cycleGeneration: task.cycleGeneration,
      },
    }
    return <article key={task.id} className="cleaning-schedule-item is-backlog">
      <label className="cleaning-schedule-check">
        <input type="checkbox" checked={false} disabled={busy}
          aria-label={`Wykonaj zaległe zadanie: ${task.title}`}
          onChange={() => { void complete(synthetic) }} />
      </label>
      <div className="cleaning-schedule-item-body">
        <strong>{task.title}</strong>
        {task.notes && <p>{task.notes}</p>}
        <div className="cleaning-schedule-item-meta">
          {room && <span className="cleaning-schedule-room-name">{room.name}</span>}
          <span className={`cleaning-due-status is-${overdue.kind}`}>{overdue.text}</span>
        </div>
      </div>
      {room && <button type="button" className="cleaning-schedule-open-room" onClick={() => onOpenRoom(room)}
        aria-label={`Otwórz pomieszczenie: ${room.name}`}><KitchenIcon name="chevronRight" size={18}/></button>}
    </article>
  }

  function renderGroup(date: string) {
    const onDate = entriesOn(entries, date)
    if (!onDate.length || date < floor) return null
    return <section className="cleaning-schedule-group" key={date} aria-label={scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}>
      <div className="cleaning-section-title cleaning-schedule-day-title">
        <h2>{scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <span className="cleaning-section-note">{onDate.length} {onDate.length === 1 ? 'zadanie' : 'zadań'}</span>
      </div>
      <div className="cleaning-schedule-items">{onDate.map(renderCard)}</div>
    </section>
  }

  const headerLabel = scheduleDateLabel(currentDate, { month: 'long', year: 'numeric' })

  return <section className="cleaning-page cleaning-schedule" aria-label="Harmonogram">
    <div className="cleaning-schedule-calendar">
      <div className="cleaning-schedule-period">
        <button type="button" aria-label="Poprzedni tydzień" disabled={!canPrevious || busy}
          onClick={() => navigate(-1)}><KitchenIcon name="chevronLeft" size={20}/></button>
        <div className="cleaning-schedule-period-center">
          <strong>{headerLabel}</strong>
          <button type="button" className="cleaning-schedule-today" aria-label="Przejdź do dzisiaj"
            onClick={() => { setToday(todayWarsaw()); setSelectedDate(todayWarsaw()) }}>Dzisiaj</button>
        </div>
        <button type="button" aria-label="Następny tydzień" disabled={busy}
          onClick={() => navigate(1)}><KitchenIcon name="chevronRight" size={20}/></button>
      </div>
      <div className="cleaning-schedule-week-clip" onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={pointerUp} onPointerCancel={pointerCancel} onLostPointerCapture={pointerCancel}
        onClickCapture={(event) => { if (swallowSwipeClick.current) { event.preventDefault(); event.stopPropagation(); swallowSwipeClick.current = false } }}>
        <div key={days[0]} className={`cleaning-schedule-weekdays${dragging ? ' is-dragging' : ''}`}
          style={{ transform: `translate3d(${dragOffset}px,0,0)` }} aria-label="Wybierz dzień tygodnia">
          {days.map((date, index) => {
            const count = entriesOn(entries, date).length
            return <button key={date} type="button" aria-disabled={date < floor || busy}
              tabIndex={date < floor ? -1 : undefined}
              className={`${date === currentDate ? 'is-selected' : ''} ${date === today ? 'is-today' : ''}`.trim()}
              aria-pressed={date === currentDate}
              aria-label={`${scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count} zadań`}
              onClick={() => { if (date >= floor && !busy) setSelectedDate(date) }}>
              <span>{shortWeekdays[index]}</span><strong>{Number(date.slice(8))}</strong>{count > 0 && <i aria-hidden="true"/>}
            </button>
          })}
        </div>
      </div>
    </div>

    {loading && <div className="cleaning-status-message" role="status">Wczytywanie harmonogramu…</div>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button type="button" className="cleaning-task-link" onClick={() => { void refresh(true) }}>Spróbuj ponownie</button></div>}
    {actionError && <div className="cleaning-inline-error" role="alert">{actionError} <button type="button" className="cleaning-task-link" onClick={() => { void refresh() }}>Odśwież</button></div>}
    {feedback && <div className="cleaning-schedule-feedback" role="status">{feedback}
      {lastCompleted && <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => { void undoRecent() }}>Cofnij</button>}
    </div>}
    {!loading && !error && <div className="cleaning-schedule-agenda" key={currentDate}>
      {backlog.length > 0 && <section className="cleaning-schedule-group is-overdue" aria-label="Zaległe">
        <div className="cleaning-section-title cleaning-schedule-day-title"><h2>Zaległe</h2><span className="cleaning-section-note">{backlog.length} do wykonania</span></div>
        <div className="cleaning-schedule-items">{backlog.map(renderBacklog)}</div>
      </section>}
      {entriesOn(entries, currentDate).length ? renderGroup(currentDate)
        : <div className="cleaning-schedule-group"><div className="cleaning-section-title cleaning-schedule-day-title">
            <h2>{scheduleDateLabel(currentDate, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <span className="cleaning-section-note">0 zadań</span>
          </div><p className="cleaning-empty-compact">Brak zadań na wybrany dzień.</p></div>}
    </div>}
  </section>
}
