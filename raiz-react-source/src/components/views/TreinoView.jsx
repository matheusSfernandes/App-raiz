import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { sb } from '../../lib/supabaseClient';
import { todayKey, formatKeyBR } from '../../lib/helpers';
import { CheckIcon, PencilIcon, TrashIcon } from '../ui/Icons';
import { LIMITS, toNum, maxMsg } from '../../lib/validate';
import { burstConfetti, playSuccessSound } from '../../lib/effects';

const DRAFT_KEY = 'raiz_treino_em_andamento';

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}
function saveDraft(d) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch { /* ignore */ }
}
function fmtKg(n) {
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/* ---------- Modelos ---------- */

function PlanForm({ editing, onCancel, onSaved }) {
  const { user } = useAppData();
  const [name, setName] = useState(editing?.name || '');
  const [rows, setRows] = useState(
    editing?.exercises?.length
      ? editing.exercises.map(e => ({ name: e.name, sets: e.target_sets, reps: e.target_reps }))
      : [{ name: '', sets: 3, reps: 10 }]
  );
  const [saving, setSaving] = useState(false);
  const lock = useRef(false); // trava imediata contra cliques no mesmo instante

  function setRow(i, key, value) {
    setRows(r => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  const [tried, setTried] = useState(false);
  const clean = rows.filter(r => r.name.trim());
  const over = clean.some(r => toNum(r.sets) > LIMITS.sets) ? maxMsg('Séries', LIMITS.sets)
    : clean.some(r => toNum(r.reps) > LIMITS.reps) ? maxMsg('Repetições', LIMITS.reps) : '';
  const missing = !name.trim() ? 'Dê um nome ao treino.' : !clean.length ? 'Adicione pelo menos um exercício com nome.' : '';
  const hint = over || (tried ? missing : '');

  async function handleSave() {
    if (lock.current) return;
    if (over || missing) { setTried(true); return; }
    lock.current = true;
    setSaving(true);
    let planId = editing?.id;
    if (planId) {
      await sb.from('workout_plans').update({ name: name.trim() }).eq('id', planId);
      await sb.from('workout_plan_exercises').delete().eq('plan_id', planId);
    } else {
      const { data } = await sb.from('workout_plans').insert({ user_id: user.id, name: name.trim() }).select().single();
      planId = data?.id;
    }
    if (planId) {
      await sb.from('workout_plan_exercises').insert(clean.map((r, i) => ({
        user_id: user.id, plan_id: planId, name: r.name.trim(),
        target_sets: Math.max(1, parseInt(r.sets, 10) || 1),
        target_reps: Math.max(1, parseInt(r.reps, 10) || 1),
        position: i,
      })));
    }
    lock.current = false;
    setSaving(false);
    onSaved();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Nome do treino (ex: Treino A, Peito e tríceps)" value={name} onChange={e => setName(e.target.value)} />
      <div className="ex-head"><span>Exercício</span><span>Séries</span><span>Reps</span><span /></div>
      {rows.map((r, i) => (
        <div className="ex-row" key={i}>
          <input type="text" placeholder="Ex: Supino reto" value={r.name} onChange={e => setRow(i, 'name', e.target.value)} />
          <input type="number" inputMode="numeric" min="1" max={LIMITS.sets} value={r.sets} onChange={e => setRow(i, 'sets', e.target.value)} />
          <input type="number" inputMode="numeric" min="1" max={LIMITS.reps} value={r.reps} onChange={e => setRow(i, 'reps', e.target.value)} />
          <button type="button" className="del-btn" aria-label="Remover exercício" onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}><TrashIcon /></button>
        </div>
      ))}
      <button type="button" className="add-toggle" onClick={() => setRows(r => [...r, { name: '', sets: 3, reps: 10 }])}>+ Exercício</button>
      {hint && <div className="form-hint" role="alert">{hint}</div>}
      <div className="btn-row">
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar treino'}</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function PlansTab({ plans, onChanged, onStart }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function remove(p) {
    if (!confirm(`Apagar o modelo "${p.name}"? O histórico dos treinos feitos continua salvo.`)) return;
    await sb.from('workout_plans').delete().eq('id', p.id);
    onChanged();
  }

  return (
    <>
      {!formOpen && <button className="add-toggle" onClick={() => { setEditing(null); setFormOpen(true); }}>+ Novo modelo de treino</button>}
      {formOpen && <PlanForm editing={editing} onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); onChanged(); }} />}
      {plans.length === 0 && !formOpen ? (
        <div className="empty">Crie um modelo, como "Treino A", com os exercícios, séries e repetições.</div>
      ) : plans.map(p => (
        <div className="row" key={p.id}>
          <div className="row-body">
            <div className="title">{p.name}</div>
            <div className="meta">{p.exercises.length} exercício{p.exercises.length === 1 ? '' : 's'} · {p.exercises.map(e => e.name).slice(0, 3).join(', ')}{p.exercises.length > 3 ? '…' : ''}</div>
          </div>
          <button className="subtask-save-btn" onClick={() => onStart(p)}>Treinar</button>
          <button className="edit-btn" aria-label="Editar" onClick={() => { setEditing(p); setFormOpen(true); }}><PencilIcon /></button>
          <button className="del-btn" aria-label="Apagar" onClick={() => remove(p)}><TrashIcon /></button>
        </div>
      ))}
    </>
  );
}

/* ---------- Treinar ---------- */

function TrainTab({ plans, draft, setDraft, lastByExercise, onFinished, goToPlans }) {
  const { user, showToast } = useAppData();
  const [saving, setSaving] = useState(false);
  const lock = useRef(false); // trava imediata contra cliques no mesmo instante

  if (!draft) {
    return plans.length === 0 ? (
      <div className="empty">
        Você ainda não tem modelos de treino.
        <div style={{ marginTop: 12 }}><button className="subtask-save-btn" onClick={goToPlans}>Criar o primeiro</button></div>
      </div>
    ) : (
      <>
        <div className="notif-hint" style={{ marginBottom: 10 }}>Escolha o treino de hoje:</div>
        {plans.map(p => (
          <button className="setting-row link-row" key={p.id} onClick={() => setDraft(newDraft(p, lastByExercise))}>
            <div><div className="setting-text">{p.name}</div><div className="setting-sub">{p.exercises.length} exercício{p.exercises.length === 1 ? '' : 's'}</div></div>
            <span className="chev">›</span>
          </button>
        ))}
      </>
    );
  }

  function updateSet(ei, si, patch) {
    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => i !== ei ? ex : {
        ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)),
      }),
    }));
  }
  function addSet(ei) {
    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        const last = ex.sets[ex.sets.length - 1] || { reps: '', weight: '' };
        return { ...ex, sets: [...ex.sets, { reps: last.reps, weight: last.weight, done: false }] };
      }),
    }));
  }
  function toggleSet(ei, si, evt) {
    const s = draft.exercises[ei].sets[si];
    if (!s.done) {
      const rect = evt.currentTarget.getBoundingClientRect();
      burstConfetti(rect.x, rect.y);
    }
    updateSet(ei, si, { done: !s.done });
  }

  const doneSets = draft.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.done).length, 0);
  const totalSets = draft.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  async function finish() {
    if (!doneSets) { showToast('Marque pelo menos uma série feita.'); return; }
    if (lock.current) return;
    const doneList = draft.exercises.flatMap(ex => ex.sets.filter(s => s.done));
    if (doneList.some(s => toNum(s.reps) > LIMITS.reps)) { showToast(maxMsg('Repetições', LIMITS.reps)); return; }
    if (doneList.some(s => toNum(s.weight) > LIMITS.weight)) { showToast(maxMsg('Carga', LIMITS.weight, ' kg')); return; }
    lock.current = true;
    setSaving(true);
    const { data: session, error } = await sb.from('workout_sessions').insert({
      user_id: user.id, plan_id: draft.planId, plan_name: draft.planName, date_key: todayKey(),
    }).select().single();
    if (error || !session) { lock.current = false; setSaving(false); showToast('Não deu para salvar. Tente de novo.'); return; }
    const rows = [];
    draft.exercises.forEach(ex => {
      let n = 0;
      ex.sets.forEach(s => {
        if (!s.done) return;
        n++;
        rows.push({
          user_id: user.id, session_id: session.id, exercise_name: ex.name, set_number: n,
          reps: s.reps === '' ? null : parseInt(s.reps, 10) || null,
          weight: s.weight === '' ? null : parseFloat(String(s.weight).replace(',', '.')) || 0,
        });
      });
    });
    await sb.from('workout_sets').insert(rows);
    lock.current = false;
    setSaving(false);
    playSuccessSound();
    showToast(`Treino salvo: ${rows.length} série${rows.length === 1 ? '' : 's'}.`);
    setDraft(null);
    onFinished();
  }

  function cancel() {
    if (doneSets && !confirm('Descartar este treino? As séries marcadas não serão salvas.')) return;
    setDraft(null);
  }

  return (
    <>
      <div className="next-task-card">
        <div className="next-task-label">Treinando agora</div>
        <div className="next-task-title">{draft.planName}</div>
        <div className="next-task-meta">{doneSets} de {totalSets} séries feitas</div>
      </div>
      {draft.exercises.map((ex, ei) => {
        const last = lastByExercise[ex.name];
        return (
          <div className="workout-ex" key={ei}>
            <div className="workout-ex-top">
              <div className="title">{ex.name}</div>
              {last && <div className="meta">Última: {last.sets}×{last.reps ?? '–'}{last.weight ? ` · ${fmtKg(last.weight)} kg` : ''}</div>}
            </div>
            <div className="set-head"><span>Série</span><span>Reps</span><span>Carga (kg)</span><span /></div>
            {ex.sets.map((s, si) => (
              <div className={`set-row ${s.done ? 'done' : ''}`} key={si}>
                <span className="set-n">{si + 1}</span>
                <input type="number" inputMode="numeric" min="0" max={LIMITS.reps} value={s.reps} onChange={e => updateSet(ei, si, { reps: e.target.value })} />
                <input type="number" inputMode="decimal" step="0.5" min="0" max={LIMITS.weight} value={s.weight} placeholder="0" onChange={e => updateSet(ei, si, { weight: e.target.value })} />
                <button className={`check ${s.done ? 'checked' : ''}`} aria-label={s.done ? 'Desmarcar série' : 'Série feita'} onClick={e => toggleSet(ei, si, e)}><CheckIcon /></button>
              </div>
            ))}
            <button className="link-btn" onClick={() => addSet(ei)}>+ Série</button>
          </div>
        );
      })}
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button className="btn" onClick={finish} disabled={saving}>{saving ? 'Salvando…' : 'Concluir treino'}</button>
        <button className="btn ghost" onClick={cancel}>Descartar</button>
      </div>
    </>
  );
}

function newDraft(plan, lastByExercise) {
  return {
    planId: plan.id,
    planName: plan.name,
    startedAt: Date.now(),
    exercises: plan.exercises.map(e => {
      const last = lastByExercise[e.name];
      return {
        name: e.name,
        sets: Array.from({ length: e.target_sets }, () => ({
          reps: e.target_reps,
          weight: last?.weight ?? '',
          done: false,
        })),
      };
    }),
  };
}

/* ---------- Histórico e progresso ---------- */

function ProgressChart({ points }) {
  if (points.length < 2) {
    return <div className="notif-hint">Faça pelo menos dois treinos com esse exercício para ver a evolução.</div>;
  }
  const W = 340, H = 150, P = { l: 34, r: 10, t: 12, b: 22 };
  const ys = points.map(p => p.value);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const x = i => P.l + (i * (W - P.l - P.r)) / (points.length - 1);
  const y = v => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const first = points[0], last = points[points.length - 1];
  return (
    <svg className="progress-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolução da carga máxima">
      {[max, (max + min) / 2, min].map((v, i) => (
        <g key={i}>
          <line className="grid" x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} />
          <text className="axis" x={P.l - 6} y={y(v) + 4} textAnchor="end">{fmtKg(v)}</text>
        </g>
      ))}
      <path className="line" d={d} fill="none" />
      {points.map((p, i) => <circle key={i} className="dot" cx={x(i)} cy={y(p.value)} r="3" />)}
      <text className="axis" x={P.l} y={H - 4}>{formatKeyBR(first.date).slice(0, 5)}</text>
      <text className="axis" x={W - P.r} y={H - 4} textAnchor="end">{formatKeyBR(last.date).slice(0, 5)}</text>
    </svg>
  );
}

function HistoryTab({ sessions, sets, onChanged }) {
  const exerciseNames = useMemo(() => {
    const count = {};
    sets.forEach(s => { count[s.exercise_name] = (count[s.exercise_name] || 0) + 1; });
    return Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b));
  }, [sets]);
  const [exercise, setExercise] = useState('');
  const chosen = exercise || exerciseNames[0] || '';

  const points = useMemo(() => {
    const bySession = {};
    sets.filter(s => s.exercise_name === chosen && s.weight != null).forEach(s => {
      bySession[s.session_id] = Math.max(bySession[s.session_id] ?? 0, Number(s.weight));
    });
    return sessions
      .filter(se => bySession[se.id] !== undefined)
      .sort((a, b) => (a.date_key + a.created_at).localeCompare(b.date_key + b.created_at))
      .map(se => ({ date: se.date_key, value: bySession[se.id] }));
  }, [sets, sessions, chosen]);

  async function remove(se) {
    if (!confirm(`Apagar o treino de ${formatKeyBR(se.date_key)}?`)) return;
    await sb.from('workout_sessions').delete().eq('id', se.id);
    onChanged();
  }

  if (!sessions.length) return <div className="empty">Nenhum treino concluído ainda.</div>;

  const best = points.length ? Math.max(...points.map(p => p.value)) : null;
  return (
    <>
      {exerciseNames.length > 0 && (
        <div className="level-card" style={{ marginBottom: 18 }}>
          <div className="budget-top">
            <div className="budget-label">Carga máxima por treino</div>
            {best !== null && <div className="budget-values">recorde {fmtKg(best)} kg</div>}
          </div>
          <select className="plain-select" value={chosen} onChange={e => setExercise(e.target.value)}>
            {exerciseNames.map(n => <option key={n}>{n}</option>)}
          </select>
          <ProgressChart points={points} />
        </div>
      )}
      <div className="section-title" style={{ marginTop: 0 }}>Treinos feitos <span className="count">{sessions.length}</span></div>
      {sessions.map(se => {
        const ss = sets.filter(s => s.session_id === se.id);
        const volume = ss.reduce((v, s) => v + (Number(s.weight) || 0) * (s.reps || 0), 0);
        const exCount = new Set(ss.map(s => s.exercise_name)).size;
        return (
          <div className="row" key={se.id}>
            <div className="row-body">
              <div className="title">{se.plan_name || 'Treino'}</div>
              <div className="meta">{formatKeyBR(se.date_key)} · {exCount} exercício{exCount === 1 ? '' : 's'} · {ss.length} séries{volume ? ` · ${fmtKg(volume)} kg levantados` : ''}</div>
            </div>
            <button className="del-btn" aria-label="Apagar treino" onClick={() => remove(se)}><TrashIcon /></button>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Tela ---------- */

export default function TreinoView() {
  const { user } = useAppData();
  const [tab, setTab] = useState('treinar');
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sets, setSets] = useState([]);
  const [draft, setDraftState] = useState(loadDraft);
  const [status, setStatus] = useState('loading');

  const setDraft = useCallback(updater => {
    setDraftState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveDraft(next);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    const [p, e, s, st] = await Promise.all([
      sb.from('workout_plans').select('*').eq('user_id', user.id).order('created_at'),
      sb.from('workout_plan_exercises').select('*').eq('user_id', user.id).order('position'),
      sb.from('workout_sessions').select('*').eq('user_id', user.id).order('date_key', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('workout_sets').select('*').eq('user_id', user.id).order('set_number'),
    ]);
    if (p.error || e.error || s.error || st.error) { setStatus('missing'); return; }
    const exByPlan = {};
    (e.data || []).forEach(x => { (exByPlan[x.plan_id] = exByPlan[x.plan_id] || []).push(x); });
    setPlans((p.data || []).map(pl => ({ ...pl, exercises: exByPlan[pl.id] || [] })));
    setSessions(s.data || []);
    setSets(st.data || []);
    setStatus('ok');
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Última vez que cada exercício foi feito: séries, reps e carga máxima
  const lastByExercise = useMemo(() => {
    const out = {};
    const order = {};
    sessions.forEach((se, i) => { order[se.id] = i; });
    sets.forEach(s => {
      const rank = order[s.session_id];
      if (rank === undefined) return;
      const cur = out[s.exercise_name];
      if (!cur || rank < cur.rank) out[s.exercise_name] = { rank, session: s.session_id, sets: 0, reps: s.reps, weight: null };
    });
    sets.forEach(s => {
      const cur = out[s.exercise_name];
      if (!cur || cur.session !== s.session_id) return;
      cur.sets++;
      if (s.weight != null) cur.weight = Math.max(cur.weight ?? 0, Number(s.weight));
    });
    return out;
  }, [sessions, sets]);

  return (
    <div className="view active">
      <div className="section-title">Treino {status === 'ok' && <span className="count">{sessions.length} feitos</span>}</div>

      {status === 'loading' && <div className="loading-state"><div className="spinner" /></div>}

      {status === 'missing' && (
        <div className="empty">
          O banco ainda não tem as tabelas de treino.<br />
          Rode o arquivo <b>sql/2026-11-17-treino.sql</b> no Supabase (SQL Editor) e abra esta tela de novo.
        </div>
      )}

      {status === 'ok' && (
        <>
          <div className="segmented">
            <button className={`seg-btn ${tab === 'treinar' ? 'active' : ''}`} onClick={() => setTab('treinar')}>{draft ? 'Em andamento' : 'Treinar'}</button>
            <button className={`seg-btn ${tab === 'modelos' ? 'active' : ''}`} onClick={() => setTab('modelos')}>Modelos</button>
            <button className={`seg-btn ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>Histórico</button>
          </div>
          {tab === 'treinar' && (
            <TrainTab plans={plans} draft={draft} setDraft={setDraft} lastByExercise={lastByExercise}
              onFinished={() => { load(); setTab('historico'); }} goToPlans={() => setTab('modelos')} />
          )}
          {tab === 'modelos' && (
            <PlansTab plans={plans} onChanged={load} onStart={p => {
              if (draft && !confirm(`Você tem o treino "${draft.planName}" em andamento. Trocar por "${p.name}"?`)) { setTab('treinar'); return; }
              setDraft(newDraft(p, lastByExercise)); setTab('treinar');
            }} />
          )}
          {tab === 'historico' && <HistoryTab sessions={sessions} sets={sets} onChanged={load} />}
        </>
      )}
    </div>
  );
}
