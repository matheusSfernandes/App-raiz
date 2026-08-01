import { useMemo, useState, useEffect } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { sb } from '../../lib/supabaseClient';
import { todayKey, todayHabits, AREA_COLORS } from '../../lib/helpers';

function GoalCard({ profile }) {
  const { goal_label, goal_date } = profile;
  if (!goal_label || !goal_date) return null;
  const target = new Date(goal_date + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - today) / 86400000);
  let daysLabel;
  if (diffDays > 0) daysLabel = <>{diffDays} <small>dia{diffDays === 1 ? '' : 's'}</small></>;
  else if (diffDays === 0) daysLabel = 'Hoje!';
  else daysLabel = <>{Math.abs(diffDays)} <small>dia{Math.abs(diffDays) === 1 ? '' : 's'} atrás</small></>;
  return (
    <div className="goal-card">
      <div className="goal-label">🎯 {goal_label}</div>
      <div className="goal-days">{daysLabel}</div>
    </div>
  );
}

function Rings({ habits, tasks }) {
  const today = todayKey();
  const habitsToday = todayHabits(habits);
  const habitsDone = habitsToday.filter(h => h.last_done === today).length;
  const habitsPct = habitsToday.length ? habitsDone / habitsToday.length : 0;
  const tasksDone = tasks.filter(t => t.done).length;
  const tasksPct = tasks.length ? tasksDone / tasks.length : 0;
  const overallPct = (habitsPct + tasksPct) / 2;

  const size = 200, cx = size / 2, cy = size / 2;
  const rings = [
    { r: 82, pct: overallPct, color: '#FF3D81', w: 13 },
    { r: 60, pct: habitsPct, color: '#FFB627', w: 11 },
    { r: 40, pct: tasksPct, color: '#2FE6E6', w: 11 },
  ];

  return (
    <>
      <div className="rings-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {rings.map(ring => {
            const circ = 2 * Math.PI * ring.r;
            const offset = circ * (1 - ring.pct);
            return (
              <g key={ring.r}>
                <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={ring.w} />
                <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke={ring.color} strokeWidth={ring.w}
                  strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`} filter="url(#ringGlow)"
                  style={{ transition: 'stroke-dashoffset .5s ease' }} />
              </g>
            );
          })}
          <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="27" fill="#FFFFFF">{Math.round(overallPct * 100)}%</text>
          <text x={cx} y={cy + 17} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fill="#B4A9D6">do dia</text>
        </svg>
      </div>
      <div className="rings-label"><div className="big">{habitsDone}/{habitsToday.length} hábitos · {tasksDone}/{tasks.length} tarefas hoje</div></div>
    </>
  );
}

export default function InicioView() {
  const { habits, tasks, transactions, profile } = useAppData();
  const today = todayKey();

  const habitsToday = useMemo(() => todayHabits(habits), [habits]);
  const habitsDone = habitsToday.filter(h => h.last_done === today).length;
  const tasksDone = tasks.filter(t => t.done).length;
  const maxStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);
  const balance = transactions.reduce((s, t) => s + (t.type === 'in' ? Number(t.amount) : -Number(t.amount)), 0);

  const byArea = useMemo(() => {
    const map = {};
    habitsToday.forEach(h => {
      const cat = h.category || 'Geral';
      map[cat] = map[cat] || { total: 0, done: 0 };
      map[cat].total++;
      if (h.last_done === today) map[cat].done++;
    });
    tasks.forEach(t => {
      const cat = t.category || 'Geral';
      map[cat] = map[cat] || { total: 0, done: 0 };
      map[cat].total++;
      if (t.done) map[cat].done++;
    });
    return map;
  }, [habitsToday, tasks, today]);

  return (
    <div className="view active">
      <GoalCard profile={profile} />
      <Rings habits={habits} tasks={tasks} />
      <div className="stat-grid">
        <div className="stat-card moss"><div className="k">{habitsDone}/{habitsToday.length}</div><div className="l">Hábitos hoje</div></div>
        <div className="stat-card clay"><div className="k">{tasksDone}/{tasks.length}</div><div className="l">Tarefas hoje</div></div>
        <div className="stat-card amber"><div className="k">{maxStreak}</div><div className="l">Sequência</div></div>
        <div className="stat-card"><div className="k">R${balance.toFixed(0)}</div><div className="l">Saldo</div></div>
      </div>

      <div className="section-title">Áreas da vida</div>
      {Object.keys(byArea).length === 0 ? (
        <div className="empty">Adicione hábitos ou tarefas com categorias pra ver seu progresso por área.</div>
      ) : (
        Object.entries(byArea).map(([cat, info]) => {
          const pct = info.total ? Math.round((info.done / info.total) * 100) : 0;
          const color = AREA_COLORS[cat] || '#B4A9D6';
          return (
            <div className="area-row" key={cat}>
              <div className="area-top"><span className="area-name">{cat}</span><span className="area-pct">{info.done}/{info.total} · {pct}%</span></div>
              <div className="area-bar-track"><div className="area-bar-fill" style={{ width: `${pct}%`, background: color }} /></div>
            </div>
          );
        })
      )}

      <div className="section-title">Resumo da semana</div>
      <WeeklySummaryCard />
    </div>
  );
}

function WeeklySummaryCard() {
  const { habits, user } = useAppData();
  const [state, setStateFn] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start14 = new Date(today); start14.setDate(start14.getDate() - 13);
      const startKey = start14.toISOString().slice(0, 10);
      const todayK = today.toISOString().slice(0, 10);
      const [{ data: logs }, { data: rangeTasks }] = await Promise.all([
        sb.from('habit_logs').select('habit_id,date_key').eq('user_id', user.id).gte('date_key', startKey).lte('date_key', todayK),
        sb.from('tasks').select('date_key,done').eq('user_id', user.id).gte('date_key', startKey).lte('date_key', todayK),
      ]);
      function pctForRange(offsetStart, offsetEnd) {
        let total = 0, done = 0;
        for (let i = offsetStart; i <= offsetEnd; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const dow = d.getDay();
          const scheduled = habits.filter(h => {
            const days = h.days_of_week || [0, 1, 2, 3, 4, 5, 6];
            if (!days.includes(dow)) return false;
            if (h.created_at && new Date(h.created_at) > d) return false;
            return true;
          });
          const doneHabits = (logs || []).filter(l => l.date_key === key).length;
          const dayTasks = (rangeTasks || []).filter(t => t.date_key === key);
          total += scheduled.length + dayTasks.length;
          done += doneHabits + dayTasks.filter(t => t.done).length;
        }
        return total ? Math.round((done / total) * 100) : null;
      }
      if (!cancelled) setStateFn({ thisWeek: pctForRange(0, 6), lastWeek: pctForRange(7, 13) });
    })();
    return () => { cancelled = true; };
  }, [habits, user]);

  if (!state || state.thisWeek === null) return <div className="empty">Ainda sem dados suficientes essa semana.</div>;
  const delta = state.lastWeek !== null ? state.thisWeek - state.lastWeek : null;
  const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
  return (
    <div className="week-summary-card">
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="week-pct">{state.thisWeek}%</div>
          {delta !== null && <div className={`week-delta ${cls}`}>{arrow} {Math.abs(delta)}% vs semana passada</div>}
        </div>
        <div className="week-label">concluído nos últimos 7 dias</div>
        <div className="week-bar-track"><div className="week-bar-fill" style={{ width: `${state.thisWeek}%` }} /></div>
      </div>
    </div>
  );
}
