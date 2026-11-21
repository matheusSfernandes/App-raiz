import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { sb } from '../../lib/supabaseClient';
import { CATEGORIES, AREA_COLORS } from '../../lib/helpers';
import { loadGoals, goalProgress, deadlineLabel } from '../../lib/goals';
import { CheckIcon, PencilIcon, TrashIcon } from '../ui/Icons';
import { burstConfetti, playSuccessSound } from '../../lib/effects';

function GoalForm({ editing, onCancel, onSaved }) {
  const { user } = useAppData();
  const [title, setTitle] = useState(editing?.title || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [category, setCategory] = useState(editing?.category || 'Geral');
  const [hasDate, setHasDate] = useState(!!editing?.target_date);
  const [date, setDate] = useState(editing?.target_date || '');
  const [stepsText, setStepsText] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const fields = { title: title.trim(), notes: notes.trim() || null, category, target_date: hasDate && date ? date : null };
    if (editing) {
      await sb.from('goals').update(fields).eq('id', editing.id);
    } else {
      const { data: g } = await sb.from('goals').insert({ ...fields, user_id: user.id }).select().single();
      const steps = stepsText.split('\n').map(s => s.trim()).filter(Boolean);
      if (g && steps.length) {
        await sb.from('goal_steps').insert(steps.map((t, i) => ({ goal_id: g.id, user_id: user.id, title: t, sort: i })));
      }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Qual é a meta?" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} />
      <input type="text" placeholder="Por que ela importa (opcional)" value={notes} maxLength={200} onChange={e => setNotes(e.target.value)} />
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c === 'Geral' ? 'Área: Geral' : c}</option>)}
      </select>
      <label className="flag-check">
        <input type="checkbox" checked={hasDate} onChange={e => setHasDate(e.target.checked)} />
        <span>Tem prazo</span>
      </label>
      {hasDate && <div className="two"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>}
      {!editing && (
        <>
          <div className="form-label">Etapas (uma por linha, pode deixar para depois)</div>
          <textarea className="goal-steps-input" rows={4} placeholder={'Ex:\nPesquisar cursos\nFazer a matrícula\nConcluir o módulo 1'}
            value={stepsText} onChange={e => setStepsText(e.target.value)} />
        </>
      )}
      <div className="btn-row">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn" onClick={save} disabled={!title.trim() || saving}>{editing ? 'Salvar' : 'Criar meta'}</button>
      </div>
    </div>
  );
}

function GoalCard({ goal, open, onToggleOpen, onChanged, onEdit }) {
  const { user, showToast } = useAppData();
  const [newStep, setNewStep] = useState('');
  const { total, done, pct } = goalProgress(goal);
  const deadline = deadlineLabel(goal);
  const color = AREA_COLORS[goal.category] || '#8E918A';
  const finished = !!goal.done_at;

  async function toggleStep(step, e) {
    const nowDone = !step.done;
    const r = e.currentTarget.getBoundingClientRect();
    await sb.from('goal_steps').update({ done: nowDone, done_at: nowDone ? new Date().toISOString() : null }).eq('id', step.id);
    if (nowDone) {
      playSuccessSound();
      if (done + 1 === total && !finished) {
        burstConfetti(r.left + r.width / 2, r.top);
        showToast('Todas as etapas feitas. Marque a meta como concluída quando quiser.');
      }
    }
    onChanged();
  }

  async function addStep() {
    const t = newStep.trim();
    if (!t) return;
    setNewStep('');
    const sort = goal.steps.length ? Math.max(...goal.steps.map(s => s.sort)) + 1 : 0;
    await sb.from('goal_steps').insert({ goal_id: goal.id, user_id: user.id, title: t, sort });
    onChanged();
  }

  async function removeStep(step) {
    await sb.from('goal_steps').delete().eq('id', step.id);
    onChanged();
  }

  async function toggleFinished(e) {
    const value = finished ? null : new Date().toISOString();
    const r = e.currentTarget.getBoundingClientRect();
    await sb.from('goals').update({ done_at: value }).eq('id', goal.id);
    if (!finished) {
      burstConfetti(r.left + r.width / 2, r.top);
      playSuccessSound();
      showToast('Meta concluída!');
    }
    onChanged();
  }

  async function removeGoal() {
    if (!window.confirm(`Excluir a meta "${goal.title}" e as etapas dela?`)) return;
    await sb.from('goals').delete().eq('id', goal.id);
    onChanged();
  }

  return (
    <div className={`goal-item ${finished ? 'finished' : ''}`}>
      <button className="goal-head" onClick={onToggleOpen} aria-expanded={open}>
        <div className="goal-top">
          <span className="goal-title">{goal.title}</span>
          <span className="goal-pct">{pct}%</span>
        </div>
        <div className="mini-track"><div className="mini-fill" style={{ width: `${pct}%`, background: finished ? 'var(--accent)' : color }} /></div>
        <div className="goal-meta">
          <span className="area-dot" style={{ background: color }} />{goal.category}
          <span>· {total ? `${done} de ${total} etapas` : 'sem etapas'}</span>
          {finished
            ? <span>· concluída em {new Date(goal.done_at).toLocaleDateString('pt-BR')}</span>
            : deadline && <span className={deadline.late ? 'late' : ''}>· {deadline.text}</span>}
        </div>
      </button>

      {open && (
        <div className="goal-body">
          {goal.notes && <div className="goal-notes">{goal.notes}</div>}
          {goal.steps.map(s => (
            <div key={s.id} className={`goal-step ${s.done ? 'done' : ''}`}>
              <button className={`check ${s.done ? 'checked' : ''}`} onClick={e => toggleStep(s, e)} aria-label={s.done ? 'Desmarcar etapa' : 'Marcar etapa'}><CheckIcon /></button>
              <span className="goal-step-title">{s.title}</span>
              <button className="icon-btn" onClick={() => removeStep(s)} aria-label="Excluir etapa"><TrashIcon /></button>
            </div>
          ))}
          <div className="goal-add-step">
            <input type="text" placeholder="Nova etapa" value={newStep} maxLength={120}
              onChange={e => setNewStep(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addStep(); }} />
            <button className="btn" onClick={addStep} disabled={!newStep.trim()}>Adicionar</button>
          </div>
          <div className="goal-actions">
            <button className={`btn ${finished ? 'ghost' : ''}`} onClick={toggleFinished}>{finished ? 'Reabrir meta' : 'Marcar meta como concluída'}</button>
            <button className="icon-btn" onClick={onEdit} aria-label="Editar meta"><PencilIcon /></button>
            <button className="icon-btn" onClick={removeGoal} aria-label="Excluir meta"><TrashIcon /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetasView() {
  const { user } = useAppData();
  const [goals, setGoals] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showDone, setShowDone] = useState(false);

  const reload = useCallback(() => loadGoals(user.id).then(setGoals), [user.id]);
  useEffect(() => { reload(); }, [reload]);

  if (!goals) return <div className="view active"><div className="empty">Carregando metas...</div></div>;

  const active = goals.filter(g => !g.done_at).sort((a, b) => (a.target_date || '9999').localeCompare(b.target_date || '9999'));
  const finished = goals.filter(g => g.done_at).sort((a, b) => b.done_at.localeCompare(a.done_at));

  function closeForm() { setFormOpen(false); setEditing(null); }

  return (
    <div className="view active">
      <div className="section-title">Metas <span className="count">{active.length} em andamento</span></div>

      {(formOpen || editing) && (
        <GoalForm key={editing?.id || 'new'} editing={editing} onCancel={closeForm} onSaved={() => { closeForm(); reload(); }} />
      )}
      {!formOpen && !editing && <button className="add-toggle" onClick={() => setFormOpen(true)}>+ Nova meta</button>}

      {active.length === 0 && !formOpen && (
        <div className="empty">Uma meta grande fica mais fácil em etapas pequenas. Crie a primeira e divida em passos.</div>
      )}
      {active.map(g => (
        <GoalCard key={g.id} goal={g} open={openId === g.id} onToggleOpen={() => setOpenId(openId === g.id ? null : g.id)}
          onChanged={reload} onEdit={() => { setEditing(g); setFormOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      ))}

      {finished.length > 0 && (
        <>
          <button className="goal-done-toggle" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Ocultar' : 'Ver'} concluídas ({finished.length})
          </button>
          {showDone && finished.map(g => (
            <GoalCard key={g.id} goal={g} open={openId === g.id} onToggleOpen={() => setOpenId(openId === g.id ? null : g.id)}
              onChanged={reload} onEdit={() => { setEditing(g); setFormOpen(false); }} />
          ))}
        </>
      )}
    </div>
  );
}
