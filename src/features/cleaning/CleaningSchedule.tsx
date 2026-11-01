import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { useCleaningTaskUndo } from './useCleaningTaskUndo'
import { useCleaningOccurrenceCompletion } from './useCleaningOccurrenceCompletion'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus } from './cleaningRecurrence'
import { loadCleaningOccurrences, loadRecentCleaningCompletions, type CleaningOccurrence, type CleaningRecentCompletion } from './cleaningOccurrences'
import {
  addCalendarDays, canUndoOccurrence, clampScheduleDay, earliestScheduleDay, entriesOn, overdueBacklog,
  scheduleDateLabel, scheduleEntries, rollingScheduleDays, rollingScheduleHeader,
  scheduleQueryRange, shortCalendarWeekday, rollingScrollShift, mondayOfWeek, scheduleViewAfterCompletion,
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


/** H6.4.2: anchored server occurrences; schedule is an execution surface, not an editor.
 * Never infer future recurrence locally or complete a non-actionable projection.
 */
export function CleaningSchedule({ ownerId, rooms, onOpenRoom, onChanged, jumpToToday = 0 }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayWarsaw)
  const [visibleStart, setVisibleStart] = useState(() => mondayOfWeek(todayWarsaw()))
  const [today, setToday] = useState(todayWarsaw)
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [occurrences, setOccurrences] = useState<CleaningOccurrence[]>([])
  const [recentCompletions, setRecentCompletions] = useState<CleaningRecentCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [mutationVersion, setMutationVersion] = useState(0)
  const { run: runCompletion, busyId, inFlight } = useCleaningOccurrenceCompletion()
  const { undo: runUndo, undoBusyId, inFlightUndo } = useCleaningTaskUndo()
  const requestNumber = useRef(0)
  const calendarCache = useRef(new Map<string, CleaningOccurrence[]>())
  const cacheIdentity = useRef('')
  const scroller = useRef<HTMLDivElement | null>(null)
  const isPointerDown = useRef(false)
  const isTouchDown = useRef(false)
  const recentering = useRef(false)
  const scrollTimer = useRef<number | null>(null)

  const floor = earliestScheduleDay(today)
  const currentDate = clampScheduleDay(selectedDate, today)
  const windowStart = clampScheduleDay(visibleStart, today)
  const days = rollingScheduleDays(windowStart)
  // Seven days on either side are rendered for direct manipulation; no blank space mid-drag.
  const bufferedDays = rollingScheduleDays(addCalendarDays(windowStart, -7), 21)
  const query = scheduleQueryRange(windowStart, today)

  const refresh = useCallback(async (force = false, initial = false) => {
    const cacheKey = `${ownerId}:${today}`
    if (cacheIdentity.current !== cacheKey) {
      calendarCache.current.clear()
      cacheIdentity.current = cacheKey
      force = true
    }
    if (force) calendarCache.current.clear()
    const needed = [...days, currentDate]
    if (!force && needed.every((day) => calendarCache.current.has(day))) return
    const requestId = ++requestNumber.current
    if (initial || !calendarCache.current.has(currentDate)) setLoading(true)
    try {
      // An old selected day may remain on screen as the user scrolls the strip far away.
      const selectedOutsideQuery = currentDate < query.from || currentDate > query.to
      const [latestTasks, latestOccurrences, extraSelected, latestCompletions] = await Promise.all([
        loadCleaningTasks(ownerId), loadCleaningOccurrences(query.from, query.to),
        selectedOutsideQuery ? loadCleaningOccurrences(currentDate, currentDate) : Promise.resolve([]),
        loadRecentCleaningCompletions(ownerId, earliestScheduleDay(today)),
      ])
      if (requestId !== requestNumber.current) return
      const fillCache = (from: string, to: string, data: CleaningOccurrence[]) => {
        const grouped = new Map<string, CleaningOccurrence[]>()
        for (const item of data) {
          const onDay = item.isDone && item.completedLocalDate ? item.completedLocalDate : item.scheduledDueDate
          if (onDay < from || onDay > to) continue
          const group = grouped.get(onDay) ?? []
          group.push(item)
          grouped.set(onDay, group)
        }
        for (let day = from; day <= to; day = addCalendarDays(day, 1)) {
          calendarCache.current.set(day, grouped.get(day) ?? [])
        }
      }
      fillCache(query.from, query.to, latestOccurrences)
      if (selectedOutsideQuery) fillCache(currentDate, currentDate, extraSelected)
      // Cache stores only server-returned occurrences, never a local recurrence calculation.
      setOccurrences(Array.from(calendarCache.current.values()).flat())
      setTasks(latestTasks)
      setRecentCompletions(latestCompletions)
      setError('')
    } catch (cause: unknown) {
      if (requestId !== requestNumber.current) return
      setError(toUserErrorMessage(cause, 'Nie udało się pobrać harmonogramu.'))
    } finally {
      if (requestId === requestNumber.current) setLoading(false)
    }
  }, [ownerId, today, currentDate, query.from, query.to, windowStart])

  useEffect(() => {
    void refresh(false, true)
  }, [refresh, mutationVersion])

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'hidden') return
      setToday(todayWarsaw())
      if (!inFlight.current && !inFlightUndo.current) void refresh(true)
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    const interval = window.setInterval(() => setToday(todayWarsaw()), 60_000)
    return () => {
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
      window.clearInterval(interval)
    }
  }, [refresh, inFlightUndo])

  useEffect(() => () => {
    requestNumber.current += 1
    if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current)
  }, [])

  useEffect(() => {
    if (visibleStart < floor) setVisibleStart(floor)
  }, [visibleStart, floor])

  useEffect(() => {
    if (jumpToToday > 0) {
      const now = todayWarsaw()
      setToday(now)
      setSelectedDate(now)
      setVisibleStart(mondayOfWeek(now))
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
  const canPrevious = windowStart > floor
  const busy = busyId !== null || undoBusyId !== null

  function clearScrollTimer() {
    if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current)
    scrollTimer.current = null
  }

  function recenter() {
    const element = scroller.current
    if (!element) return
    clearScrollTimer()
    recentering.current = true
    // Keep the same seven visible civil dates while replacing the offscreen buffer.
    const snap = element.style.scrollSnapType
    element.style.scrollSnapType = 'none'
    element.scrollLeft = element.clientWidth
    element.style.scrollSnapType = snap
    window.requestAnimationFrame(() => { recentering.current = false })
  }

  function finishScroll() {
    if (isPointerDown.current || isTouchDown.current || recentering.current) return
    clearScrollTimer()
    const element = scroller.current
    if (!element || !element.clientWidth) return
    const shift = rollingScrollShift(element.scrollLeft, element.clientWidth, windowStart, today)
    if (shift !== 0) setVisibleStart((start) => clampScheduleDay(addCalendarDays(start, shift), today))
    else recenter()
  }

  function scheduleScrollFinish() {
    clearScrollTimer()
    scrollTimer.current = window.setTimeout(finishScroll, 180)
  }

  // Native overflow scrolling means iOS Safari owns the touch gesture.
  // On scrollend (or its fallback), one-day snap offsets are committed to the rolling window.
  useLayoutEffect(() => { recenter() }, [windowStart])

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const onScrollEnd = () => finishScroll()
    const onResize = () => recenter()
    element.addEventListener('scrollend', onScrollEnd)
    window.addEventListener('resize', onResize)
    return () => {
      element.removeEventListener('scrollend', onScrollEnd)
      window.removeEventListener('resize', onResize)
    }
  })

  function navigate(direction: -1 | 1) {
    if (busy || (direction === -1 && !canPrevious)) return
    clearScrollTimer()
    setVisibleStart((start) => clampScheduleDay(addCalendarDays(start, direction), today))
  }

  function goToday() {
    if (busy) return
    isPointerDown.current = false
    isTouchDown.current = false
    clearScrollTimer()
    const now = todayWarsaw()
    setToday(now)
    setSelectedDate(now)
    setVisibleStart(mondayOfWeek(now))
    // Also reset native scroll if the current rolling window is already today's.
    recenter()
  }

  // Every successful mutation invalidates both task and occurrence snapshots. In particular,
  // a completed overdue occurrence leaves its original due date and appears on today's
  // actual completion date, so the agenda must re-query instead of trusting day cache.
  function invalidateCalendar() {
    requestNumber.current += 1 // Discard in-flight reads started before the mutation.
    calendarCache.current.clear()
    setMutationVersion((version) => version + 1)
  }

  async function complete(entry: ScheduleEntry) {
    const { task, occurrence } = entry
    if (busy || inFlight.current) return
    setActionError('')
    try {
      const saved = await runCompletion(occurrence, task)
      if (!saved) return
      const completedToday = todayWarsaw()
      const target = scheduleViewAfterCompletion(windowStart, completedToday)
      setToday(completedToday)
      setSelectedDate(target.selectedDate)
      setVisibleStart(target.visibleStart)
      setAnnouncement(`Zrobiono: ${task.title}`)
      invalidateCalendar()
      onChanged()
    } catch (cause: unknown) {
      setActionError(toUserErrorMessage(cause, 'Nie udało się wykonać zadania.'))
    }
  }

  async function undoRecent(task: CleaningTask) {
    if (busy || inFlight.current) return
    setActionError('')
    try {
      const saved = await runUndo(task)
      if (!saved) return
      setAnnouncement(`Cofnięto: ${saved.title}`)
      invalidateCalendar()
      onChanged()
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

  const headerLabel = rollingScheduleHeader(windowStart)

  return <section className="cleaning-page cleaning-schedule" aria-label="Harmonogram">
    <div className="cleaning-schedule-calendar">
      <div className="cleaning-schedule-period">
        <button type="button" aria-label="Poprzedni dzień" disabled={!canPrevious || busy}
          onClick={() => navigate(-1)}><KitchenIcon name="chevronLeft" size={20}/></button>
        <div className="cleaning-schedule-period-center">
          <strong>{headerLabel}</strong>
          <button type="button" className="cleaning-schedule-today" aria-label="Przejdź do dzisiaj"
            onClick={goToday}>Dzisiaj</button>
        </div>
        <button type="button" aria-label="Następny dzień" disabled={busy}
          onClick={() => navigate(1)}><KitchenIcon name="chevronRight" size={20}/></button>
      </div>
      <div className="cleaning-schedule-week-clip" ref={scroller}
        onScroll={() => { if (!recentering.current) scheduleScrollFinish() }}
        onPointerDown={() => { isPointerDown.current = true; clearScrollTimer() }}
        onPointerUp={() => { isPointerDown.current = false; scheduleScrollFinish() }}
        onPointerCancel={() => { isPointerDown.current = false; scheduleScrollFinish() }}
        onTouchStart={() => { isTouchDown.current = true; clearScrollTimer() }}
        onTouchEnd={() => { isTouchDown.current = false; scheduleScrollFinish() }}
        onTouchCancel={() => { isTouchDown.current = false; scheduleScrollFinish() }}>
        <div className="cleaning-schedule-weekdays"
          aria-label="Przesuń daty w poziomie lub wybierz dzień">
          {bufferedDays.map((date, index) => {
            const count = entriesOn(entries, date).length
            const inView = index >= 7 && index < 14
            const disabled = date < floor || busy
            return <button key={date} type="button" disabled={disabled}
              aria-hidden={!inView}
              tabIndex={!inView || disabled ? -1 : 0}
              className={`${date === currentDate ? 'is-selected' : ''} ${date === today ? 'is-today' : ''}`.trim()}
              aria-pressed={date === currentDate}
              aria-label={`${scheduleDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count} zadań`}
              onClick={() => { if (date >= floor && !busy) setSelectedDate(date) }}>
              <span>{shortCalendarWeekday(date)}</span><strong>{Number(date.slice(8))}</strong>{count > 0 && <i aria-hidden="true"/>}
            </button>
          })}
        </div>
      </div>
    </div>

    {loading && <div className="cleaning-status-message" role="status">Wczytywanie harmonogramu…</div>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button type="button" className="cleaning-task-link" onClick={() => { void refresh(true) }}>Spróbuj ponownie</button></div>}
    {actionError && <div className="cleaning-inline-error" role="alert">{actionError} <button type="button" className="cleaning-task-link" onClick={() => { void refresh() }}>Odśwież</button></div>}
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
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
