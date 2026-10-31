import { useEffect, useRef, useState, type FormEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { AppFormSheet } from '../../components/AppFormSheet'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus, cleaningRecurrenceOptions, recurrenceBounds, recurrenceLabel, type CleaningRecurrenceKind } from './cleaningRecurrence'
import {
  archiveCleaningTask, completeCleaningTask, createCleaningTask,
  formatCleaningDate, loadCleaningCompletions, loadCleaningTasks,
  sortCleaningTasks, todayWarsaw, updateCleaningTask,
  type CleaningCompletion, type CleaningTask,
} from './cleaningTasks'

type EditorState = { mode: 'new' } | { mode: 'edit'; taskId: string } | null

type Props = { ownerId: string; room: CleaningRoom; onChanged: () => void }

export function CleaningTaskBoard({ ownerId, room, onChanged }: Props) {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<EditorState>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState(todayWarsaw())
  const [recurrenceKind, setRecurrenceKind] = useState<CleaningRecurrenceKind>('once')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null)
  const [history, setHistory] = useState<CleaningCompletion[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [reload, setReload] = useState(0)
  const pendingCompletion = useRef(new Map<string, { id: string; generation: number }>())
  const mountedRoomId = room.id

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setTasks([])
    setEditor(null)
    setShowHistoryId(null)
    setJustCompletedId(null)
    pendingCompletion.current.clear()
    loadCleaningTasks(ownerId, mountedRoomId).then((results) => {
      if (active) { setTasks(results); setLoading(false) }
    }).catch((cause: unknown) => {
      if (active) { setError(toUserErrorMessage(cause, 'Nie udało się pobrać zadań.')); setLoading(false) }
    })
    return () => { active = false }
  }, [ownerId, mountedRoomId, reload])

  const activeTasks = tasks.filter((task) => !task.isArchived)
  const archivedTasks = tasks.filter((task) => task.isArchived)

  const upsert = (updated: CleaningTask) => {
    setTasks((old) => sortCleaningTasks([...old.filter((task) => task.id !== updated.id), updated]))
    onChanged()
  }

  function openNew() {
    setEditor({ mode: 'new' }); setTitle(''); setNotes(''); setDueDate(todayWarsaw());
    setRecurrenceKind('once'); setRecurrenceInterval(1); setError('')
  }
  function openEdit(task: CleaningTask) {
    setEditor({ mode: 'edit', taskId: task.id }); setTitle(task.title); setNotes(task.notes)
    setDueDate(task.nextDueDate); setRecurrenceKind(task.recurrenceKind);
    setRecurrenceInterval(task.recurrenceInterval ?? 1); setError('')
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || room.isArchived || !editor) return
    setBusy(true); setError('')
    try {
      const interval = recurrenceKind === 'once' ? null : recurrenceInterval
      const updated = editor.mode === 'new'
        ? await createCleaningTask(room.id, title, notes, dueDate, recurrenceKind, interval)
        : await updateCleaningTask(editor.taskId, tasks.find((task) => task.id === editor.taskId)?.cycleGeneration ?? -1,
          title, notes, dueDate, recurrenceKind, interval)
      upsert(updated); setEditor(null)
    } catch (cause: unknown) {
      setError(toUserErrorMessage(cause, 'Nie udało się zapisać zadania.'))
    } finally { setBusy(false) }
  }

  async function setArchived(task: CleaningTask, archived: boolean) {
    if (busy) return
    setBusy(true); setError('')
    try { upsert(await archiveCleaningTask(task.id, archived)) }
    catch (cause: unknown) { setError(toUserErrorMessage(cause, 'Nie udało się zmienić statusu zadania.')) }
    finally { setBusy(false) }
  }

  async function complete(task: CleaningTask) {
    if (busy || task.isCompleted || task.isArchived || room.isArchived) return
    setBusy(true); setError('')
    // Preserve operation UUID for retry after a lost HTTP response.
    let operation = pendingCompletion.current.get(task.id)
    if (!operation || operation.generation !== task.cycleGeneration) {
      operation = { id: crypto.randomUUID(), generation: task.cycleGeneration }
      pendingCompletion.current.set(task.id, operation)
    }
    try {
      const updated = await completeCleaningTask(task.id, operation.generation, operation.id)
      pendingCompletion.current.delete(task.id)
      setJustCompletedId(task.id)
      upsert(updated)
      if (showHistoryId === task.id) {
        try { setHistory(await loadCleaningCompletions(ownerId, task.id)) }
        catch { setShowHistoryId(null) } // History refresh must not report a successful completion as failed.
      }
    } catch (cause: unknown) {
      setError(toUserErrorMessage(cause, 'Nie udało się potwierdzić wykonania. Możesz ponowić operację.'))
    } finally { setBusy(false) }
  }

  async function toggleHistory(task: CleaningTask) {
    if (showHistoryId === task.id) { setShowHistoryId(null); return }
    setShowHistoryId(task.id); setHistory([]); setHistoryLoading(true); setError('')
    try { setHistory(await loadCleaningCompletions(ownerId, task.id)) }
    catch (cause: unknown) { setError(toUserErrorMessage(cause, 'Nie udało się pobrać historii.')) }
    finally { setHistoryLoading(false) }
  }

  function renderTask(task: CleaningTask) {
    const due = cleaningDueStatus(task.nextDueDate, todayWarsaw())
    const repeating = task.recurrenceKind !== 'once'
    const canChange = !room.isArchived && !task.isArchived && !task.isCompleted
    return (
      <div className={`cleaning-task-card${task.isCompleted ? ' is-done' : ''}`} key={task.id}>
        <label className="cleaning-task-main">
          <input type="checkbox" checked={task.isCompleted} disabled={!canChange || busy}
            onChange={() => { void complete(task) }} aria-label={`Oznacz jako wykonane: ${task.title}`} />
          <span className="cleaning-task-description"><strong>{task.title}</strong>
            {task.notes && <span>{task.notes}</span>}
            <small>{task.isCompleted ? 'Wykonane' : `${recurrenceLabel(task.recurrenceKind, task.recurrenceInterval)} · termin ${formatCleaningDate(task.nextDueDate)}`}</small>
            {!task.isCompleted && <span className={`cleaning-due-status is-${due.kind}`}>{due.text}</span>}
            {repeating && justCompletedId === task.id && <span className="cleaning-task-feedback" role="status">Zrobione! Następny termin: {formatCleaningDate(task.nextDueDate)}</span>}
          </span>
        </label>
        <div className="cleaning-task-actions">
          {canChange && <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => openEdit(task)}>Edytuj</button>}
          {!task.isArchived && <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => { void setArchived(task, true) }}>Archiwizuj</button>}
          {task.isArchived && !room.isArchived && <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => { void setArchived(task, false) }}>Przywróć</button>}
          <button type="button" className="cleaning-task-link" disabled={busy} aria-expanded={showHistoryId === task.id}
            onClick={() => { void toggleHistory(task) }}>{showHistoryId === task.id ? 'Ukryj historię' : 'Historia'}</button>
        </div>
        {showHistoryId === task.id && <div className="cleaning-task-history" aria-live="polite">
          {historyLoading ? 'Wczytywanie historii…' : history.length === 0 ? 'Brak zapisanych wykonań.' : (
            <ul>{history.map((entry) => <li key={entry.id}>Wykonano: {formatCleaningDate(entry.completedLocalDate)} <span>· termin {formatCleaningDate(entry.dueDateBefore)}{entry.dueDateAfter ? ` · następny ${formatCleaningDate(entry.dueDateAfter)}` : ''}</span></li>)}</ul>
          )}
        </div>}
      </div>
    )
  }

  return <section className="cleaning-tasks" aria-label={`Zadania — ${room.name}`}>
    <div className="cleaning-section-title"><h2>Zadania</h2><span className="cleaning-section-note">{activeTasks.filter((t) => !t.isCompleted && t.nextDueDate <= todayWarsaw()).length} pilnych · {activeTasks.filter((t) => !t.isCompleted).length} aktywnych</span></div>
    {!room.isArchived && !editor && <button type="button" className="cleaning-action cleaning-add-room" onClick={openNew}><KitchenIcon name="plus" size={17}/> Dodaj zadanie</button>}
    {editor && <AppFormSheet
      titleId="cleaning-task-editor-title"
      title={editor.mode === 'new' ? 'Nowe zadanie' : 'Edytuj zadanie'}
      kicker="POMIESZCZENIE"
      busy={busy}
      onClose={() => { setEditor(null); setError('') }}
      className="cleaning-editor-sheet"
    >
      <form className="cleaning-room-editor inventory-form" onSubmit={(event) => { void submitTask(event) }}>
        <div className="form-field">
          <label htmlFor="cleaning-task-title">Nazwa zadania</label>
          <input id="cleaning-task-title" type="text" maxLength={120} value={title} required disabled={busy}
            onChange={(event) => setTitle(event.target.value)} placeholder="np. Wypierz ręczniki" />
        </div>
        <div className="form-field">
          <label htmlFor="cleaning-task-notes">Notatka (opcjonalnie)</label>
          <textarea id="cleaning-task-notes" maxLength={500} rows={3} value={notes} disabled={busy}
            onChange={(event) => setNotes(event.target.value)} placeholder="np. 40°C, program delikatny" />
        </div>
        <div className="form-field">
          <label htmlFor="cleaning-task-due">{recurrenceKind === 'once' ? 'Termin wykonania' : 'Pierwszy termin wykonania'}</label>
          <div className="cleaning-date-field">
            <input id="cleaning-task-due" type="date" required value={dueDate} disabled={busy}
              onChange={(event) => setDueDate(event.target.value)} />
            <span className="cleaning-date-icon" aria-hidden="true"><KitchenIcon name="calendar" size={20}/></span>
          </div>
          <p className="field-hint">Dotknij pola daty, aby otworzyć kalendarz.</p>
        </div>
        <div className="form-field">
          <label htmlFor="cleaning-task-recurrence">Powtarzanie</label>
          <select id="cleaning-task-recurrence" value={recurrenceKind} disabled={busy}
            onChange={(event) => { setRecurrenceKind(event.target.value as CleaningRecurrenceKind); setRecurrenceInterval(1) }}>
            {cleaningRecurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        {recurrenceKind !== 'once' && <div className="form-field">
          <label htmlFor="cleaning-task-interval">Powtarzaj co</label>
          <div className="cleaning-recurrence-stepper">
            <input id="cleaning-task-interval" type="number" inputMode="numeric" min={recurrenceBounds(recurrenceKind)?.min} max={recurrenceBounds(recurrenceKind)?.max}
              step="1" value={recurrenceInterval} required disabled={busy}
              onChange={(event) => setRecurrenceInterval(Number(event.target.value))} />
            <span>{recurrenceKind === 'every_days' ? 'dni' : recurrenceKind === 'every_weeks' ? 'tygodni' : 'miesięcy'}</span>
          </div>
          <p className="field-hint">Kolejny termin liczymy od dnia rzeczywistego wykonania. Nie tworzymy zaległych powtórek automatycznie.</p>
        </div>}
        <p className="cleaning-task-hint">Zapis wykonania pozostaje w historii. Zmiana terminu lub cyklu nie usuwa wcześniejszych wykonań.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => { setEditor(null); setError('') }}>Anuluj</button>
          <button type="submit" className="primary-button" disabled={busy || !title.trim() || !dueDate || (recurrenceKind !== 'once' && (!Number.isInteger(recurrenceInterval) || recurrenceInterval < (recurrenceBounds(recurrenceKind)?.min ?? 1) || recurrenceInterval > (recurrenceBounds(recurrenceKind)?.max ?? 1)))}>{busy ? 'Zapisywanie…' : 'Zapisz zadanie'}</button>
        </div>
      </form>
    </AppFormSheet>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => setReload((v) => v + 1)}>Odśwież</button></div>}
    {loading ? <div className="cleaning-status-message" role="status">Wczytywanie zadań…</div> : (
      <>
        {!activeTasks.length && <div className="cleaning-empty-state"><span className="cleaning-empty-icon"><KitchenIcon name="check" size={23}/></span><h3>Jeszcze nie ma zadań</h3><p>Dodaj pierwsze zadanie do tego pomieszczenia.</p></div>}
        <div className="cleaning-task-list">{activeTasks.map(renderTask)}</div>
        {archivedTasks.length > 0 && <div className="cleaning-archived-section">
          <button type="button" className="cleaning-archived-toggle" aria-expanded={showArchived} onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? 'Ukryj archiwum zadań' : `Archiwum zadań (${archivedTasks.length})`}
            <KitchenIcon name={showArchived ? 'chevronUp' : 'chevronDown'} size={17}/>
          </button>
          {showArchived && <div className="cleaning-task-list">{archivedTasks.map(renderTask)}</div>}
        </div>}
      </>
    )}
  </section>
}
