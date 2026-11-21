import { useEffect, useState, useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';
import { sb } from '../lib/supabaseClient';
import { dateToKey, todayKey, formatKeyBR } from '../lib/helpers';
import { countsOnDay, weekStartKey, isFlexible } from '../lib/habits';
import { brl, catOf } from '../lib/finance';
import { moodOf } from '../lib/journal';
import MoodFace from './ui/MoodFace';

const addDays = (key, n) => { const d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() + n); return dateToKey(d); };
const shortDate = key => new Date(key + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');

// No domingo a revisão mostra a semana que acabou de terminar; nos outros dias, a semana atual
function defaultWeek() {
  const today = todayKey();
  const start = weekStartKey(today);
  return new Date().getDay() === 0 ? addDays(start, -7) : start;
}

async function loadWeek(userId, from, to) {
  const [logs, tasks, sessions, txs, journal] = await Promise.all([
    sb.from('habit_logs').select('habit_id,date_key').eq('user_id', userId).gte('date_key', from).lte('date_key', to),
    sb.from('tasks').select('id,title,date_key,done,start_time').eq('user_id', userId).gte('date_key', from).lte('date_key', to).order('date_key'),
    sb.from('workout_sessions').select('id,date_key').eq('user_id', userId).gte('date_key', from).lte('date_key', to),
    sb.from('transactions').select('amount,type,category').eq('user_id', userId).gte('date_key', from).lte('date_key', to),
    sb.from('journal_entries').select('date_key,mood,note').eq('user_id', userId).gte('date_key', from).lte('date_key', to).order('date_key'),
  ]);
  return { logs: logs.data || [], tasks: tasks.data || [], sessions: sessions.data || [], txs: txs.data || [], journal: journal.data || [] };
}

function habitSummary(habits, logs, from, lastKey) {
  const byHabit = habits.map(h => {
    const done = new Set(logs.filter(l => l.habit_id === h.id).map(l => l.date_key));
    if (isFlexible(h)) {
      const n = done.size;
      return { h, done: Math.min(n, h.weekly_target), total: h.weekly_target, label: `${n} de ${h.weekly_target} na semana` };
    }
    let total = 0, ok = 0;
    for (let k = from; k <= lastKey; k = addDays(k, 1)) {
      if (countsOnDay(h, new Date(k + 'T23:59:00'), done.has(k))) { total++; if (done.has(k)) ok++; }
    }
    return { h, done: ok, total, label: `${ok} de ${total} dias` };
  }).filter(x => x.total > 0);
  const total = byHabit.reduce((s, x) => s + x.total, 0);
  const done = byHabit.reduce((s, x) => s + x.done, 0);
  return { byHabit: byHabit.sort((a, b) => a.done / a.total - b.done / b.total), pct: total ? Math.round((done / total) * 100) : null };
}

export default function WeeklyReview() {
  const { user, habits, rescheduleTask, showToast } = useAppData();
  const [start, setStart] = useState(defaultWeek);
  const [data, setData] = useState(null);
  const end = addDays(start, 6);
  const today = todayKey();
  const lastKey = end < today ? end : today; // não conta dias que ainda não chegaram
  const isFuture = start > today;

  const load = useCallback(async () => {
    setData(null);
    setData(await loadWeek(user.id, start, end));
  }, [user, start, end]);
  useEffect(() => { load(); }, [load]);

  async function bringToToday(t) {
    await rescheduleTask(t.id, today);
    showToast(`"${t.title}" foi para hoje.`);
    load();
  }

  const nav = (
    <div className="day-nav">
      <button className="cal-arrow" onClick={() => setStart(s => addDays(s, -7))} aria-label="Semana anterior">‹</button>
      <div className="day-nav-label">{shortDate(start)} a {shortDate(end)}
        {start !== defaultWeek() && <button className="day-nav-today" onClick={() => setStart(defaultWeek())}>Voltar</button>}
      </div>
      <button className="cal-arrow" onClick={() => setStart(s => addDays(s, 7))} aria-label="Próxima semana">›</button>
    </div>
  );

  if (isFuture) return <>{nav}<div className="empty">Essa semana ainda não começou.</div></>;
  if (!data) return <>{nav}<div className="loading-state" style={{ padding: 40 }}><div className="spinner" /></div></>;

  const hab = habitSummary(habits, data.logs, start, lastKey);
  const doneTasks = data.tasks.filter(t => t.done);
  const leftTasks = data.tasks.filter(t => !t.done && t.date_key < today);
  const spent = data.txs.filter(t => t.type === 'out');
  const spentTotal = spent.reduce((s, t) => s + Number(t.amount), 0);
  const cats = {};
  spent.forEach(t => { cats[catOf(t)] = (cats[catOf(t)] || 0) + Number(t.amount); });
  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  const moods = data.journal.filter(j => j.mood);
  const avgMood = moods.length ? moods.reduce((s, j) => s + j.mood, 0) / moods.length : null;
  const notes = data.journal.filter(j => j.note);

  return (
    <>
      {nav}
      <div className="review-grid">
        <div className="fin-stat"><div className="l">Hábitos</div><div className="v">{hab.pct === null ? '-' : `${hab.pct}%`}</div><div className="review-sub">cumpridos</div></div>
        <div className="fin-stat"><div className="l">Tarefas</div><div className="v">{doneTasks.length}/{data.tasks.length}</div><div className="review-sub">feitas</div></div>
        <div className="fin-stat"><div className="l">Treinos</div><div className="v">{data.sessions.length}</div><div className="review-sub">na semana</div></div>
        <div className="fin-stat"><div className="l">Humor</div><div className="v">{avgMood ? <MoodFace mood={Math.round(avgMood)} size={22} colored /> : '-'}</div><div className="review-sub">{avgMood ? `média ${avgMood.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 5` : 'sem registro'}</div></div>
      </div>

      {leftTasks.length > 0 && <>
        <div className="section-title">Ficou para trás <span className="section-sub">{leftTasks.length}</span></div>
        <div className="fin-card">{leftTasks.map(t => (
          <div className="review-row" key={t.id}>
            <div style={{ minWidth: 0 }}><div className="tx-desc">{t.title}</div><div className="tx-date">{formatKeyBR(t.date_key)}{t.start_time ? ` · ${t.start_time}` : ''}</div></div>
            <button className="link-btn" onClick={() => bringToToday(t)}>Trazer para hoje</button>
          </div>
        ))}</div>
      </>}

      {hab.byHabit.length > 0 && <>
        <div className="section-title">Hábitos</div>
        <div className="fin-card">{hab.byHabit.map(({ h, done, total, label }) => (
          <div className="cat-row" key={h.id} style={{ cursor: 'default' }}>
            <div className="cat-top"><span className="cat-name">{h.name}</span><span className="cat-val">{label}</span></div>
            <div className="cat-track"><div className="cat-fill" style={{ width: `${(done / total) * 100}%` }} /></div>
          </div>
        ))}</div>
      </>}

      {doneTasks.length > 0 && <>
        <div className="section-title">Feito <span className="section-sub">{doneTasks.length}</span></div>
        <div className="fin-card review-done">{doneTasks.map(t => <div key={t.id} className="review-done-item">✓ {t.title}</div>)}</div>
      </>}

      <div className="section-title">Dinheiro</div>
      <div className="fin-card review-money">
        {spent.length ? <>Gastou <strong>{brl(spentTotal)}</strong> na semana{topCat && <>, mais em <strong>{topCat[0]}</strong> ({brl(topCat[1])})</>}.</> : 'Nenhum gasto registrado na semana.'}
      </div>

      {notes.length > 0 && <>
        <div className="section-title">Diário</div>
        <div className="fin-card">{notes.map(j => (
          <div className="review-row" key={j.date_key}>
            <div><div className="tx-date">{shortDate(j.date_key)}{j.mood ? ` · ${moodOf(j.mood).label}` : ''}</div><div className="journal-line">{j.note}</div></div>
          </div>
        ))}</div>
      </>}
    </>
  );
}
