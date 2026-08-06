import { useState, useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { todayKey, PRIORITY_DOT } from '../../lib/helpers';
import { CheckIcon } from '../ui/Icons';

function ReminderForm({ editing, onCancel }) {
  const { saveReminder } = useAppData();
  const [title, setTitle] = useState(editing?.title || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [date, setDate] = useState(editing?.date_key || '');
  const [time, setTime] = useState(editing?.time || '');
  const [priority, setPriority] = useState(editing?.priority || 'none');
  const [flagged, setFlagged] = useState(editing?.flagged || false);

  async function handleSave() {
    if (!title.trim()) return;
    await saveReminder(editing?.id || null, {
      title: title.trim(),
      notes: notes.trim() || null,
      date_key: date || null,
      time: date ? (time || null) : null,
      priority,
      flagged,
    });
    onCancel();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
      <input type="text" placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="two">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} disabled={!date} />
      </div>
      <select value={priority} onChange={e => setPriority(e.target.value)}>
        <option value="none">Sem prioridade</option>
        <option value="alta">🔴 Alta prioridade</option>
        <option value="media">🟡 Média prioridade</option>
        <option value="baixa">🟢 Baixa prioridade</option>
      </select>
      <label className="flag-check">
        <input type="checkbox" checked={flagged} onChange={e => setFlagged(e.target.checked)} />
        <span>🚩 Fixar este lembrete</span>
      </label>
      <div className="btn-row">
        <button className="btn" onClick={handleSave}>Salvar</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function ReminderRow({ reminder, onEdit }) {
  const { toggleReminder, toggleReminderFlag, deleteReminder } = useAppData();
  const dateLabel = reminder.date_key
    ? new Date(reminder.date_key + 'T12:00:00').toLocaleDateString('pt-BR') + (reminder.time ? ` · ${reminder.time}` : '')
    : 'Sem data';

  return (
    <div className={`row ${reminder.done ? 'done' : ''}`}>
      <button className={`check ${reminder.done ? 'checked' : ''}`} onClick={() => toggleReminder(reminder.id)}><CheckIcon /></button>
      <div className="row-body">
        <div className="title">
          {reminder.priority !== 'none' && <>{PRIORITY_DOT[reminder.priority]} </>}
          {reminder.title}
        </div>
        <div className="meta">{dateLabel}{reminder.notes ? ` · ${reminder.notes}` : ''}</div>
      </div>
      <button className="edit-btn" onClick={() => toggleReminderFlag(reminder.id)} style={{ color: reminder.flagged ? 'var(--amber)' : undefined }}>🚩</button>
      <button className="edit-btn" onClick={() => onEdit(reminder)}>✎</button>
      <button className="del-btn" onClick={() => { if (confirm(`Apagar o lembrete "${reminder.title}"?`)) deleteReminder(reminder.id); }}>×</button>
    </div>
  );
}

export default function LembretesView() {
  const { reminders } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const groups = useMemo(() => {
    const today = todayKey();
    const pending = reminders.filter(r => !r.done);
    const done = reminders.filter(r => r.done);
    const flagged = pending.filter(r => r.flagged);
    const overdue = pending.filter(r => !r.flagged && r.date_key && r.date_key < today);
    const noDate = pending.filter(r => !r.flagged && !r.date_key);
    const upcoming = pending.filter(r => !r.flagged && r.date_key && r.date_key >= today);
    upcoming.sort((a, b) => (a.date_key + (a.time || '')).localeCompare(b.date_key + (b.time || '')));
    return { flagged, overdue, upcoming, noDate, done };
  }, [reminders]);

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(r) { setEditing(r); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditing(null); }

  const sections = [
    { key: 'flagged', label: '🚩 Fixados', list: groups.flagged, cls: 'inprogress' },
    { key: 'overdue', label: '⚠️ Atrasados', list: groups.overdue, cls: 'overdue' },
    { key: 'upcoming', label: '📅 Com data', list: groups.upcoming, cls: 'upcoming' },
    { key: 'noDate', label: '📌 Sem data', list: groups.noDate, cls: 'neutral' },
    { key: 'done', label: '✅ Concluídos', list: groups.done, cls: 'done' },
  ];

  return (
    <div className="view active">
      <div className="section-title">Lembretes <span className="count">{reminders.filter(r => !r.done).length}</span></div>
      {!formOpen && <button className="add-toggle" onClick={openNew}>+ Novo lembrete</button>}
      {formOpen && <ReminderForm editing={editing} onCancel={closeForm} />}

      {reminders.length === 0 ? (
        <div className="empty">Nenhum lembrete ainda. Adicione um acima.</div>
      ) : (
        sections.filter(s => s.list.length).map(s => (
          <div className="routine-group" key={s.key}>
            <div className={`routine-group-header ${s.cls}`}>{s.label}</div>
            <div className="routine-group-body">
              {s.list.map(r => <ReminderRow key={r.id} reminder={r} onEdit={openEdit} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
