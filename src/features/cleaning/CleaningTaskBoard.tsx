import { useEffect, useRef, useState, type FormEvent } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { toUserErrorMessage } from '../../lib/userError'
import type { CleaningRoom } from './cleaningRooms'
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
    setEditor({ mode: 'new' }); setTitle(''); setNotes(''); setDueDate(todayWarsaw()); setError('')
  }
  function openEdit(task: CleaningTask) {
    setEditor({ mode: 'edit', taskId: task.id }); setTitle(task.title); setNotes(task.notes)
    setDueDate(task.nextDueDate); setError('')
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || room.isArchived || !editor) return
    setBusy(true); setError('')
    try {
      const updated = editor.mode === 'new'
        ? await createCleaningTask(room.id, title, notes, dueDate)
        : await updateCleaningTask(editor.taskId, title, notes, dueDate)
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
      upsert(updated)
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
    const canChange = !room.isArchived && !task.isArchived && !task.isCompleted
    return (
      <div className={`cleaning-task-card${task.isCompleted ? ' is-done' : ''}`} key={task.id}>
        <label className="cleaning-task-main">
          <input type="checkbox" checked={task.isCompleted} disabled={!canChange || busy}
            onChange={() => { void complete(task) }} aria-label={`Oznacz jako wykonane: ${task.title}`} />
          <span className="cleaning-task-description"><strong>{task.title}</strong>
            {task.notes && <span>{task.notes}</span>}
            <small>{task.isCompleted ? 'Wykonane' : `Jednorazowe · termin ${formatCleaningDate(task.nextDueDate)}`}</small>
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
            <ul>{history.map((entry) => <li key={entry.id}>Wykonano: {formatCleaningDate(entry.completedLocalDate)} <span>· pierwotny termin {formatCleaningDate(entry.dueDateBefore)}</span></li>)}</ul>
          )}
        </div>}
      </div>
    )
  }

  return <section className="cleaning-tasks" aria-label={`Zadania — ${room.name}`}>
    <div className="cleaning-section-title"><h2>Zadania</h2><span className="cleaning-section-note">{activeTasks.filter((t) => !t.isCompleted).length} do zrobienia</span></div>
    {!room.isArchived && !editor && <button type="button" className="cleaning-action cleaning-add-room" onClick={openNew}><KitchenIcon name="plus" size={17}/> Dodaj zadanie</button>}
    {editor && <form className="cleaning-room-editor" onSubmit={(event) => { void submitTask(event) }}>
      <h2>{editor.mode === 'new' ? 'Nowe zadanie' : 'Edytuj zadanie'}</h2>
      <label htmlFor="cleaning-task-title">Nazwa zadania</label>
      <input id="cleaning-task-title" type="text" maxLength={120} value={title} required disabled={busy}
        onChange={(event) => setTitle(event.target.value)} placeholder="np. Wypierz ręczniki" />
      <label htmlFor="cleaning-task-notes">Notatka (opcjonalnie)</label>
      <textarea id="cleaning-task-notes" maxLength={500} rows={3} value={notes} disabled={busy}
        onChange={(event) => setNotes(event.target.value)} placeholder="np. 40°C, program delikatny" />
      <label htmlFor="cleaning-task-due">Termin wykonania (jednorazowo)</label>
      <input id="cleaning-task-due" type="date" required value={dueDate} disabled={busy}
        onChange={(event) => setDueDate(event.target.value)} />
      <p className="cleaning-task-hint">Powtarzanie dodamy w H4. Ukończone zadanie zachowamy w historii.</p>
      <div className="cleaning-editor-actions"><button type="button" className="cleaning-secondary-button" disabled={busy} onClick={() => { setEditor(null); setError('') }}>Anuluj</button>
        <button type="submit" className="cleaning-action" disabled={busy || !title.trim() || !dueDate}>{busy ? 'Zapisywanie…' : 'Zapisz zadanie'}</button></div>
    </form>}
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
