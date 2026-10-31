import { useEffect, useState, type FormEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { AppFormSheet } from '../../components/AppFormSheet'
import { CompactQuantityStepper } from '../quantity/CompactQuantityStepper'
import { useCleaningTaskCompletion } from './useCleaningTaskCompletion'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus, cleaningRecurrenceOptions, recurrenceBounds, recurrenceLabel, type CleaningRecurrenceKind } from './cleaningRecurrence'
import {
  archiveCleaningTask, createCleaningTask, deleteCompletedOneoffTask,
  formatCleaningDate, loadCleaningTasks,
  sortCleaningTasks, todayWarsaw, updateCleaningTask,
  type CleaningTask,
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
  const [showDone, setShowDone] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { run: runCompletion, busyId, inFlight } = useCleaningTaskCompletion()
  const [reload, setReload] = useState(0)
  const mountedRoomId = room.id

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setTasks([])
    setEditor(null)
    setJustCompletedId(null)
    loadCleaningTasks(ownerId, mountedRoomId).then((results) => {
      if (active) { setTasks(results); setLoading(false) }
    }).catch((cause: unknown) => {
      if (active) { setError(toUserErrorMessage(cause, 'Nie udało się pobrać zadań.')); setLoading(false) }
    })
    return () => { active = false }
  }, [ownerId, mountedRoomId, reload])

  const activeTasks = tasks.filter((task) => !task.isArchived && !task.isCompleted)
  const doneTasks = tasks.filter((task) => !task.isArchived && task.isCompleted && task.recurrenceKind === 'once')
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
    if (busy || inFlight.current || task.isCompleted || task.isArchived || room.isArchived) return
    setError('')
    try {
      const updated = await runCompletion(task)
      if (!updated) return
      setJustCompletedId(task.id)
      upsert(updated)
    } catch (cause: unknown) {
      setError(toUserErrorMessage(cause, 'Nie udało się potwierdzić wykonania. Możesz ponowić operację.'))
    }
  }

  async function deleteDone(task: CleaningTask) {
    if (busy || inFlight.current || task.recurrenceKind !== 'once' || !task.isCompleted || task.isArchived) return
    setBusy(true); setError('')
    try {
      await deleteCompletedOneoffTask(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
      setConfirmDeleteId(null)
      onChanged()
    } catch (cause: unknown) {
      setError(toUserErrorMessage(cause, 'Nie udało się usunąć zadania.'))
    } finally { setBusy(false) }
  }

  function renderTask(task: CleaningTask) {
    const due = cleaningDueStatus(task.nextDueDate, todayWarsaw())
    const repeating = task.recurrenceKind !== 'once'
    const canChange = !room.isArchived && !task.isArchived && !task.isCompleted
    return <article className={`cleaning-task-card${task.isCompleted ? ' is-done' : ''}`} key={task.id}>
      <div className="cleaning-task-main">
        <label className="cleaning-dashboard-check" aria-label={`Oznacz jako wykonane: ${task.title}`}>
          <input type="checkbox" checked={task.isCompleted} disabled={!canChange || busy || busyId !== null}
            onChange={() => { void complete(task) }} />
        </label>
        {canChange ? <button type="button" className="cleaning-task-detail-button" onClick={() => openEdit(task)} disabled={busy || busyId !== null} aria-label={`Edytuj zadanie: ${task.title}`}>
          <strong>{task.title}</strong>
          {task.notes && <span>{task.notes}</span>}
          <small>{recurrenceLabel(task.recurrenceKind, task.recurrenceInterval)} · {formatCleaningDate(task.nextDueDate)}</small>
          <span className={`cleaning-due-status is-${due.kind}`}>{due.text}</span>
          {repeating && justCompletedId === task.id && <span className="cleaning-task-feedback" role="status">Zrobione! Następny termin: {formatCleaningDate(task.nextDueDate)}</span>}
        </button> : <div className="cleaning-task-description">
          <strong>{task.title}</strong>{task.notes && <span>{task.notes}</span>}
          <small>{task.isCompleted ? 'Wykonane' : formatCleaningDate(task.nextDueDate)}</small>
        </div>}
      </div>
      {task.isArchived && !room.isArchived && <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => { void setArchived(task, false) }}>Przywróć</button>}
      {task.isCompleted && !task.isArchived && <div className="cleaning-done-actions">
        <button type="button" className="cleaning-task-link cleaning-delete-link" disabled={busy || busyId !== null} onClick={() => setConfirmDeleteId(task.id)}>Usuń</button>
        {confirmDeleteId === task.id && <div className="cleaning-delete-confirm" role="group" aria-label={`Usuwanie zadania: ${task.title}`}>
          <p>Usunąć zadanie „{task.title}” wraz z jego zapisem wykonania? Tego nie można cofnąć.</p>
          <div className="sheet-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => setConfirmDeleteId(null)}>Anuluj</button>
            <button type="button" className="cleaning-subtle-danger" disabled={busy} onClick={() => { void deleteDone(task) }}>{busy ? 'Usuwanie…' : 'Usuń zadanie'}</button></div>
        </div>}
      </div>}
    </article>
  }

  return <section className="cleaning-tasks" aria-label={`Zadania — ${room.name}`}>
    <div className="cleaning-section-title"><h2>Zadania</h2><span className="cleaning-section-note">{activeTasks.filter((t) => t.nextDueDate <= todayWarsaw()).length} pilnych · {activeTasks.length} aktywnych</span></div>
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
        </div>
        <div className="cleaning-recurrence-controls">
          <div className="form-field">
            <label htmlFor="cleaning-task-recurrence">Powtarzanie</label>
            <select id="cleaning-task-recurrence" value={recurrenceKind} disabled={busy}
              onChange={(event) => { setRecurrenceKind(event.target.value as CleaningRecurrenceKind); setRecurrenceInterval(1) }}>
              {cleaningRecurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          {recurrenceKind !== 'once' && <div className="form-field cleaning-recurrence-count">
            <label htmlFor="cleaning-task-interval">Co ile</label>
            <CompactQuantityStepper ariaLabel="Częstotliwość powtarzania"
              value={<input id="cleaning-task-interval" type="number" inputMode="numeric"
                min={recurrenceBounds(recurrenceKind)?.min} max={recurrenceBounds(recurrenceKind)?.max}
                step="1" required value={recurrenceInterval} disabled={busy}
                onChange={(event) => setRecurrenceInterval(Number(event.target.value))} />} busy={busy}
              decrementDisabled={recurrenceInterval <= (recurrenceBounds(recurrenceKind)?.min ?? 1)}
              incrementDisabled={recurrenceInterval >= (recurrenceBounds(recurrenceKind)?.max ?? 1)}
              onDecrement={() => setRecurrenceInterval((value) => Math.max(recurrenceBounds(recurrenceKind)?.min ?? 1, value - 1))}
              onIncrement={() => setRecurrenceInterval((value) => Math.min(recurrenceBounds(recurrenceKind)?.max ?? 1, value + 1))} />
          </div>}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => { setEditor(null); setError('') }}>Anuluj</button>
          <button type="submit" className="primary-button" disabled={busy || !title.trim() || !dueDate || (recurrenceKind !== 'once' && (!Number.isInteger(recurrenceInterval) || recurrenceInterval < (recurrenceBounds(recurrenceKind)?.min ?? 1) || recurrenceInterval > (recurrenceBounds(recurrenceKind)?.max ?? 1)))}>{busy ? 'Zapisywanie…' : 'Zapisz zadanie'}</button>
        </div>
        {editor.mode === 'edit' && <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => {
          const task = tasks.find((row) => row.id === editor.taskId)
          if (task) { void setArchived(task, true).then(() => setEditor(null)) }
        }}>Archiwizuj zadanie</button>}
      </form>
    </AppFormSheet>}
    {error && <div className="cleaning-inline-error" role="alert">{error} <button type="button" className="cleaning-task-link" disabled={busy} onClick={() => setReload((v) => v + 1)}>Odśwież</button></div>}
    {loading ? <div className="cleaning-status-message" role="status">Wczytywanie zadań…</div> : (
      <>
        {!activeTasks.length && doneTasks.length === 0 && <div className="cleaning-empty-state"><span className="cleaning-empty-icon"><KitchenIcon name="check" size={23}/></span><h3>Jeszcze nie ma zadań</h3><p>Dodaj pierwsze zadanie do tego pomieszczenia.</p></div>}
        <div className="cleaning-task-list">{activeTasks.map(renderTask)}</div>
        {doneTasks.length > 0 && <section className="cleaning-archived-section" aria-label="Zrobione zadania">
          <button type="button" className="cleaning-archived-toggle" aria-expanded={showDone} onClick={() => setShowDone((value) => !value)}>
            Zrobione ({doneTasks.length}) <KitchenIcon name={showDone ? 'chevronUp' : 'chevronDown'} size={17}/>
          </button>
          {showDone && <div className="cleaning-task-list">{doneTasks.map(renderTask)}</div>}
        </section>}
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
