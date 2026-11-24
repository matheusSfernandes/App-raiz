import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { isOnline } from '../lib/offline';
import { todayKey, previousScheduledDate } from '../lib/helpers';
import { materializeRecurring } from '../lib/recurring';
import { currentStreak, isFlexible, isNumeric, weekStartKey } from '../lib/habits';

const AppDataContext = createContext(null);

// Recalcula sequência e último dia feito a partir do registro de hábitos
// (dias protegidos por congelamento contam como feitos)
async function recomputeHabitRow(habit, freezeLog) {
  // Sem internet o registro guardado pode estar incompleto: recalcula depois de sincronizar
  if (!isOnline()) return habit;
  const { data: logs } = await sb.from('habit_logs').select('date_key').eq('habit_id', habit.id).order('date_key', { ascending: false }).limit(1000);
  const ok = new Set((logs || []).map(l => l.date_key));
  (freezeLog || []).forEach(entry => {
    const [date, hid] = String(entry).split('|');
    if (hid === habit.id) ok.add(date);
  });
  const today = todayKey();
  const streak = currentStreak(habit, ok);
  const lastDone = [...ok].filter(k => k <= today).sort().pop() || null;
  if (streak !== habit.streak || lastDone !== habit.last_done) {
    await sb.from('habits').update({ streak, last_done: lastDone }).eq('id', habit.id);
  }
  // aproveita a mesma leitura para a contagem da semana (sem nova consulta)
  const weekStart = weekStartKey(today);
  const week_count = (logs || []).filter(l => l.date_key >= weekStart && l.date_key <= today).length;
  return { ...habit, streak, last_done: lastDone, week_count };
}

export function useAppData() {
  return useContext(AppDataContext);
}

export function AppDataProvider({ user, children }) {
  const [profile, setProfile] = useState({});
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fixedBills, setFixedBills] = useState([]);
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
      if (isFlexible(h)) continue;
      if (!h.last_done) continue;
      const prevScheduled = previousScheduledDate(h, new Date());
      if (!prevScheduled) continue;
      if (h.last_done >= prevScheduled) continue;

      if (usedThisMonth < 2) {
        usedThisMonth++;
        freezeLog.push(`${prevScheduled}|${h.id}`);
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

  // B6: cada gravação recarrega só a parte que mudou. As consultas abaixo são as mesmas
  // de antes (mesmo endereço), então o modo sem internet continua lendo da cópia guardada.
  const dayRef = useRef(null);       // dia carregado: se virou o dia, recarrega tudo
  const profileRef = useRef({});
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const queryTasks = useCallback(async () => {
    const { data: tasksData } = await sb.from('tasks').select('*').eq('user_id', user.id).eq('date_key', todayKey()).order('start_time');
    const taskList = tasksData || [];
    const subs = {};
    if (taskList.length) {
      const { data: subData } = await sb.from('subtasks').select('*').eq('user_id', user.id).in('task_id', taskList.map(t => t.id)).order('created_at');
      (subData || []).forEach(s => {
        subs[s.task_id] = subs[s.task_id] || [];
        subs[s.task_id].push(s);
      });
    }
    return { taskList, subs };
  }, [user]);

  // Junta sequência semanal (flexíveis), contagem da semana e progresso do dia
  const decorateHabits = useCallback(async (list, prof) => {
    let out = await Promise.all(list.map(h => (isFlexible(h) ? recomputeHabitRow(h, prof.freeze_log) : h)));
    const today = todayKey();
    const [{ data: weekLogs }, { data: progressRows }] = await Promise.all([
      sb.from('habit_logs').select('habit_id').eq('user_id', user.id).gte('date_key', weekStartKey(today)).lte('date_key', today),
      sb.from('habit_progress').select('habit_id,value').eq('user_id', user.id).eq('date_key', today),
    ]);
    const weekCount = {};
    (weekLogs || []).forEach(l => { weekCount[l.habit_id] = (weekCount[l.habit_id] || 0) + 1; });
    const progress = {};
    (progressRows || []).forEach(p => { progress[p.habit_id] = Number(p.value); });
    return out.map(h => ({ ...h, week_count: weekCount[h.id] || 0, progress_today: progress[h.id] || 0 }));
  }, [user]);

  const refreshAll = useCallback(async () => {
    dayRef.current = todayKey();
    await materializeRecurring(user.id, todayKey());
    const [{ data: profileRows }, { data: habitsData }, { data: txData }, { data: billsData }, { taskList, subs }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('habits').select('*').eq('user_id', user.id).order('created_at'),
      sb.from('transactions').select('*').eq('user_id', user.id).order('date_key', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('fixed_bills').select('*').eq('user_id', user.id).order('day_of_month'),
      queryTasks(),
    ]);

    let prof = profileRows;
    if (!prof && isOnline()) {
      await sb.from('profiles').insert({ id: user.id, name: '', goal: '', quote: '' });
      prof = { name: '', goal: '', quote: '' };
    }
    if (!prof) prof = { name: '', goal: '', quote: '' };

    const checked = isOnline() ? await checkStreakBreaks(habitsData || [], prof) : (habitsData || []);
    const fixedHabits = await decorateHabits(checked, prof);

    profileRef.current = prof;
    setProfile(prof);
    setHabits(fixedHabits);
    setTasks(taskList);
    setTransactions(txData || []);
    setFixedBills(billsData || []);
    setSubtasksByTask(subs);
    setLoading(false);
  }, [user, checkStreakBreaks, queryTasks, decorateHabits]);

  // Recarregadores de uma parte só
  const refreshTasks = useCallback(async () => {
    const { taskList, subs } = await queryTasks();
    setTasks(taskList);
    setSubtasksByTask(subs);
  }, [queryTasks]);
  const refreshHabits = useCallback(async () => {
    const { data: habitsData } = await sb.from('habits').select('*').eq('user_id', user.id).order('created_at');
    setHabits(await decorateHabits(habitsData || [], profileRef.current));
  }, [user, decorateHabits]);
  const refreshTx = useCallback(async () => {
    const { data } = await sb.from('transactions').select('*').eq('user_id', user.id).order('date_key', { ascending: false }).order('created_at', { ascending: false });
    setTransactions(data || []);
  }, [user]);
  const refreshBills = useCallback(async () => {
    const { data } = await sb.from('fixed_bills').select('*').eq('user_id', user.id).order('day_of_month');
    setFixedBills(data || []);
  }, [user]);

  // Depois de gravar: se o dia virou com o app aberto, recarrega tudo (cria as recorrentes
  // do novo dia e confere as sequências); senão roda só a atualização da parte mexida.
  const after = async (partial) => {
    if (dayRef.current !== todayKey()) return refreshAll();
    if (partial) await partial();
  };

  useEffect(() => { refreshAll(); }, [refreshAll]);
  // Depois de enviar as alterações feitas sem internet, recarrega do servidor
  useEffect(() => {
    const onSynced = async () => {
      // com os registros completos de novo, recalcula as sequências dos hábitos
      const { data: hs } = await sb.from('habits').select('*').eq('user_id', user.id);
      const { data: pr } = await sb.from('profiles').select('freeze_log').eq('id', user.id).maybeSingle();
      for (const h of hs || []) await recomputeHabitRow(h, pr?.freeze_log || []);
      refreshAll();
    };
    window.addEventListener('raiz-synced', onSynced);
    return () => window.removeEventListener('raiz-synced', onSynced);
  }, [refreshAll, user.id]);

  // ---- Habits ----
  const saveHabit = async (editId, fields) => {
    if (editId) {
      await sb.from('habits').update(fields).eq('id', editId);
    } else {
      await sb.from('habits').insert({ user_id: user.id, streak: 0, last_done: null, ...fields });
    }
    await after(refreshHabits);
  };
  const recomputeHabit = (habit) => recomputeHabitRow(habit, profile.freeze_log);
  const setHabitDone = async (id, dateKey, done) => {
    const h = habits.find(x => x.id === id);
    if (!h) return false;
    if (done) {
      await sb.from('habit_logs').upsert({ user_id: user.id, habit_id: id, date_key: dateKey }, { onConflict: 'habit_id,date_key' });
    } else {
      await sb.from('habit_logs').delete().eq('habit_id', id).eq('date_key', dateKey);
    }
    if (isOnline()) {
      // a releitura do registro deste hábito já traz sequência, último dia e semana
      const row = await recomputeHabit(h);
      setHabits(list => list.map(x => (x.id === id ? { ...x, ...row, progress_today: x.progress_today } : x)));
      await after();
    } else {
      await after(refreshHabits); // sem internet: mesmo caminho de antes, pela cópia guardada
    }
    return done;
  };
  // Soma (ou tira) quantidade no progresso do dia; conclui ao bater a meta
  const addHabitProgress = async (id, amount, dateKey = todayKey()) => {
    const h = habits.find(x => x.id === id);
    if (!h || !isNumeric(h)) return false;
    const { data: row } = await sb.from('habit_progress').select('value').eq('habit_id', id).eq('date_key', dateKey).maybeSingle();
    const before = Number(row?.value || 0);
    const value = Math.min(1000000, Math.max(0, before + Number(amount)));
    await sb.from('habit_progress').upsert({ user_id: user.id, habit_id: id, date_key: dateKey, value, updated_at: new Date().toISOString() }, { onConflict: 'habit_id,date_key' });
    if (dateKey === todayKey()) setHabits(list => list.map(x => (x.id === id ? { ...x, progress_today: value } : x)));
    const target = Number(h.target);
    const wasDone = before >= target, isDone = value >= target;
    if (wasDone !== isDone) { await setHabitDone(id, dateKey, isDone); return isDone && !wasDone; }
    await after();
    return false;
  };
  const toggleHabit = async (id) => {
    const h = habits.find(x => x.id === id);
    return setHabitDone(id, todayKey(), h.last_done !== todayKey());
  };
  const deleteHabit = async (id) => {
    await sb.from('habits').delete().eq('id', id);
    setHabits(list => list.filter(x => x.id !== id));
    await after();
  };

  // ---- Tasks ----
  const saveTask = async (editId, fields) => {
    if (editId) {
      await sb.from('tasks').update(fields).eq('id', editId);
    } else {
      await sb.from('tasks').insert({ user_id: user.id, done: false, date_key: todayKey(), ...fields });
    }
    await after(refreshTasks);
  };
  const toggleTask = async (task) => {
    const willBeDone = !task.done;
    await sb.from('tasks').update({ done: willBeDone }).eq('id', task.id);
    setTasks(list => list.map(t => (t.id === task.id ? { ...t, done: willBeDone } : t)));
    await after();
    return willBeDone;
  };
  const deleteTask = async (id) => {
    await sb.from('tasks').delete().eq('id', id);
    setTasks(list => list.filter(t => t.id !== id));
    setSubtasksByTask(m => { const n = { ...m }; delete n[id]; return n; });
    await after();
  };
  const rescheduleTask = async (id, newDateKey) => {
    await sb.from('tasks').update({ date_key: newDateKey }).eq('id', id);
    if (newDateKey === todayKey()) await after(refreshTasks); // entrou na lista de hoje
    else { setTasks(list => list.filter(t => t.id !== id)); await after(); }
  };

  // ---- Subtasks ----
  const patchSub = (id, fn) => setSubtasksByTask(m => {
    const n = {};
    for (const [k, arr] of Object.entries(m)) n[k] = fn(arr);
    return n;
  });
  const addSubtask = async (taskId, title) => {
    await sb.from('subtasks').insert({ user_id: user.id, task_id: taskId, title, done: false });
    await after(refreshTasks);
  };
  const toggleSubtask = async (id) => {
    let found = null;
    for (const arr of Object.values(subtasksByTask)) {
      const s = arr.find(x => x.id === id);
      if (s) { found = s; break; }
    }
    if (!found) return;
    await sb.from('subtasks').update({ done: !found.done }).eq('id', id);
    patchSub(id, arr => arr.map(s => (s.id === id ? { ...s, done: !found.done } : s)));
    await after();
  };
  const deleteSubtask = async (id) => {
    await sb.from('subtasks').delete().eq('id', id);
    patchSub(id, arr => arr.filter(s => s.id !== id));
    await after();
  };

  // ---- Transactions ----
  const addTx = async (fields) => {
    await sb.from('transactions').insert({ user_id: user.id, date_key: todayKey(), ...fields });
    await after(refreshTx);
  };
  const updateTx = async (id, fields) => {
    await sb.from('transactions').update(fields).eq('id', id);
    if ('date_key' in fields) await after(refreshTx); // muda a ordem da lista
    else { setTransactions(list => list.map(t => (t.id === id ? { ...t, ...fields } : t))); await after(); }
  };
  const deleteTx = async (id) => {
    await sb.from('transactions').delete().eq('id', id);
    setTransactions(list => list.filter(t => t.id !== id));
    await after();
  };

  // ---- Contas fixas ----
  const saveFixedBill = async (editId, fields) => {
    if (editId) {
      await sb.from('fixed_bills').update(fields).eq('id', editId);
    } else {
      await sb.from('fixed_bills').insert({ user_id: user.id, start_month: todayKey().slice(0, 7), ...fields });
    }
    await after(refreshBills);
  };
  const deleteFixedBill = async (id) => {
    await sb.from('fixed_bills').delete().eq('id', id);
    setFixedBills(list => list.filter(b => b.id !== id));
    // no banco as movimentações dela perdem o vínculo (on delete set null)
    setTransactions(list => list.map(t => (t.fixed_id === id ? { ...t, fixed_id: null } : t)));
    await after();
  };
  // Marca como paga no mês: cria a movimentação ligada à conta
  const payFixedBill = async (bill, dateKey) => {
    const { data: already } = await sb.from('transactions').select('id').eq('fixed_id', bill.id)
      .gte('date_key', dateKey.slice(0, 7) + '-01').lte('date_key', dateKey.slice(0, 7) + '-31').limit(1);
    if (!already?.length) {
      await sb.from('transactions').insert({
        user_id: user.id, fixed_id: bill.id, description: bill.description, amount: bill.amount,
        type: bill.type, category: bill.category, date_key: dateKey,
      });
      await after(refreshTx);
    } else await after();
  };

  // ---- Profile ----
  const saveProfile = async (fields) => {
    await sb.from('profiles').update(fields).eq('id', user.id);
    setProfile(p => ({ ...p, ...fields }));
  };

  const value = {
    user, profile, habits, tasks, transactions, subtasksByTask, loading,
    toasts, showToast, refreshAll, refreshTasks,
    saveHabit, toggleHabit, setHabitDone, addHabitProgress, deleteHabit,
    saveTask, toggleTask, deleteTask, rescheduleTask,
    addSubtask, toggleSubtask, deleteSubtask,
    addTx, updateTx, deleteTx,
    fixedBills, saveFixedBill, deleteFixedBill, payFixedBill,
    saveProfile,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
