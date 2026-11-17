import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { sb } from '../../lib/supabaseClient';
import { dateToKey, todayKey } from '../../lib/helpers';
import { CheckIcon } from '../ui/Icons';
import { countsOnDay, isFlexible } from '../../lib/habits';

function heatClass(pct) {
  if (pct === null || pct === undefined || pct === 0) return 'heat-0';
  if (pct < 0.34) return 'heat-1';
  if (pct < 0.67) return 'heat-2';
  if (pct < 1) return 'heat-3';
  return 'heat-4';
}

export default function HistoricoView() {
  const { habits, user, setHabitDone, toggleTask } = useAppData();
  const [busy, setBusy] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [dayData, setDayData] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);

  const loadCalendar = useCallback(async () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstKey = dateToKey(first);
    const lastKey = dateToKey(last);

    const [{ data: logs }, { data: monthTasks }] = await Promise.all([
      sb.from('habit_logs').select('habit_id,date_key').eq('user_id', user.id).gte('date_key', firstKey).lte('date_key', lastKey),
      sb.from('tasks').select('date_key,done').eq('user_id', user.id).gte('date_key', firstKey).lte('date_key', lastKey),
    ]);

    const result = {};
    const daysInMonth = last.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = dateToKey(date);
      const logged = new Set((logs || []).filter(l => l.date_key === key).map(l => l.habit_id));
      const scheduled = habits.filter(h => countsOnDay(h, new Date(year, month, d, 23, 59), logged.has(h.id)));
      const doneHabits = scheduled.filter(h => logged.has(h.id)).length;
      const dayTasks = (monthTasks || []).filter(t => t.date_key === key);
      const total = scheduled.length + dayTasks.length;
      const done = doneHabits + dayTasks.filter(t => t.done).length;
      result[key] = { total, done, pct: total ? done / total : null };
    }
    setDayData(result);
  }, [calendarDate, habits, user]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  async function toggleDayHabit(habitId, done) {
    setBusy(true);
    await setHabitDone(habitId, selectedKey, done);
    await Promise.all([selectDay(selectedKey, true), loadCalendar()]);
    setBusy(false);
  }
  async function toggleDayTask(task) {
    setBusy(true);
    await toggleTask(task);
    await Promise.all([selectDay(selectedKey, true), loadCalendar()]);
    setBusy(false);
  }

  async function selectDay(key, keep) {
    setSelectedKey(key);
    if (!keep) setDayDetail(null);
    const [{ data: dayTasks }, { data: dayLogs }] = await Promise.all([
      sb.from('tasks').select('*').eq('user_id', user.id).eq('date_key', key),
      sb.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('date_key', key),
    ]);
    const loggedIds = (dayLogs || []).map(l => l.habit_id);
    const dow = new Date(key + 'T12:00:00').getDay();
    const scheduledHabits = habits.filter(h => isFlexible(h) || (h.days_of_week || [0, 1, 2, 3, 4, 5, 6]).includes(dow));
    setDayDetail({ tasks: dayTasks || [], habits: scheduledHabits, loggedIds });
  }

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = first.getDay();
  const todayK = todayKey();
  const monthLabel = calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(<div className="cal-day empty" key={'e' + i} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = dateToKey(date);
    const isFuture = key > todayK;
    const info = dayData[key];
    const classes = ['cal-day'];
    if (isFuture) classes.push('future');
    else classes.push(heatClass(info ? info.pct : null));
    if (key === todayK) classes.push('today');
    if (key === selectedKey) classes.push('selected');
    cells.push(
      <div key={key} className={classes.join(' ')} onClick={() => !isFuture && selectDay(key)}>{d}</div>
    );
  }

  return (
    <div className="view active">
      <div className="section-title">Histórico</div>
      <div className="calendar-nav">
        <button className="cal-arrow" onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
        <div className="cal-month">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
        <button className="cal-arrow" onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="calendar-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
      <div className="calendar-grid">{cells}</div>
      <div className="calendar-legend">
        <span className="leg-label">Menos</span>
        <span className="leg-dot heat-0" /><span className="leg-dot heat-1" /><span className="leg-dot heat-2" /><span className="leg-dot heat-3" /><span className="leg-dot heat-4" />
        <span className="leg-label">Mais</span>
      </div>

      {dayDetail && (
        <div>
          <div className="section-title" style={{ marginTop: 20 }}>
            {new Date(selectedKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="notif-hint" style={{ marginTop: -6, marginBottom: 10 }}>Esqueceu de marcar? Toque no quadrado para registrar neste dia.</div>
          {(!dayDetail.habits.length && !dayDetail.tasks.length) ? (
            <div className="empty">Nada registrado nesse dia.</div>
          ) : (
            <>
              {dayDetail.habits.map(h => {
                const done = dayDetail.loggedIds.includes(h.id);
                return (
                  <div className={`row ${done ? 'done' : ''}`} key={h.id}>
                    <button className={`check ${done ? 'checked' : ''}`} disabled={busy} aria-label={done ? 'Desmarcar' : 'Marcar como feito'}
                      onClick={() => toggleDayHabit(h.id, !done)}><CheckIcon /></button>
                    <div className="row-body"><div className="title">{h.name}</div><div className="meta">Hábito{h.streak ? ` · sequência ${h.streak}` : ''}</div></div>
                  </div>
                );
              })}
              {dayDetail.tasks.map(t => (
                <div className={`row ${t.done ? 'done' : ''}`} key={t.id}>
                  <button className={`check ${t.done ? 'checked' : ''}`} disabled={busy} aria-label={t.done ? 'Desmarcar' : 'Marcar como feita'}
                    onClick={() => toggleDayTask(t)}><CheckIcon /></button>
                  <div className="row-body"><div className="title">{t.title}</div><div className="meta">Tarefa</div></div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
