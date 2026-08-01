import { useState, useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { CATEGORIES, PRIORITY_DOT, categorizeTask } from '../../lib/helpers';
import { CheckIcon } from '../ui/Icons';
import { burstConfetti, playSuccessSound } from '../../lib/effects';

function TaskForm({ editing, onCancel }) {
  const { saveTask } = useAppData();
  const [title, setTitle] = useState(editing?.title || '');
  const [start, setStart] = useState(editing?.start_time || '');
  const [end, setEnd] = useState(editing?.end_time || '');
  const [category, setCategory] = useState(editing?.category || 'Geral');
  const [priority, setPriority] = useState(editing?.priority || 'media');

  async function handleSave() {
    if (!title.trim()) return;
    await saveTask(editing?.id || null, { title: title.trim(), start_time: start, end_time: end, category, priority });
    onCancel();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Nome da tarefa" value={title} onChange={e => setTitle(e.target.value)} />
      <div className="two">
        <input type="time" value={start} onChange={e => setStart(e.target.value)} />
        <input type="time" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <select value={priority} onChange={e => setPriority(e.target.value)}>
        <option value="alta">🔴 Alta prioridade</option>
        <option value="media">🟡 Média prioridade</option>
        <option value="baixa">🟢 Baixa prioridade</option>
      </select>
      <div className="btn-row">
        <button className="btn" onClick={handleSave}>Salvar</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function SubtaskPanel({ task }) {
  const { subtasksByTask, addSubtask, toggleSubtask, deleteSubtask } = useAppData();
  const [newTitle, setNewTitle] = useState('');
  const subs = subtasksByTask[task.id] || [];

  async function handleAdd() {
    if (!newTitle.trim()) return;
    await addSubtask(task.id, newTitle.trim());
    setNewTitle('');
  }

  return (
    <div className="subtask-panel">
      <div className="subtask-list">
        {subs.map(s => (
          <div key={s.id} className={`subtask-row ${s.done ? 'done' : ''}`}>
            <button className={`check small ${s.done ? 'checked' : ''}`} onClick={() => toggleSubtask(s.id)}><CheckIcon /></button>
            <span className="subtask-title">{s.title}</span>
            <button className="del-btn" onClick={() => deleteSubtask(s.id)}>×</button>
          </div>
        ))}
        <div className="subtask-add">
          <input type="text" placeholder="+ Adicionar subtarefa" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onEdit }) {
  const { toggleTask, deleteTask, subtasksByTask } = useAppData();
  const [subOpen, setSubOpen] = useState(false);
  const subs = subtasksByTask[task.id] || [];
  const subsDone = subs.filter(s => s.done).length;

  async function handleToggle(evt) {
    const rect = evt.currentTarget.getBoundingClientRect();
    const willBeDone = await toggleTask(task.id);
    if (willBeDone) { burstConfetti(rect.x, rect.y); playSuccessSound(); }
  }

  return (
    <>
      <div className={`row ${task.done ? 'done' : ''}`}>
        <button className={`check ${task.done ? 'checked' : ''}`} onClick={handleToggle}><CheckIcon /></button>
        <div className="row-body">
          <div className="title">{PRIORITY_DOT[task.priority || 'media']} <span className="category-tag">{task.category || 'Geral'}</span>{task.title}</div>
          <div className="meta">{task.start_time || '--:--'}{task.end_time ? ` - ${task.end_time}` : ''}{subs.length ? ` · 📋 ${subsDone}/${subs.length}` : ''}</div>
        </div>
        <button className="edit-btn" onClick={() => setSubOpen(o => !o)}>📋</button>
        <button className="edit-btn" onClick={() => onEdit(task)}>✎</button>
        <button className="del-btn" onClick={() => { if (confirm(`Apagar a tarefa "${task.title}"?`)) deleteTask(task.id); }}>×</button>
      </div>
      {subOpen && <SubtaskPanel task={task} />}
    </>
  );
}

export default function RotinaView() {
  const { tasks } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const nowHHMM = new Date().toTimeString().slice(0, 5);
  const groups = useMemo(() => {
    const g = { inprogress: [], overdue: [], upcoming: [], done: [] };
    tasks.forEach(t => g[categorizeTask(t, nowHHMM)].push(t));
    Object.keys(g).forEach(k => g[k].sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99')));
    return g;
  }, [tasks, nowHHMM]);

  const nextTask = [...groups.inprogress, ...groups.upcoming][0];
  const sections = [
    { key: 'inprogress', label: '🔄 Em progresso' },
    { key: 'overdue', label: '⚠️ Atrasadas' },
    { key: 'upcoming', label: '⏰ Próximas' },
    { key: 'done', label: '✅ Concluídas' },
  ];

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(task) { setEditing(task); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditing(null); }

  return (
    <div className="view active">
      <div className="section-title">Tarefas de hoje <span className="count">{tasks.length}</span></div>

      {nextTask && (
        <div className="next-task-card">
          <div className="next-task-label">🎯 Próxima tarefa</div>
          <div className="next-task-title">{nextTask.title}</div>
          <div className="next-task-meta">{nextTask.start_time || '--:--'}{nextTask.end_time ? ` - ${nextTask.end_time}` : ''}</div>
        </div>
      )}

      {!formOpen && <button className="add-toggle" onClick={openNew}>+ Nova tarefa</button>}
      {formOpen && <TaskForm editing={editing} onCancel={closeForm} />}

      {tasks.length === 0 ? (
        <div className="empty">Nenhuma tarefa para hoje. Adicione uma acima.</div>
      ) : (
        sections.filter(s => groups[s.key].length).map(s => (
          <div className="routine-group" key={s.key}>
            <div className={`routine-group-header ${s.key}`}>{s.label}</div>
            <div className="routine-group-body">
              {groups[s.key].map(t => <TaskRow key={t.id} task={t} onEdit={openEdit} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
