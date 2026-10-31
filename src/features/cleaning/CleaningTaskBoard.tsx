import { useEffect, useState, type FormEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { AppFormSheet } from '../../components/AppFormSheet'
import { CompactQuantityStepper } from '../quantity/CompactQuantityStepper'
import { useCleaningTaskCompletion } from './useCleaningTaskCompletion'
import { useCleaningTaskUndo } from './useCleaningTaskUndo'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
import { cleaningDueStatus, cleaningRecurrenceOptions, recurrenceBounds, recurrenceLabel, type CleaningRecurrenceKind } from './cleaningRecurrence'
import {
  createCleaningTask, deleteCleaningTask, formatCleaningDate, loadCleaningTasks,
  sortCleaningTasks, todayWarsaw, updateCleaningTask,
  type CleaningTask,
} from './cleaningTasks'

type EditorState = { mode: 'new' } | { mode: 'edit'; taskId: string } | null
type Props = { ownerId: string; room: CleaningRoom; onChanged: () => void }

export function CleaningTaskBoard({ ownerId, room, onChanged }: Props) {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<EditorState>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState(todayWarsaw())
  const [recurrenceKind, setRecurrenceKind] = useState<CleaningRecurrenceKind>('once')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [showLegacyArchived, setShowLegacyArchived] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { run: runCompletion, busyId, inFlight } = useCleaningTaskCompletion()
  const { undo: runUndo, clear: clearUndo, undoBusyId, inFlightUndo } = useCleaningTaskUndo()
  const [reload, setReload] = useState(0)
  const mountedRoomId = room.id

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    setTasks([])
    setEditor(null)
    setJustCompletedId(null)
    loadCleaningTasks(ownerId, mountedRoomId).then((results) => {
      if (active) { setTasks(results); setLoading(false) }
    }).catch((cause: unknown) => {
      if (active) { setLoadError(toUserErrorMessage(cause, 'Nie udało się pobrać zadań.')); setLoading(false) }
    })
    return () => { active = false }
  }, [ownerId, mountedRoomId, reload])

  const activeTasks = tasks.filter((task) => !task.isArchived && !task.isCompleted)
  const doneTasks = tasks.filter((task) => !task.isArchived && task.isCompleted && task.recurrenceKind === 'once')
  const archivedTasks = tasks.filter((task) => task.isArchived)
  function upsert(updated: CleaningTask) {
    setTasks((previous) => sortCleaningTasks([...previous.filter((task) => task.id !== updated.id), updated]))
    onChanged()
  }
  function openNew() {
    setEditor({ mode: 'new' }); setTitle(''); setNotes(''); setDueDate(todayWarsaw())
    setRecurrenceKind('once'); setRecurrenceInterval(1); setFormError('')
  }
  function openEdit(task: CleaningTask) {
    setEditor({ mode: 'edit', taskId: task.id }); setTitle(task.title); setNotes(task.notes)
    setDueDate(task.nextDueDate); setRecurrenceKind(task.recurrenceKind)
    setRecurrenceInterval(task.recurrenceInterval ?? 1); setFormError(''); setJustCompletedId(null)
  }
  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || inFlight.current || inFlightUndo.current || room.isArchived || !editor) return
    setBusy(true); setFormError('')
    try {
      const interval = recurrenceKind === 'once' ? null : recurrenceInterval
      const updated = editor.mode === 'new'
        ? await createCleaningTask(room.id, title, notes, dueDate, recurrenceKind, interval)
        : await updateCleaningTask(editor.taskId, tasks.find((task) => task.id === editor.taskId)?.cycleGeneration ?? -1,
          title, notes, dueDate, recurrenceKind, interval)
      setJustCompletedId(null); upsert(updated); setEditor(null); setFeedback('Zapisano zadanie.')
    } catch (cause: unknown) {
      setFormError(toUserErrorMessage(cause, 'Nie udało się zapisać zadania.'))
    } finally { setBusy(false) }
  }
  async function complete(task: CleaningTask) {
    if (busy || inFlight.current || inFlightUndo.current || task.isCompleted || task.isArchived || room.isArchived) return
    setActionError(''); setFeedback('')
    try {
      const updated = await runCompletion(task)
      if (!updated) return
      setJustCompletedId(task.id)
      if (updated.isCompleted) setShowDone(true)
      upsert(updated)
      setFeedback(updated.isCompleted ? `Zrobione: ${task.title}. Możesz cofnąć wykonanie.` : `Zrobione: ${task.title}. Możesz cofnąć ostatnie wykonanie.`)
    } catch (cause: unknown) {
      setActionError(toUserErrorMessage(cause, 'Nie udało się potwierdzić wykonania. Możesz ponowić operację.'))
    }
  }
  async function undo(task: CleaningTask) {
    if (busy || inFlight.current || inFlightUndo.current || task.isArchived || room.isArchived || !task.lastCompletedAt) return
    setBusy(true); setActionError(''); setFeedback('')
    try {
      const updated = await runUndo(task)
      if (!updated) return
      setJustCompletedId(null)
      upsert(updated)
      setFeedback(`Cofnięto wykonanie: ${task.title}.`)
    } catch (cause: unknown) {
      setActionError(toUserErrorMessage(cause, 'Nie udało się cofnąć wykonania.'))
    } finally { setBusy(false) }
  }
  async function remove(task: CleaningTask) {
    if (busy || inFlight.current || inFlightUndo.current) return
    setBusy(true); setActionError(''); setFormError('')
    try {
      await deleteCleaningTask(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
      clearUndo(task.id)
      setConfirmDeleteId(null); setEditor(null)
      setFeedback(`Usunięto zadanie: ${task.title}.`)
      onChanged()
    } catch (cause: unknown) {
      // A lost network reply may mean the delete actually committed. Reconcile before retry.
      try {
        const current = await loadCleaningTasks(ownerId, room.id)
        if (!current.some((item) => item.id === task.id)) {
          setTasks(current); setConfirmDeleteId(null); setEditor(null)
          setFeedback(`Usunięto zadanie: ${task.title}.`); onChanged(); return
        }
      } catch { /* Keep the confirmation open; never infer a successful delete. */ }
      setFormError(toUserErrorMessage(cause, 'Nie udało się usunąć zadania.'))
      setActionError(toUserErrorMessage(cause, 'Nie udało się usunąć zadania.'))
    } finally { setBusy(false) }
  }
  function renderDeleteConfirm(task: CleaningTask) {
    if (confirmDeleteId !== task.id) return null
    return <div className="cleaning-delete-confirm" role="group" aria-label={`Usuwanie zadania: ${task.title}`}>
      <p>Trwale usunąć „{task.title}” i wszystkie jego wykonania?</p>
      <div className="sheet-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => setConfirmDeleteId(null)}>Anuluj</button>
        <button type="button" className="cleaning-subtle-danger" disabled={busy || inFlight.current} onClick={() => { void remove(task) }}>{busy ? 'Usuwanie…' : 'Usuń na stałe'}</button>
      </div>
    </div>
  }
  function renderTask(task: CleaningTask) {
    const due = cleaningDueStatus(task.nextDueDate, todayWarsaw())
    const repeating = task.recurrenceKind !== 'once'
    const canEdit = !room.isArchived && !task.isArchived && !task.isCompleted
    const canUndo = !room.isArchived && !task.isArchived && Boolean(task.lastCompletedAt)
    const showChecked = task.isCompleted || (repeating && justCompletedId === task.id)
    return <article className={`cleaning-task-card${task.isCompleted ? ' is-done' : ''}`} key={task.id}>
      <div className="cleaning-task-main">
        <div className="cleaning-task-leading">
          <label className="cleaning-task-checkbox-hit">
            <input type="checkbox" checked={showChecked} disabled={busy || busyId !== null || undoBusyId !== null || room.isArchived || task.isArchived}
              aria-label={showChecked ? `Cofnij wykonanie: ${task.title}` : `Oznacz jako wykonane: ${task.title}`}
              onChange={() => { if (showChecked) { void undo(task) } else { void complete(task) } }} />
          </label>
          {!task.isCompleted && !task.isArchived && (showChecked
            ? <span className="cleaning-due-status is-today">Zrobione</span>
            : <span className={`cleaning-due-status is-${due.kind}`}>{due.text}</span>)}
        </div>
        {canEdit ? <button type="button" className="cleaning-task-detail-button" onClick={() => openEdit(task)} disabled={busy || busyId !== null || undoBusyId !== null} aria-label={`Edytuj zadanie: ${task.title}`}>
          <strong>{task.title}</strong>
          {task.notes && <span>{task.notes}</span>}
          <small>{recurrenceLabel(task.recurrenceKind, task.recurrenceInterval)}{!repeating && due.kind !== 'today' ? ` · Termin: ${formatCleaningDate(task.nextDueDate)}` : ''}</small>
        </button> : <div className="cleaning-task-description">
          <strong>{task.title}</strong>{task.notes && <span>{task.notes}</span>}
          <small>{task.isCompleted ? 'Zrobione' : recurrenceLabel(task.recurrenceKind, task.recurrenceInterval)}</small>
        </div>}
      </div>
      {!room.isArchived && !task.isArchived && canUndo && !showChecked && <button type="button" className="cleaning-task-link cleaning-undo-link" disabled={busy || busyId !== null || undoBusyId !== null} onClick={() => { void undo(task) }}>Cofnij ostatnie wykonanie</button>}
      {(task.isCompleted || task.isArchived) && <button type="button" className="cleaning-task-link cleaning-delete-link" disabled={busy || busyId !== null || undoBusyId !== null} onClick={() => { setConfirmDeleteId(task.id); setActionError(''); setFormError('') }}>Usuń zadanie</button>}
      {!editor && renderDeleteConfirm(task)}
    </article>
  }
  const editedTask = editor?.mode === 'edit' ? tasks.find((task) => task.id === editor.taskId) : null
  const unit = recurrenceKind === 'every_days' ? 'dni' : recurrenceKind === 'every_weeks' ? 'tygodnie' : 'miesiące'

  return <section className="cleaning-tasks" aria-label={`Zadania — ${room.name}`}>
    <div className="page-heading-row cleaning-tasks-heading">
      <h2>Zadania</h2>
      {!room.isArchived && <div className="page-actions"><button className="primary-icon-button" type="button" onClick={openNew} disabled={busy || busyId !== null || undoBusyId !== null} aria-label="Dodaj zadanie" title="Dodaj zadanie"><KitchenIcon name="plus" /></button></div>}
    </div>
    {editor && <AppFormSheet titleId="cleaning-task-editor-title" title={editor.mode === 'new' ? 'Nowe zadanie' : 'Edytuj zadanie'}
      kicker="POMIESZCZENIE" busy={busy} onClose={() => { setEditor(null); setFormError(''); setActionError(''); setConfirmDeleteId(null) }} className="cleaning-editor-sheet">
      <form className="cleaning-room-editor inventory-form" onSubmit={(event) => { void submitTask(event) }}>
        <div className="form-field"><label htmlFor="cleaning-task-title">Nazwa zadania</label>
          <input id="cleaning-task-title" type="text" maxLength={120} value={title} required disabled={busy}
            onChange={(event) => setTitle(event.target.value)} placeholder="np. Wypierz ręczniki" /></div>
        <div className="form-field"><label htmlFor="cleaning-task-notes">Notatka (opcjonalnie)</label>
          <textarea id="cleaning-task-notes" maxLength={500} rows={3} value={notes} disabled={busy}
            onChange={(event) => setNotes(event.target.value)} placeholder="np. 40°C, program delikatny" /></div>
        <div className="form-field"><label htmlFor="cleaning-task-due">{recurrenceKind === 'once' ? 'Termin wykonania' : 'Pierwszy termin wykonania'}</label>
          <div className="cleaning-date-field"><input id="cleaning-task-due" type="date" required value={dueDate} disabled={busy}
            onChange={(event) => setDueDate(event.target.value)} /><span className="cleaning-date-icon" aria-hidden="true"><KitchenIcon name="calendar" size={20}/></span></div></div>
        <div className="cleaning-recurrence-controls">
          <div className="form-field"><label htmlFor="cleaning-task-recurrence">Powtarzanie</label>
            <select id="cleaning-task-recurrence" value={recurrenceKind} disabled={busy}
              onChange={(event) => { setRecurrenceKind(event.target.value as CleaningRecurrenceKind); setRecurrenceInterval(1) }}>
              {cleaningRecurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></div>
          {recurrenceKind !== 'once' && <div className="form-field cleaning-recurrence-count">
            <label htmlFor="cleaning-task-interval">Co ile</label>
            <CompactQuantityStepper ariaLabel="Częstotliwość powtarzania"
              value={<input id="cleaning-task-interval" type="number" inputMode="numeric"
                min={recurrenceBounds(recurrenceKind)?.min} max={recurrenceBounds(recurrenceKind)?.max}
                step="1" required value={recurrenceInterval} disabled={busy}
                aria-label={`Powtarzaj co, liczba ${unit}`}
                onChange={(event) => setRecurrenceInterval(Number(event.target.value))} />} busy={busy}
              decrementDisabled={recurrenceInterval <= (recurrenceBounds(recurrenceKind)?.min ?? 1)}
              incrementDisabled={recurrenceInterval >= (recurrenceBounds(recurrenceKind)?.max ?? 1)}
              onDecrement={() => setRecurrenceInterval((value) => Math.max(recurrenceBounds(recurrenceKind)?.min ?? 1, value - 1))}
              onIncrement={() => setRecurrenceInterval((value) => Math.min(recurrenceBounds(recurrenceKind)?.max ?? 1, value + 1))} />
          </div>}
        </div>
        {recurrenceKind !== 'once' && <p className="cleaning-recurrence-summary" aria-live="polite">{recurrenceLabel(recurrenceKind, recurrenceInterval)}</p>}
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="sheet-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => { setEditor(null); setFormError(''); setConfirmDeleteId(null) }}>Anuluj</button>
          <button type="submit" className="primary-button" disabled={busy || !title.trim() || !dueDate || (recurrenceKind !== 'once' && (!Number.isInteger(recurrenceInterval) || recurrenceInterval < (recurrenceBounds(recurrenceKind)?.min ?? 1) || recurrenceInterval > (recurrenceBounds(recurrenceKind)?.max ?? 1)))}>{busy ? 'Zapisywanie…' : 'Zapisz zadanie'}</button>
        </div>
        {editedTask && <div className="cleaning-editor-delete">
          <button type="button" className="cleaning-task-link cleaning-delete-link" disabled={busy} onClick={() => { setFormError(''); setConfirmDeleteId(editedTask.id) }}>Usuń zadanie</button>
          {renderDeleteConfirm(editedTask)}
        </div>}
      </form>
    </AppFormSheet>}
    {feedback && <div className="cleaning-feedback" role="status">{feedback}</div>}
    {!editor && actionError && <div className="cleaning-inline-error" role="alert">{actionError} <button type="button" className="cleaning-task-link" onClick={() => setReload((v) => v + 1)}>Odśwież</button></div>}
    {loading ? <div className="cleaning-status-message" role="status">Wczytywanie zadań…</div>
      : loadError ? <div className="cleaning-inline-error" role="alert">{loadError} <button className="cleaning-task-link" type="button" onClick={() => setReload((v) => v + 1)}>Ponów</button></div>
      : <>
        {!activeTasks.length && !doneTasks.length && !archivedTasks.length && <p className="cleaning-empty-compact">{room.isArchived ? 'Brak zadań w tym pomieszczeniu.' : 'Brak zadań.'}</p>}
        <div className="cleaning-task-list">{activeTasks.map(renderTask)}</div>
        {doneTasks.length > 0 && <section className="cleaning-archived-section" aria-label="Zrobione zadania">
          <button type="button" className="cleaning-archived-toggle" aria-expanded={showDone} onClick={() => setShowDone((value) => !value)}>
            Zrobione ({doneTasks.length}) <KitchenIcon name={showDone ? 'chevronUp' : 'chevronDown'} size={17}/>
          </button>
          {showDone && <div className="cleaning-task-list">{doneTasks.map(renderTask)}</div>}
        </section>}
        {archivedTasks.length > 0 && <section className="cleaning-archived-section" aria-label="Ukryte stare zadania">
          <button type="button" className="cleaning-archived-toggle" aria-expanded={showLegacyArchived} onClick={() => setShowLegacyArchived((value) => !value)}>
            Ukryte zadania ({archivedTasks.length}) <KitchenIcon name={showLegacyArchived ? 'chevronUp' : 'chevronDown'} size={17}/>
          </button>
          {showLegacyArchived && <div className="cleaning-task-list">{archivedTasks.map(renderTask)}</div>}
        </section>}
      </>}
  </section>
}
