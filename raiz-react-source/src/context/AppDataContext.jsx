import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { todayKey, dateToKey, previousScheduledDate } from '../lib/helpers';

const AppDataContext = createContext(null);

export function useAppData() {
  return useContext(AppDataContext);
}

export function AppDataProvider({ user, children }) {
  const [profile, setProfile] = useState({});
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [subtasksByTask, setSubtasksByTask] = useState({});
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const showToast = useCallback((msg) => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  }, []);

  const checkStreakBreaks = useCallback(async (habitsList, currentProfile) => {
    let freezeLog = currentProfile.freeze_log || [];
    const monthKey = todayKey().slice(0, 7);
    let usedThisMonth = freezeLog.filter(d => d.slice(0, 7) === monthKey).length;
    let freezeLogChanged = false;
    const updated = [...habitsList];

    for (let i = 0; i < updated.length; i++) {
      const h = updated[i];
      if (!h.last_done) continue;
      const prevScheduled = previousScheduledDate(h, new Date());
      if (!prevScheduled) continue;
      if (h.last_done >= prevScheduled) continue;

      if (usedThisMonth < 2) {
        usedThisMonth++;
        freezeLog.push(todayKey());
        freezeLogChanged = true;
        await sb.from('habits').update({ last_done: prevScheduled }).eq('id', h.id);
        updated[i] = { ...h, last_done: prevScheduled };
        showToast(`🧊 Sequência de "${h.name}" protegida com congelamento!`);
      } else if (h.streak !== 0) {
        await sb.from('habits').update({ streak: 0 }).eq('id', h.id);
        updated[i] = { ...h, streak: 0 };
      }
    }
    if (freezeLogChanged) {
      await sb.from('profiles').update({ freeze_log: freezeLog }).eq('id', user.id);
      currentProfile.freeze_log = freezeLog;
    }
    return updated;
  }, [user, showToast]);

  const refreshAll = useCallback(async () => {
    const [{ data: profileRows }, { data: habitsData }, { data: tasksData }, { data: txData }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('habits').select('*').eq('user_id', user.id).order('created_at'),
      sb.from('tasks').select('*').eq('user_id', user.id).eq('date_key', todayKey()).order('start_time'),
      sb.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    let prof = profileRows;
    if (!prof) {
      await sb.from('profiles').insert({ id: user.id, name: '', goal: '', quote: '' });
      prof = { name: '', goal: '', quote: '' };
    }

    let subs = {};
    const taskList = tasksData || [];
    if (taskList.length) {
      const { data: subData } = await sb.from('subtasks').select('*').eq('user_id', user.id).in('task_id', taskList.map(t => t.id)).order('created_at');
      (subData || []).forEach(s => {
        subs[s.task_id] = subs[s.task_id] || [];
        subs[s.task_id].push(s);
      });
    }

    const fixedHabits = await checkStreakBreaks(habitsData || [], prof);

    setProfile(prof);
    setHabits(fixedHabits);
    setTasks(taskList);
    setTransactions(txData || []);
    setSubtasksByTask(subs);
    setLoading(false);
  }, [user, checkStreakBreaks]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ---- Habits ----
  const saveHabit = async (editId, fields) => {
    if (editId) {
      await sb.from('habits').update(fields).eq('id', editId);
    } else {
      await sb.from('habits').insert({ user_id: user.id, streak: 0, last_done: null, ...fields });
    }
    await refreshAll();
  };
  const toggleHabit = async (id) => {
    const h = habits.find(x => x.id === id);
    const today = todayKey();
    let confettiOk = false;
    if (h.last_done === today) {
      await sb.from('habits').update({ last_done: null, streak: Math.max(0, h.streak - 1) }).eq('id', id);
      await sb.from('habit_logs').delete().eq('habit_id', id).eq('date_key', today);
    } else {
      await sb.from('habits').update({ last_done: today, streak: h.streak + 1 }).eq('id', id);
      await sb.from('habit_logs').upsert({ user_id: user.id, habit_id: id, date_key: today }, { onConflict: 'habit_id,date_key' });
      confettiOk = true;
    }
    await refreshAll();
    return confettiOk;
  };
  const deleteHabit = async (id) => {
    await sb.from('habits').delete().eq('id', id);
    await refreshAll();
  };

  // ---- Tasks ----
  const saveTask = async (editId, fields) => {
    if (editId) {
      await sb.from('tasks').update(fields).eq('id', editId);
    } else {
      await sb.from('tasks').insert({ user_id: user.id, done: false, date_key: todayKey(), ...fields });
    }
    await refreshAll();
  };
  const toggleTask = async (id) => {
    const t = tasks.find(x => x.id === id);
    const willBeDone = !t.done;
    await sb.from('tasks').update({ done: willBeDone }).eq('id', id);
    await refreshAll();
    return willBeDone;
  };
  const deleteTask = async (id) => {
    await sb.from('tasks').delete().eq('id', id);
    await refreshAll();
  };

  // ---- Subtasks ----
  const addSubtask = async (taskId, title) => {
    await sb.from('subtasks').insert({ user_id: user.id, task_id: taskId, title, done: false });
    await refreshAll();
  };
  const toggleSubtask = async (id) => {
    let found = null;
    for (const arr of Object.values(subtasksByTask)) {
      const s = arr.find(x => x.id === id);
      if (s) { found = s; break; }
    }
    if (!found) return;
    await sb.from('subtasks').update({ done: !found.done }).eq('id', id);
    await refreshAll();
  };
  const deleteSubtask = async (id) => {
    await sb.from('subtasks').delete().eq('id', id);
    await refreshAll();
  };

  // ---- Transactions ----
  const addTx = async (fields) => {
    await sb.from('transactions').insert({ user_id: user.id, date_key: todayKey(), ...fields });
    await refreshAll();
  };
  const deleteTx = async (id) => {
    await sb.from('transactions').delete().eq('id', id);
    await refreshAll();
  };

  // ---- Profile ----
  const saveProfile = async (fields) => {
    await sb.from('profiles').update(fields).eq('id', user.id);
    setProfile(p => ({ ...p, ...fields }));
  };

  const value = {
    user, profile, habits, tasks, transactions, subtasksByTask, loading,
    toasts, showToast, refreshAll,
    saveHabit, toggleHabit, deleteHabit,
    saveTask, toggleTask, deleteTask,
    addSubtask, toggleSubtask, deleteSubtask,
    addTx, deleteTx,
    saveProfile,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
