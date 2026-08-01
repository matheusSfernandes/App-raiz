import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { CATEGORIES, DAY_LETTERS, todayKey } from '../../lib/helpers';
import { CheckIcon } from '../ui/Icons';
import { burstConfetti, playSuccessSound } from '../../lib/effects';

function HabitForm({ editing, onCancel }) {
  const { saveHabit } = useAppData();
  const [name, setName] = useState(editing?.name || '');
  const [time, setTime] = useState(editing?.time || '');
  const [category, setCategory] = useState(editing?.category || 'Geral');
  const [days, setDays] = useState(editing?.days_of_week || [0, 1, 2, 3, 4, 5, 6]);

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function handleSave() {
    if (!name.trim() || !days.length) return;
    await saveHabit(editing?.id || null, { name: name.trim(), time, category, days_of_week: days });
    onCancel();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Nome do hábito" value={name} onChange={e => setName(e.target.value)} />
      <input type="time" value={time} onChange={e => setTime(e.target.value)} />
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <div className="day-picker">
        {DAY_LETTERS.map((letter, i) => (
          <button type="button" key={i} className={`day-chip ${days.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{letter}</button>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn" onClick={handleSave}>Salvar</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function HabitRow({ habit, onEdit }) {
  const { toggleHabit, deleteHabit } = useAppData();
  const today = todayKey();
  const days = habit.days_of_week || [0, 1, 2, 3, 4, 5, 6];
  const scheduledToday = days.includes(new Date().getDay());
  const daysLabel = days.length === 7 ? 'Todo dia' : days.map(d => DAY_LETTERS[d]).join(' ');
  const done = habit.last_done === today;

  async function handleToggle(evt) {
    if (!scheduledToday) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    const confettiOk = await toggleHabit(habit.id);
    if (confettiOk) { burstConfetti(rect.x, rect.y); playSuccessSound(); }
  }

  return (
    <div className={`row ${done ? 'done' : ''}`} style={!scheduledToday ? { opacity: .55 } : undefined}>
      <button className={`check ${done ? 'checked' : ''}`} disabled={!scheduledToday}
        style={!scheduledToday ? { cursor: 'not-allowed', opacity: .4 } : undefined}
        onClick={handleToggle}><CheckIcon /></button>
      <div className="row-body">
        <div className="title"><span className="category-tag">{habit.category || 'Geral'}</span>{habit.name}</div>
        <div className="meta">{habit.time || 'sem horário'} · {daysLabel}</div>
      </div>
      <div className="streak-pill">🔥 {habit.streak}</div>
      <button className="edit-btn" onClick={() => onEdit(habit)}>✎</button>
      <button className="del-btn" onClick={() => { if (confirm(`Apagar o hábito "${habit.name}"? Isso também apaga o histórico dele.`)) deleteHabit(habit.id); }}>×</button>
    </div>
  );
}

export default function HabitosView() {
  const { habits } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(h) { setEditing(h); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditing(null); }

  return (
    <div className="view active">
      <div className="section-title">Meus hábitos <span className="count">{habits.length}</span></div>
      {!formOpen && <button className="add-toggle" onClick={openNew}>+ Novo hábito</button>}
      {formOpen && <HabitForm editing={editing} onCancel={closeForm} />}
      {habits.length === 0 ? (
        <div className="empty">Nenhum hábito ainda. Crie o primeiro acima.</div>
      ) : (
        habits.map(h => <HabitRow key={h.id} habit={h} onEdit={openEdit} />)
      )}
    </div>
  );
}
