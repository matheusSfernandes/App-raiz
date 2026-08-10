import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { sb } from '../../lib/supabaseClient';
import { dateToKey, todayKey } from '../../lib/helpers';
import { CheckIcon } from '../ui/Icons';

function pctColor(pct) {
  if (pct === null || pct === undefined) return '#3A3355';
  if (pct === 0) return '#FF3D81';
  if (pct < 0.5) return '#FF7A45';
  if (pct < 0.9) return '#FFB627';
  return '#58D68D';
}

export default function HistoricoView() {
  const { habits, user } = useAppData();
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
      const dow = date.getDay();
      const scheduled = habits.filter(h => {
        const days = h.days_of_week || [0, 1, 2, 3, 4, 5, 6];
        if (!days.includes(dow)) return false;
        if (h.created_at && new Date(h.created_at) > date) return false;
        return true;
      });
      const doneHabits = (logs || []).filter(l => l.date_key === key).length;
      const dayTasks = (monthTasks || []).filter(t => t.date_key === key);
      const total = scheduled.length + dayTasks.length;
      const done = doneHabits + dayTasks.filter(t => t.done).length;
      result[key] = { total, done, pct: total ? done / total : null };
    }
    setDayData(result);
  }, [calendarDate, habits, user]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  async function selectDay(key) {
    setSelectedKey(key);
    setDayDetail(null);
    const [{ data: dayTasks }, { data: dayLogs }] = await Promise.all([
      sb.from('tasks').select('*').eq('user_id', user.id).eq('date_key', key),
      sb.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('date_key', key),
    ]);
    const loggedIds = (dayLogs || []).map(l => l.habit_id);
    const dow = new Date(key + 'T12:00:00').getDay();
    const scheduledHabits = habits.filter(h => (h.days_of_week || [0, 1, 2, 3, 4, 5, 6]).includes(dow));
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
    const bg = isFuture ? '#3A3355' : pctColor(info ? info.pct : null);
    const classes = ['cal-day'];
    if (isFuture) classes.push('future');
    if (key === todayK) classes.push('today');
    if (key === selectedKey) classes.push('selected');
    cells.push(
      <div key={key} className={classes.join(' ')} style={{ background: bg }} onClick={() => !isFuture && selectDay(key)}>{d}</div>
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
        <span className="leg-dot" style={{ background: '#3A3355' }} /> sem dados
        <span className="leg-dot" style={{ background: '#FF3D81' }} /> baixo
        <span className="leg-dot" style={{ background: '#FFB627' }} /> médio
        <span className="leg-dot" style={{ background: '#58D68D' }} /> alto
      </div>

      {dayDetail && (
        <div>
          <div className="section-title" style={{ marginTop: 20 }}>
            {new Date(selectedKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {(!dayDetail.habits.length && !dayDetail.tasks.length) ? (
            <div className="empty">Nada registrado nesse dia.</div>
          ) : (
            <>
              {dayDetail.habits.map(h => {
                const done = dayDetail.loggedIds.includes(h.id);
                return (
                  <div className={`row ${done ? 'done' : ''}`} key={h.id}>
                    <div className={`check ${done ? 'checked' : ''}`} style={{ cursor: 'default' }}><CheckIcon /></div>
                    <div className="row-body"><div className="title">{h.name}</div><div className="meta">Hábito</div></div>
                  </div>
                );
              })}
              {dayDetail.tasks.map(t => (
                <div className={`row ${t.done ? 'done' : ''}`} key={t.id}>
                  <div className={`check ${t.done ? 'checked' : ''}`} style={{ cursor: 'default' }}><CheckIcon /></div>
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
