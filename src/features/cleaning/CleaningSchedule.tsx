import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { useCleaningTaskUndo } from './useCleaningTaskUndo'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus } from './cleaningRecurrence'
import { completeCleaningOccurrence, loadCleaningOccurrences, loadRecentCleaningCompletions, type CleaningOccurrence, type CleaningRecentCompletion } from './cleaningOccurrences'
import {
  addCalendarDays, canUndoOccurrence, clampScheduleDay, earliestScheduleDay, entriesOn, overdueBacklog,
  scheduleDateLabel, scheduleEntries, scheduleRange, swipeDirection,
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
type Mode = 'day' | 'week'

const shortWeekdays = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.']

/** H6.4.2: anchored server occurrences; schedule is an execution surface, not an editor.
 * Never infer future recurrence locally or complete a non-actionable projection.
 */
export function CleaningSchedule({ ownerId, rooms, onOpenRoom, onChanged, jumpToToday = 0 }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayWarsaw)
  const [today, setToday] = useState(todayWarsaw)
  const [mode, setMode] = useState<Mode>('week')
  const [selectedRoomId, setSelectedRoomId] = useState('all')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [occurrences, setOccurrences] = useState<CleaningOccurrence[]>([])
  const [recentCompletions, setRecentCompletions] = useState<CleaningRecentCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lastCompleted, setLastCompleted] = useState<CleaningTask | null>(null)
  const { undo: runUndo, undoBusyId, inFlightUndo } = useCleaningTaskUndo()
  const requestNumber = useRef(0)
  const inFlight = useRef(false)
  // Retry after an ambiguous response must reuse the same operation ID AND occurrence identity.
  const pending = useRef(new Map<string, { id: string; generation: number; revision: number; date: string }>())
  const touch = useRef<{ x: number; y: number } | null>(null)

  const floor = earliestScheduleDay(today)
  const currentDate = clampScheduleDay(selectedDate, today)
  const range = scheduleRange(currentDate, mode, today)
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
      setMode('day')
    }
  }, [jumpToToday])

  const activeRooms = rooms.filter((room) => !room.isArchived)
  const roomById = new Map(activeRooms.map((room) => [room.id, room]))
  const activeRoomIds = new Set(roomById.keys())
  const filter = selectedRoomId === 'all' || activeRoomIds.has(selectedRoomId) ? selectedRoomId : 'all'
  const entries = scheduleEntries(occurrences, tasks, activeRoomIds, filter)
  const recentByTask = new Map<string, CleaningRecentCompletion>()
  for (const item of recentCompletions) {
    if (!recentByTask.has(item.taskId)) recentByTask.set(item.taskId, item)
  }
  const displayed = entries.filter((entry) =>
    entry.occurrence.scheduledDueDate >= range.activeFrom && entry.occurrence.scheduledDueDate <= range.activeTo)
  const showBacklog = mode === 'day' ? currentDate === today : from <= today && today <= to
  const backlogStart = mode === 'day' ? today : from
  const backlog = showBacklog ? overdueBacklog(tasks, activeRoomIds, filter, today, backlogStart) : []
  const canPrevious = currentDate > floor
  const busy = busyId !== null || undoBusyId !== null

  function navigate(direction: -1 | 1) {
    if (busy) return
    const offset = (mode === 'day' ? 1 : 7) * direction
    setSelectedDate((date) => clampScheduleDay(addCalendarDays(clampScheduleDay(date, today), offset), today))
  }

  function touchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1 || busy) { touch.current = null; return }
    const target = event.target as HTMLElement
    if (target.closest('button,input,select,textarea,a,label')) { touch.current = null; return }
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  function touchEnd(event: TouchEvent<HTMLElement>) {
    const start = touch.current
    touch.current = null
    if (!start || event.changedTouches.length !== 1) return
    const direction = swipeDirection(event.changedTouches[0].clientX - start.x,
      event.changedTouches[0].clientY - start.y, start.x, window.innerWidth)
    if (direction) navigate(direction)
  }

  async function complete(entry: ScheduleEntry) {
    const { occurrence, task } = entry
    if (busy || inFlight.current || !occurrence.isActionable || occurrence.isDone || task.isArchived || task.isCompleted) return
    const previous = pending.current.get(task.id)
    if (previous && (previous.generation !== occurrence.cycleGeneration
      || previous.revision !== occurrence.scheduleRevision || previous.date !== occurrence.scheduledDueDate)) {
      pending.current.delete(task.id)
      setActionError('Termin zadania zmienił się. Odśwież harmonogram.')
      return
    }
    const operation = previous ?? {
      id: crypto.randomUUID(), generation: occurrence.cycleGeneration,
      revision: occurrence.scheduleRevision, date: occurrence.scheduledDueDate,
    }
    pending.current.set(task.id, operation)
    inFlight.current = true
    setBusyId(task.id)
    setActionError('')
    setFeedback('')
    try {
      const saved = await completeCleaningOccurrence(occurrence, operation.id)
      if (saved.cycleGeneration !== occurrence.cycleGeneration + 1 || !saved.lastCompletedAt ||
        (task.recurrenceKind === 'once' && !saved.isCompleted)) {
        pending.current.delete(task.id)
        throw new Error('Wykonanie zostało już cofnięte lub termin się zmienił. Odśwież harmonogram.')
      }
      pending.current.delete(task.id)
      setLastCompleted(saved)
      setFeedback(`Zrobione: ${task.title}`)
      onChanged()
      await refresh()
    } catch (cause: unknown) {
      setActionError(toUserErrorMessage(cause, 'Nie udało się wykonać zadania.'))
    } finally {
      inFlight.current = false
      setBusyId(null)
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
    return <article key={`${task.id}:${occurrence.scheduledDueDate}:${occurrence.scheduleRevision}`}
      className={`cleaning-schedule-item${occurrence.isDone ? ' is-done' : ''}`}>
      <label className="cleaning-schedule-check" title={!canComplete && !canUndoHere && !occurrence.isDone
        ? 'Najpierw wykonaj wcześniejszy termin tego zadania.' : undefined}>
        <input type="checkbox" checked={occurrence.isDone}
          disabled={busy || (!canComplete && !canUndoHere)}
          aria-label={occurrence.isDone ? `Wykonano: ${task.title}` : `Wykonaj: ${task.title}`}
          onChange={() => { if (canUndoHere) void undoRecent(task); else if (canComplete) void complete(entry) }} />
      </label>
      <div className="cleaning-schedule-item-body">
        <strong>{task.title}</strong>
        {task.notes && <p>{task.notes}</p>}
        <div className="cleaning-schedule-item-meta">
          {room && <span className="cleaning-schedule-room-name">{room.name}</span>}
          <span className={`cleaning-due-status ${occurrence.isDone ? 'is-done' : `is-${status.kind}`}`}>
            {occurrence.isDone ? 'Zrobione' : status.text}
          </span>
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
    const onDate = entriesOn(displayed, date)
    if (!onDate.length || date < floor) return null
    return <section className="cleaning-schedule-group" key={date} aria-label={scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}>
      <div className="cleaning-section-title cleaning-schedule-day-title">
        <h2>{scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <span className="cleaning-section-note">{onDate.length} {onDate.length === 1 ? 'zadanie' : 'zadań'}</span>
      </div>
      <div className="cleaning-schedule-items">{onDate.map(renderCard)}</div>
    </section>
  }

  const headerLabel = mode === 'day'
    ? scheduleDateLabel(currentDate, { day: 'numeric', month: 'long', year: 'numeric' })
    : scheduleDateLabel(currentDate, { month: 'long', year: 'numeric' })

  return <section className="cleaning-page cleaning-schedule" aria-labelledby="cleaning-schedule-title">
    <div className="cleaning-schedule-heading"><h1 id="cleaning-schedule-title">Harmonogram</h1></div>
    <div className="cleaning-schedule-toolbar">
      <div className="cleaning-schedule-mode" role="group" aria-label="Widok harmonogramu">
        <button type="button" className={mode === 'day' ? 'is-active' : ''} aria-pressed={mode === 'day'} onClick={() => setMode('day')}>Dzień</button>
        <button type="button" className={mode === 'week' ? 'is-active' : ''} aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Tydzień</button>
      </div>
      <div className="cleaning-schedule-toolbar-actions">
        <button type="button" className="cleaning-schedule-today" onClick={() => { setSelectedDate(todayWarsaw()); setToday(todayWarsaw()) }}>Dzisiaj</button>
        <button type="button" className="cleaning-schedule-picker-toggle" aria-label="Wybierz datę" aria-expanded={datePickerOpen}
          onClick={() => setDatePickerOpen((open) => !open)}><KitchenIcon name="calendar" size={19}/></button>
      </div>
    </div>

    <div className="cleaning-schedule-calendar" onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchCancel={() => { touch.current = null }}>
      <div className="cleaning-schedule-period">
        <button type="button" aria-label={mode === 'day' ? 'Poprzedni dzień' : 'Poprzedni tydzień'} disabled={!canPrevious}
          onClick={() => navigate(-1)}><KitchenIcon name="chevronLeft" size={20}/></button>
        <strong>{headerLabel}</strong>
        <button type="button" aria-label={mode === 'day' ? 'Następny dzień' : 'Następny tydzień'}
          onClick={() => navigate(1)}><KitchenIcon name="chevronRight" size={20}/></button>
      </div>
      <div className="cleaning-schedule-weekdays" aria-label="Wybierz dzień tygodnia">
        {days.map((date, index) => {
          const count = entriesOn(entries, date).length
          return <button key={date} type="button" disabled={date < floor}
            className={`${date === currentDate ? 'is-selected' : ''} ${date === today ? 'is-today' : ''}`.trim()}
            aria-pressed={date === currentDate}
            aria-label={`${scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count} zadań`}
            onClick={() => { setSelectedDate(date); setMode('day') }}>
            <span>{shortWeekdays[index]}</span><strong>{Number(date.slice(8))}</strong>{count > 0 && <i aria-hidden="true"/>}
          </button>
        })}
      </div>
      {datePickerOpen && <div className="cleaning-schedule-date-picker">
        <label htmlFor="cleaning-schedule-date">Przejdź do daty</label>
        <div className="cleaning-date-field"><input id="cleaning-schedule-date" type="date" value={currentDate} min={floor}
          onChange={(event) => { if (event.target.value) { setSelectedDate(clampScheduleDay(event.target.value, today)); setDatePickerOpen(false) } }} />
          <span className="cleaning-date-icon" aria-hidden="true"><KitchenIcon name="calendar" size={19}/></span></div>
      </div>}
    </div>

    <div className="cleaning-schedule-filter">
      <label htmlFor="cleaning-schedule-room">Pomieszczenie</label>
      <select id="cleaning-schedule-room" value={filter} onChange={(event) => setSelectedRoomId(event.target.value)}>
        <option value="all">Wszystkie pomieszczenia</option>
        {activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
      </select>
    </div>

    {loading && <div className="cleaning-status-message" role="status">Wczytywanie harmonogramu…</div>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button type="button" className="cleaning-task-link" onClick={() => { void refresh(true) }}>Spróbuj ponownie</button></div>}
    {actionError && <div className="cleaning-inline-error" role="alert">{actionError} <button type="button" className="cleaning-task-link" onClick={() => { void refresh() }}>Odśwież</button></div>}
    {feedback && <div className="cleaning-schedule-feedback" role="status">{feedback}
      {lastCompleted && <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => { void undoRecent() }}>Cofnij</button>}
    </div>}
    {!loading && !error && <div className="cleaning-schedule-agenda" key={`${mode}:${currentDate}:${filter}`}
      onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchCancel={() => { touch.current = null }}>
      {showBacklog && backlog.length > 0 && <section className="cleaning-schedule-group is-overdue" aria-label="Zaległe">
        <div className="cleaning-section-title cleaning-schedule-day-title"><h2>Zaległe</h2><span className="cleaning-section-note">{backlog.length} do wykonania</span></div>
        <div className="cleaning-schedule-items">{backlog.map(renderBacklog)}</div>
      </section>}
      {mode === 'day' ? (displayed.length ? renderGroup(currentDate)
        : <p className="cleaning-empty-compact">Brak zadań na wybrany dzień.</p>)
        : displayed.length ? <div className="cleaning-schedule-groups">{days.map(renderGroup)}</div>
          : <p className="cleaning-empty-compact">Brak zadań w tym tygodniu.</p>}
    </div>}
  </section>
}
