import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { sb } from '../../lib/supabaseClient';
import { CATEGORIES, PRIORITY_DOT, categorizeTask, todayKey, dateToKey } from '../../lib/helpers';
import { CheckIcon } from '../ui/Icons';
import { burstConfetti, playSuccessSound } from '../../lib/effects';

function formatDateLabel(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  const today = todayKey();
  if (dateKey === today) return 'Hoje';
  const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function TaskForm({ editing, defaultDate, onCancel, onSaved }) {
  const { saveTask } = useAppData();
  const [title, setTitle] = useState(editing?.title || '');
  const [date, setDate] = useState(editing?.date_key || defaultDate);
  const [start, setStart] = useState(editing?.start_time || '');
  const [end, setEnd] = useState(editing?.end_time || '');
  const [category, setCategory] = useState(editing?.category || 'Geral');
  const [priority, setPriority] = useState(editing?.priority || 'media');

  async function handleSave() {
    if (!title.trim()) return;
    await saveTask(editing?.id || null, { title: title.trim(), date_key: date, start_time: start, end_time: end, category, priority });
    onSaved(date);
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Nome da tarefa" value={title} onChange={e => setTitle(e.target.value)} />
      <div className="two">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
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

function SubtaskPanel({ task, subs, onChanged }) {
  const { user } = useAppData();
  const [newTitle, setNewTitle] = useState('');

  async function handleAdd() {
    if (!newTitle.trim()) return;
    await sb.from('subtasks').insert({ user_id: user.id, task_id: task.id, title: newTitle.trim(), done: false });
    setNewTitle('');
    onChanged();
  }
  async function toggle(s) {
    await sb.from('subtasks').update({ done: !s.done }).eq('id', s.id);
    onChanged();
  }
  async function remove(id) {
    await sb.from('subtasks').delete().eq('id', id);
    onChanged();
  }

  return (
    <div className="subtask-panel">
      <div className="subtask-list">
        {subs.map(s => (
          <div key={s.id} className={`subtask-row ${s.done ? 'done' : ''}`}>
            <button className={`check small ${s.done ? 'checked' : ''}`} onClick={() => toggle(s)}><CheckIcon /></button>
            <span className="subtask-title">{s.title}</span>
            <button className="del-btn" onClick={() => remove(s.id)}>×</button>
          </div>
        ))}
        <div className="subtask-add">
          <input type="text" placeholder="+ Adicionar subtarefa" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button type="button" className="subtask-save-btn" onClick={handleAdd}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function RescheduleRow({ task, onReschedule, onCancel }) {
  const [date, setDate] = useState(task.date_key);
  return (
    <div className="reschedule-row">
      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <button className="subtask-save-btn" onClick={() => onReschedule(task.id, date)}>Mover</button>
      <button className="del-btn" onClick={onCancel}>×</button>
    </div>
  );
}

function TaskRow({ task, subs, isToday, onEdit, onChanged }) {
  const { toggleTask, deleteTask, rescheduleTask } = useAppData();
  const [subOpen, setSubOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const subsDone = subs.filter(s => s.done).length;

  async function handleToggle(evt) {
    const rect = evt.currentTarget.getBoundingClientRect();
    const willBeDone = await toggleTask(task);
    if (willBeDone) { burstConfetti(rect.x, rect.y); playSuccessSound(); }
    onChanged();
  }

  async function handleReschedule(id, newDate) {
    await rescheduleTask(id, newDate);
    setRescheduling(false);
    onChanged();
  }

  return (
    <>
      <div className={`row ${task.done ? 'done' : ''}`}>
        <button className={`check ${task.done ? 'checked' : ''}`} onClick={handleToggle}><CheckIcon /></button>
        <div className="row-body">
          <div className="title">{PRIORITY_DOT[task.priority || 'media']} <span className="category-tag">{task.category || 'Geral'}</span>{task.title}</div>
          <div className="meta">{task.start_time || '--:--'}{task.end_time ? ` - ${task.end_time}` : ''}{subs.length ? ` · 📋 ${subsDone}/${subs.length}` : ''}</div>
        </div>
        {!task.done && !isToday && <button className="edit-btn" onClick={() => setRescheduling(o => !o)}>📅</button>}
        <button className="edit-btn" onClick={() => setSubOpen(o => !o)}>📋</button>
        <button className="edit-btn" onClick={() => onEdit(task)}>✎</button>
        <button className="del-btn" onClick={() => { if (confirm(`Apagar a tarefa "${task.title}"?`)) { deleteTask(task.id); onChanged(); } }}>×</button>
      </div>
      {rescheduling && <RescheduleRow task={task} onReschedule={handleReschedule} onCancel={() => setRescheduling(false)} />}
      {subOpen && <SubtaskPanel task={task} subs={subs} onChanged={onChanged} />}
    </>
  );
}

export default function RotinaView() {
  const { user } = useAppData();
  const [viewedDate, setViewedDate] = useState(todayKey());
  const [viewedTasks, setViewedTasks] = useState([]);
  const [subtasksByTask, setSubtasksByTask] = useState({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadDay = useCallback(async (dateKey) => {
    const { data: tasksData } = await sb.from('tasks').select('*').eq('user_id', user.id).eq('date_key', dateKey).order('start_time');
    const list = tasksData || [];
    setViewedTasks(list);
    if (list.length) {
      const { data: subsData } = await sb.from('subtasks').select('*').eq('user_id', user.id).in('task_id', list.map(t => t.id)).order('created_at');
      const grouped = {};
      (subsData || []).forEach(s => { grouped[s.task_id] = grouped[s.task_id] || []; grouped[s.task_id].push(s); });
      setSubtasksByTask(grouped);
    } else {
      setSubtasksByTask({});
    }
  }, [user]);

  useEffect(() => { loadDay(viewedDate); }, [viewedDate, loadDay]);

  function changeDay(deltaDays) {
    const d = new Date(viewedDate + 'T12:00:00');
    d.setDate(d.getDate() + deltaDays);
    setViewedDate(dateToKey(d));
  }
  function goToday() { setViewedDate(todayKey()); }

  const isToday = viewedDate === todayKey();
  const nowHHMM = new Date().toTimeString().slice(0, 5);

  const groups = useMemo(() => {
    if (isToday) {
      const g = { inprogress: [], overdue: [], upcoming: [], done: [] };
      viewedTasks.forEach(t => g[categorizeTask(t, nowHHMM)].push(t));
      Object.keys(g).forEach(k => g[k].sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99')));
      return g;
    }
    if (viewedDate < todayKey()) {
      const pending = viewedTasks.filter(t => !t.done);
      const done = viewedTasks.filter(t => t.done);
      return { overdue: pending, done, inprogress: [], upcoming: [] };
    }
    const pending = viewedTasks.filter(t => !t.done);
    const done = viewedTasks.filter(t => t.done);
    pending.sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
    return { upcoming: pending, done, inprogress: [], overdue: [] };
  }, [viewedTasks, isToday, viewedDate, nowHHMM]);

  const nextTask = isToday ? [...groups.inprogress, ...groups.upcoming][0] : null;

  const sections = isToday
    ? [
        { key: 'inprogress', label: '🔄 Em progresso' },
        { key: 'overdue', label: '⚠️ Atrasadas' },
        { key: 'upcoming', label: '⏰ Próximas' },
        { key: 'done', label: '✅ Concluídas' },
      ]
    : viewedDate < todayKey()
    ? [
        { key: 'overdue', label: '⚠️ Não realizadas' },
        { key: 'done', label: '✅ Concluídas' },
      ]
    : [
        { key: 'upcoming', label: '📅 Planejadas' },
        { key: 'done', label: '✅ Concluídas' },
      ];

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(task) { setEditing(task); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditing(null); }
  function afterSave(savedDate) {
    setFormOpen(false); setEditing(null);
    if (savedDate === viewedDate) loadDay(viewedDate);
    else setViewedDate(savedDate);
  }

  return (
    <div className="view active">
      <div className="section-title">Tarefas <span className="count">{viewedTasks.length}</span></div>

      <div className="day-nav">
        <button className="cal-arrow" onClick={() => changeDay(-1)}>‹</button>
        <div className="day-nav-label">
          {formatDateLabel(viewedDate)}
          {!isToday && <button className="day-nav-today" onClick={goToday}>Hoje</button>}
        </div>
        <button className="cal-arrow" onClick={() => changeDay(1)}>›</button>
      </div>

      {isToday && nextTask && (
        <div className="next-task-card">
          <div className="next-task-label">🎯 Próxima tarefa</div>
          <div className="next-task-title">{nextTask.title}</div>
          <div className="next-task-meta">{nextTask.start_time || '--:--'}{nextTask.end_time ? ` - ${nextTask.end_time}` : ''}</div>
        </div>
      )}

      {!formOpen && <button className="add-toggle" onClick={openNew}>+ Nova tarefa</button>}
      {formOpen && <TaskForm editing={editing} defaultDate={viewedDate} onCancel={closeForm} onSaved={afterSave} />}

      {viewedTasks.length === 0 ? (
        <div className="empty">Nenhuma tarefa para esse dia. Adicione uma acima.</div>
      ) : (
        sections.filter(s => groups[s.key] && groups[s.key].length).map(s => (
          <div className="routine-group" key={s.key}>
            <div className={`routine-group-header ${s.key}`}>{s.label}</div>
            <div className="routine-group-body">
              {groups[s.key].map(t => (
                <TaskRow key={t.id} task={t} subs={subtasksByTask[t.id] || []} isToday={isToday} onEdit={openEdit} onChanged={() => loadDay(viewedDate)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
