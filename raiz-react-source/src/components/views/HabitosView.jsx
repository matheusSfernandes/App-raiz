import { useState, useEffect, useMemo } from 'react';
import TimeInput from '../ui/TimeInput';
import { useAppData } from '../../context/AppDataContext';
import { sb } from '../../lib/supabaseClient';
import { CATEGORIES, DAY_LETTERS, todayKey, dateToKey } from '../../lib/helpers';
import { ALL_DAYS, isFlexible, isNumeric, bestStreak, formatAmount, weekStartKey, createdKey } from '../../lib/habits';
import { CheckIcon, FlameIcon, PencilIcon, TrashIcon } from '../ui/Icons';
import { burstConfetti, playSuccessSound } from '../../lib/effects';
import { LIMITS, toNum, maxMsg } from '../../lib/validate';

/* ---------- Formulário ---------- */

function HabitForm({ editing, onCancel }) {
  const { saveHabit } = useAppData();
  const [name, setName] = useState(editing?.name || '');
  const [time, setTime] = useState(editing?.time || '');
  const [category, setCategory] = useState(editing?.category || 'Geral');
  const [freq, setFreq] = useState(editing?.weekly_target ? 'flex' : 'fixed');
  const [days, setDays] = useState(editing?.days_of_week || ALL_DAYS);
  const [weekly, setWeekly] = useState(editing?.weekly_target || 3);
  const [kind, setKind] = useState(editing && isNumeric(editing) ? 'amount' : 'check');
  const [target, setTarget] = useState(editing?.target ?? '');
  const [unit, setUnit] = useState(editing?.unit || '');

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const t = toNum(target);
  const over = kind === 'amount' && t > LIMITS.habitTarget ? maxMsg('Meta', LIMITS.habitTarget) : '';
  const missing = !name.trim() ? 'Dê um nome ao hábito.'
    : kind === 'amount' && !(t > 0) ? 'Informe a meta, ex: 2000.'
    : freq === 'fixed' && !days.length ? 'Marque pelo menos um dia da semana.'
    : '';
  const hint = over || (tried ? missing : '');

  async function handleSave() {
    if (saving) return;
    if (over || missing) { setTried(true); return; }
    setSaving(true);
    try {
      await saveHabit(editing?.id || null, {
        name: name.trim(), time, category,
        days_of_week: freq === 'flex' ? ALL_DAYS : days,
        weekly_target: freq === 'flex' ? Number(weekly) : null,
        target: kind === 'amount' ? t : null,
        unit: kind === 'amount' ? (unit.trim() || null) : null,
      });
    } finally { setSaving(false); }
    onCancel();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Nome do hábito (ex: Beber água)" value={name} onChange={e => setName(e.target.value)} />
      <div className="form-label">Horário do lembrete</div>
      <TimeInput value={time} onChange={setTime} label="Horário do lembrete" />
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>

      <div className="form-label">Como medir</div>
      <div className="segmented">
        <button type="button" className={`seg-btn ${kind === 'check' ? 'active' : ''}`} onClick={() => setKind('check')}>Só marcar feito</button>
        <button type="button" className={`seg-btn ${kind === 'amount' ? 'active' : ''}`} onClick={() => setKind('amount')}>Quantidade</button>
      </div>
      {kind === 'amount' && (
        <div className="two">
          <input type="number" inputMode="decimal" placeholder="Meta (ex: 2000)" min="0" max={LIMITS.habitTarget} value={target} onChange={e => setTarget(e.target.value)} />
          <input type="text" placeholder="Unidade (ex: ml, páginas)" value={unit} onChange={e => setUnit(e.target.value)} />
        </div>
      )}

      <div className="form-label">Frequência</div>
      <div className="segmented">
        <button type="button" className={`seg-btn ${freq === 'fixed' ? 'active' : ''}`} onClick={() => setFreq('fixed')}>Dias fixos</button>
        <button type="button" className={`seg-btn ${freq === 'flex' ? 'active' : ''}`} onClick={() => setFreq('flex')}>Vezes por semana</button>
      </div>
      {freq === 'fixed' ? (
        <div className="day-picker">
          {DAY_LETTERS.map((letter, i) => (
            <button type="button" key={i} className={`day-chip ${days.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{letter}</button>
          ))}
        </div>
      ) : (
        <>
        <div className="notif-hint" style={{ marginBottom: 6 }}>Aparece todo dia até você bater a meta da semana.</div>
        <select value={weekly} onChange={e => setWeekly(e.target.value)}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'vez' : 'vezes'} por semana</option>)}
        </select>
        </>
      )}

      {hint && <div className="form-hint" role="alert">{hint}</div>}
      <div className="btn-row">
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/* ---------- Linha ---------- */

function freqLabel(h) {
  if (isFlexible(h)) return `${h.weekly_target}x por semana`;
  const days = h.days_of_week || ALL_DAYS;
  return days.length === 7 ? 'Todo dia' : days.map(d => DAY_LETTERS[d]).join(' ');
}

function quickSteps(h) {
  const t = Number(h.target);
  const u = (h.unit || '').toLowerCase();
  if (u === 'ml') return [200, 300, 500];
  if (u === 'l' || u === 'litros') return [0.25, 0.5, 1];
  if (t <= 10) return [1];
  if (t <= 50) return [1, 5];
  if (t <= 200) return [5, 10, 20];
  return [Math.round(t / 10), Math.round(t / 4)];
}

function ProgressPanel({ habit, onClose }) {
  const { addHabitProgress, showToast } = useAppData();
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(amount, evt) {
    if (busy || !amount || isNaN(amount)) return;
    if (Math.abs(amount) > LIMITS.habitTarget) { showToast(maxMsg('Valor', LIMITS.habitTarget)); return; }
    setBusy(true);
    const rect = evt?.currentTarget?.getBoundingClientRect();
    const reached = await addHabitProgress(habit.id, amount);
    if (reached && rect) { burstConfetti(rect.x, rect.y); playSuccessSound(); }
    setCustom('');
    setBusy(false);
  }

  return (
    <div className="row-menu progress-panel">
      {quickSteps(habit).map(s => (
        <button key={s} disabled={busy} onClick={e => add(s, e)}>+{formatAmount(s, habit.unit)}</button>
      ))}
      <div className="progress-custom">
        <input type="number" inputMode="decimal" placeholder="Outro valor" max={LIMITS.habitTarget} value={custom} onChange={e => setCustom(e.target.value)} />
        <button disabled={busy} onClick={e => add(parseFloat(String(custom).replace(',', '.')), e)}>Somar</button>
        <button disabled={busy || !habit.progress_today} onClick={e => add(-Number(habit.progress_today), e)}>Zerar</button>
      </div>
      <button className="close-link" onClick={onClose}>Fechar</button>
    </div>
  );
}

function HabitRow({ habit, onEdit, onOpen }) {
  const { toggleHabit, deleteHabit } = useAppData();
  const [panel, setPanel] = useState(false);
  const today = todayKey();
  const flex = isFlexible(habit);
  const numeric = isNumeric(habit);
  const scheduledToday = flex || (habit.days_of_week || ALL_DAYS).includes(new Date().getDay());
  const done = habit.last_done === today;
  const pct = numeric ? Math.min(1, (habit.progress_today || 0) / Number(habit.target)) : 0;

  async function handleToggle(evt) {
    if (!scheduledToday) return;
    if (numeric) { setPanel(p => !p); return; }
    const rect = evt.currentTarget.getBoundingClientRect();
    const confettiOk = await toggleHabit(habit.id);
    if (confettiOk) { burstConfetti(rect.x, rect.y); playSuccessSound(); }
  }

  const meta = [
    habit.time || null,
    freqLabel(habit),
    flex ? `${habit.week_count || 0}/${habit.weekly_target} nesta semana` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className={`row ${done ? 'done' : ''} ${!scheduledToday ? 'off' : ''}`}>
        {numeric ? (
          <button className={`amount-btn ${done ? 'full' : ''}`} disabled={!scheduledToday} onClick={handleToggle}
            aria-label="Registrar quantidade" style={{ '--pct': `${pct * 360}deg` }}>
            {done ? <CheckIcon /> : '+'}
          </button>
        ) : (
          <button className={`check ${done ? 'checked' : ''}`} disabled={!scheduledToday}
            aria-label={done ? 'Desmarcar' : 'Concluir'} onClick={handleToggle}><CheckIcon /></button>
        )}
        <button className="row-body row-link" onClick={() => onOpen(habit)}>
          <div className="title"><span className="category-tag">{habit.category || 'Geral'}</span>{habit.name}</div>
          <div className="meta">
            {numeric && <b className="amount-now">{formatAmount(habit.progress_today, null)}/{formatAmount(habit.target, habit.unit)} · </b>}
            {meta}
          </div>
        </button>
        <div className={`streak-pill ${habit.streak >= 3 ? 'hot' : ''}`} title={flex ? 'Semanas seguidas' : 'Dias seguidos'}>
          <FlameIcon />{habit.streak}{flex ? ' sem.' : ''}
        </div>
        <button className="edit-btn" aria-label="Editar" onClick={() => onEdit(habit)}><PencilIcon /></button>
        <button className="del-btn" aria-label="Apagar" onClick={() => { if (confirm(`Apagar o hábito "${habit.name}"? Isso também apaga o histórico dele.`)) deleteHabit(habit.id); }}><TrashIcon /></button>
      </div>
      {panel && numeric && <ProgressPanel habit={habit} onClose={() => setPanel(false)} />}
    </>
  );
}

/* ---------- Página do hábito ---------- */

function Heatmap({ habit, doneSet, values }) {
  const weeks = 17;
  const end = new Date(todayKey() + 'T12:00:00');
  const start = new Date(end);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  const created = createdKey(habit);
  const days = habit.days_of_week || ALL_DAYS;
  const cols = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const key = dateToKey(cursor);
      let cls = 'heat-0';
      if (key > todayKey() || key < created) cls = 'off';
      else if (doneSet.has(key)) cls = 'heat-4';
      else if (isNumeric(habit) && values[key]) {
        const r = values[key] / Number(habit.target);
        cls = r >= 0.66 ? 'heat-3' : r >= 0.33 ? 'heat-2' : 'heat-1';
      } else if (!isFlexible(habit) && !days.includes(cursor.getDay())) cls = 'rest';
      cells.push(<span key={key} className={`hm-cell ${cls}`} title={new Date(key + 'T12:00:00').toLocaleDateString('pt-BR')} />);
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push(<div className="hm-col" key={w}>{cells}</div>);
  }
  return <div className="heatmap">{cols}</div>;
}

function HabitDetail({ habit, onBack, onEdit }) {
  const { user } = useAppData();
  const [logs, setLogs] = useState(null);
  const [values, setValues] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: l }, { data: p }] = await Promise.all([
        sb.from('habit_logs').select('date_key').eq('habit_id', habit.id).order('date_key', { ascending: false }).limit(2000),
        sb.from('habit_progress').select('date_key,value').eq('habit_id', habit.id).eq('user_id', user.id).order('date_key', { ascending: false }).limit(400),
      ]);
      if (cancelled) return;
      setLogs((l || []).map(x => x.date_key));
      const v = {};
      (p || []).forEach(x => { v[x.date_key] = Number(x.value); });
      setValues(v);
    })();
    return () => { cancelled = true; };
  }, [habit.id, habit.last_done, user]);

  const doneSet = useMemo(() => new Set(logs || []), [logs]);

  const stats = useMemo(() => {
    if (!logs) return null;
    const today = todayKey();
    const created = createdKey(habit);
    const best = Math.max(bestStreak(habit, doneSet), habit.streak || 0);
    let rate, rateLabel;
    if (isFlexible(habit)) {
      let hit = 0, total = 0;
      const cursor = new Date(weekStartKey(today) + 'T12:00:00');
      for (let i = 0; i < 4; i++) {
        cursor.setDate(cursor.getDate() - 7);
        const w = dateToKey(cursor);
        if (w < weekStartKey(created === '0000-00-00' ? today : created)) break;
        const end = new Date(cursor); end.setDate(end.getDate() + 6);
        const count = logs.filter(k => k >= w && k <= dateToKey(end)).length;
        total++; if (count >= habit.weekly_target) hit++;
      }
      rate = total ? hit / total : null;
      rateLabel = `${hit} de ${total} semanas com a meta (últimas 4)`;
    } else {
      const days = habit.days_of_week || ALL_DAYS;
      let sched = 0, done = 0;
      const cursor = new Date(today + 'T12:00:00');
      for (let i = 0; i < 30; i++) {
        const key = dateToKey(cursor);
        if (key < created) break;
        if (days.includes(cursor.getDay()) && !(key === today && !doneSet.has(key))) { sched++; if (doneSet.has(key)) done++; }
        cursor.setDate(cursor.getDate() - 1);
      }
      rate = sched ? done / sched : null;
      rateLabel = `${done} de ${sched} dias programados (últimos 30)`;
    }
    const vals = Object.values(values).filter(v => v > 0);
    return {
      best, rate, rateLabel, total: logs.length,
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      max: vals.length ? Math.max(...vals) : null,
    };
  }, [logs, doneSet, values, habit]);

  const unitStreak = isFlexible(habit) ? 'semanas' : 'dias';

  return (
    <div className="view active">
      <button className="link-btn back-link" onClick={onBack}>‹ Hábitos</button>
      <div className="section-title" style={{ marginTop: 6 }}>
        <span>{habit.name}</span>
        <button className="edit-btn" onClick={() => onEdit(habit)}>Editar</button>
      </div>
      <div className="notif-hint" style={{ marginTop: -6, marginBottom: 14 }}>
        {habit.category || 'Geral'} · {freqLabel(habit)}{isNumeric(habit) ? ` · meta ${formatAmount(habit.target, habit.unit)} por dia` : ''}
      </div>

      {!stats ? <div className="loading-state"><div className="spinner" /></div> : (
        <>
          <div className="stat-grid">
            <div className="stat-card"><div className="k">{habit.streak || 0} {unitStreak}</div><div className="l">Sequência atual</div></div>
            <div className="stat-card"><div className="k">{stats.best} {unitStreak}</div><div className="l">Maior sequência</div></div>
            <div className="stat-card"><div className="k">{stats.rate === null ? '–' : `${Math.round(stats.rate * 100)}%`}</div><div className="l">Taxa de cumprimento</div></div>
            <div className="stat-card"><div className="k">{stats.total}</div><div className="l">Vezes concluído</div></div>
          </div>
          <div className="notif-hint" style={{ marginTop: 8 }}>Taxa: {stats.rateLabel}.</div>

          {isNumeric(habit) && stats.avg !== null && (
            <div className="budget-card" style={{ marginTop: 12 }}>
              <div className="budget-top" style={{ marginBottom: 0 }}>
                <div className="budget-label">Média por dia registrado</div>
                <div className="budget-values">{formatAmount(stats.avg, habit.unit)} <span>· recorde {formatAmount(stats.max, habit.unit)}</span></div>
              </div>
            </div>
          )}

          <div className="section-title">Últimos 4 meses</div>
          <div className="level-card">
            <Heatmap habit={habit} doneSet={doneSet} values={values} />
            <div className="calendar-legend" style={{ marginTop: 10 }}>
              <span className="leg-dot heat-0" /> não feito
              <span className="leg-dot heat-4" style={{ marginLeft: 8 }} /> feito
              {!isFlexible(habit) && <><span className="leg-dot rest" style={{ marginLeft: 8 }} /> dia de folga</>}
            </div>
          </div>
          <div className="notif-hint" style={{ marginTop: 8 }}>Para marcar um dia que passou, use o Histórico.</div>
        </>
      )}
    </div>
  );
}

/* ---------- Tela ---------- */

export default function HabitosView() {
  const { habits } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(h) { setOpenId(null); setEditing(h); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditing(null); }

  const opened = habits.find(h => h.id === openId);
  if (opened) return <HabitDetail habit={opened} onBack={() => setOpenId(null)} onEdit={openEdit} />;

  return (
    <div className="view active">
      <div className="section-title">Meus hábitos <span className="count">{habits.length}</span></div>
      {!formOpen && <button className="add-toggle" onClick={openNew}>+ Novo hábito</button>}
      {formOpen && <HabitForm key={editing?.id || 'new'} editing={editing} onCancel={closeForm} />}
      {habits.length === 0 ? (
        <div className="empty">Nenhum hábito ainda. Crie o primeiro acima.</div>
      ) : (
        <>
          {habits.map(h => <HabitRow key={h.id} habit={h} onEdit={openEdit} onOpen={x => setOpenId(x.id)} />)}
          <div className="notif-hint" style={{ marginTop: 6 }}>Toque no nome de um hábito para ver a evolução dele.</div>
        </>
      )}
    </div>
  );
}
